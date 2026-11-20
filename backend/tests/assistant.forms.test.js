import test from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI ||= "mongodb://localhost/unused";
process.env.JWT_SECRET ||= "test-secret";

const { createToolRegistry } = await import("../src/services/assistant/toolRegistry.js");
const { validateArgs } = await import("../src/services/assistant/schema.js");
const { createActionTokens } = await import("../src/services/assistant/actionTokens.js");
const { createAssistantHandlers } = await import("../src/controllers/assistantController.js");
const { buildSystemPrompt } = await import("../src/services/assistant/agentOrchestrator.js");

// ── fakes ──
let writes;
const reset = () => { writes = []; };
reset();
const NOW = Date.now();
let jobs;
const profile = { name: "Asha", phone: "9876543210", skills: "Painter", location: "Nashik", about: "", experienceYears: 2, serviceAreas: ["Nashik Road"], availability: { isAvailable: true, days: ["mon", "tue"], from: "09:00", to: "17:00" } };
const deps = {
  getProfile: async () => structuredClone(profile),
  updateProfile: async (id, body) => { writes.push(["updateProfile", id, body]); return {}; },
  createJob: async (id, fields) => { writes.push(["createJob", id, fields]); jobs.unshift({ _id: "64b0000000000000000000ff", status: "active", jobTitle: { en: fields.jobTitle }, location: { en: fields.location }, createdAt: new Date() }); return {}; },
  listEmployerJobs: async () => ({ jobs }),
};
const registry = createToolRegistry(deps);
const worker = { auth: { id: "w1", role: "worker", phone: "9876543210" }, user: {}, displayName: "Asha" };
const employer = { auth: { id: "e1", role: "employer" }, user: { companyName: "Acme Builders" }, displayName: "Acme Builders" };
const beforeEach = () => { reset(); jobs = []; };
beforeEach();

const JOB = { jobTitle: "Electrician", location: "Plot 4, MIDC, Satpur, Nashik", salary: 800, salaryUnit: "day", contactInfo: "98765 43210" };
const detail = (r, label) => r.pending.card.details.find((d) => d.label === label)?.value;

// ── argument validator: new types ──
test("validateArgs: arrays, booleans, numbers and patterns are enforced; operators and unknown keys rejected", () => {
  const schema = { properties: {
    days: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", enum: ["mon", "tue", "wed"] } },
    flag: { type: "boolean" }, amount: { type: "number", minimum: 1, maximum: 100 },
    at: { type: "string", pattern: "^\\d{2}:\\d{2}$" }, n: { type: "integer", minimum: 0, maximum: 5 },
  } };
  assert.deepEqual(validateArgs(schema, { days: ["mon", "mon", "tue"], flag: false, amount: 12.5, at: "09:30" }), { days: ["mon", "tue"], flag: false, amount: 12.5, at: "09:30" });
  assert.throws(() => validateArgs(schema, { days: ["fri"] }), /must be one of/);
  assert.throws(() => validateArgs(schema, { days: [] }), /at least 1/);
  assert.throws(() => validateArgs(schema, { days: ["mon", "tue", "wed", "mon2"] }), /too many|must be one of/);
  assert.throws(() => validateArgs(schema, { days: "mon" }), /must be a list/);
  assert.throws(() => validateArgs(schema, { days: [{ $ne: 1 }] }), /must be text/);
  assert.throws(() => validateArgs(schema, { flag: "true" }), /true or false/);
  assert.throws(() => validateArgs(schema, { amount: "12" }), /must be a number/);
  assert.throws(() => validateArgs(schema, { amount: 0 }), /out of range/);
  assert.throws(() => validateArgs(schema, { amount: Infinity }), /must be a number/);
  assert.throws(() => validateArgs(schema, { at: "9:30" }), /expected format/);
  assert.throws(() => validateArgs(schema, { latitude: 19.9 }), /Unknown argument/);
});

// ── update_my_profile ──
test("update_my_profile: only prepares; the card shows each change as before → after", async () => {
  beforeEach();
  const r = await registry.execute(worker, "update_my_profile", { skills: "Painter, Plumber", experienceYears: 5, availableDays: ["sat", "mon"] });
  assert.equal(r.ok, true);
  assert.equal(r.data.status, "awaiting_user_confirmation");
  assert.deepEqual(writes, []);
  assert.equal(detail(r, "Skills"), "Painter → Painter, Plumber");
  assert.equal(detail(r, "Experience"), "2 years → 5 years");
  assert.equal(detail(r, "Working days"), "Mon, Tue → Mon, Sat");
  assert.equal(r.pending.card.confirmLabel, "Save changes");
  for (const leak of ["body", "labels", "fields"]) assert.equal(leak in r.pending.card, false, `${leak} must not reach the card`);
});

test("update_my_profile: unchanged fields are left out; nothing to change is refused", async () => {
  beforeEach();
  const r = await registry.execute(worker, "update_my_profile", { name: "Asha", location: "Pune" });
  assert.equal(r.pending.card.details.length, 1);
  assert.equal(detail(r, "Location"), "Nashik → Pune");
  const same = await registry.execute(worker, "update_my_profile", { name: "Asha", experienceYears: 2 });
  assert.equal(same.ok, false);
  assert.match(same.error, /nothing to change/);
  const none = await registry.execute(worker, "update_my_profile", {});
  assert.equal(none.ok, false);
  assert.match(none.error, /what you want to change/);
});

test("update_my_profile: the app's own profile rules apply (times, lengths, unknown fields)", async () => {
  beforeEach();
  const early = await registry.execute(worker, "update_my_profile", { availableTo: "08:00" }); // existing start is 09:00
  assert.equal(early.ok, false);
  assert.match(early.error, /End time must be after start time/);
  assert.equal((await registry.execute(worker, "update_my_profile", { availableFrom: "25:00" })).ok, false);
  assert.equal((await registry.execute(worker, "update_my_profile", { about: "x".repeat(501) })).ok, false);
  for (const field of ["phone", "gender", "otp", "_id", "role", "rating"]) {
    const r = await registry.execute(worker, "update_my_profile", { [field]: "9999999999" });
    assert.equal(r.ok, false, `${field} cannot be set through the assistant`);
    assert.match(r.error, /Unknown argument/);
  }
  assert.deepEqual(writes, []);
});

test("update_my_profile: commit saves only the changed fields for the signed-in worker", async () => {
  beforeEach();
  const args = { about: "Ten years of house painting", availableFrom: "08:00", serviceAreas: ["Satpur", "Nashik Road"] };
  const out = await registry.commit(worker, "update_my_profile", args);
  assert.equal(out.ok, true);
  assert.match(out.message, /About me, Preferred areas, Available from/);
  assert.deepEqual(writes, [["updateProfile", "w1", { about: "Ten years of house painting", serviceAreas: ["Satpur", "Nashik Road"], availability: { from: "08:00" } }]]);
});

test("update_my_profile: employers cannot see or run it", async () => {
  beforeEach();
  assert.ok(!registry.forRole("employer").some((t) => t.name === "update_my_profile"));
  assert.ok(registry.forRole("worker").some((t) => t.name === "update_my_profile"));
  const r = await registry.execute(employer, "update_my_profile", { name: "Zed" });
  assert.equal(r.ok, false);
  assert.deepEqual((await registry.commit(employer, "update_my_profile", { name: "Zed" })).ok, false);
  assert.deepEqual(writes, []);
});

// ── post_job ──
test("post_job: only prepares; the card shows the real values and says there is no map pin", async () => {
  beforeEach();
  const r = await registry.execute(employer, "post_job", { ...JOB, vacancies: 3, shift: "day", startDate: "2099-01-05", isUrgent: true });
  assert.equal(r.ok, true);
  assert.equal(r.data.status, "awaiting_user_confirmation");
  assert.deepEqual(writes, []);
  assert.equal(detail(r, "Company"), "Acme Builders", "company defaults to the employer's account");
  assert.equal(detail(r, "Pay"), "₹800 per day");
  assert.equal(detail(r, "Workers"), "3");
  assert.equal(detail(r, "Shift"), "Day");
  assert.equal(detail(r, "Start date"), "5 Jan 2099");
  assert.equal(detail(r, "Urgent"), "Yes");
  assert.match(detail(r, "Contact"), /^\+919876543210/);
  assert.match(detail(r, "Map pin"), /^Not set/);
  assert.equal(r.pending.card.confirmLabel, "Publish job");
  for (const leak of ["fields", "body", "labels"]) assert.equal(leak in r.pending.card, false);
});

test("post_job: required values must come from the user; nothing is guessed", async () => {
  beforeEach();
  for (const missing of ["jobTitle", "location", "salary", "salaryUnit", "contactInfo"]) {
    const { [missing]: _drop, ...rest } = JOB;
    const r = await registry.execute(employer, "post_job", rest);
    assert.equal(r.ok, false, `${missing} is required`);
    assert.match(r.error, new RegExp(missing));
  }
  const noCompany = await registry.execute({ ...employer, user: {} }, "post_job", JOB);
  assert.equal(noCompany.ok, false);
  assert.match(noCompany.error, /company or contractor name/);
  assert.equal((await registry.execute({ ...employer, user: {} }, "post_job", { ...JOB, companyName: "Self Co" })).ok, true);
  assert.deepEqual(writes, []);
});

test("post_job: the app's own job rules apply (pay, contact number, past dates, vacancies)", async () => {
  beforeEach();
  const bad = async (patch, re) => { const r = await registry.execute(employer, "post_job", { ...JOB, ...patch }); assert.equal(r.ok, false, JSON.stringify(patch)); assert.match(r.error, re); };
  await bad({ salary: 0 }, /out of range|greater than zero/);
  await bad({ salary: "800" }, /must be a number/);
  await bad({ salaryUnit: "year" }, /must be one of/);
  await bad({ contactInfo: "12345" }, /10-digit/);
  await bad({ contactInfo: "98765 43210 99" }, /10-digit|too long/);
  await bad({ startDate: "2020-01-01" }, /past/);
  await bad({ startDate: "tomorrow" }, /expected format/);
  await bad({ vacancies: 0 }, /out of range/);
  await bad({ jobType: "forever" }, /must be one of/);
  assert.deepEqual(writes, []);
});

test("post_job: contact numbers are normalised like the form does", async () => {
  beforeEach();
  for (const raw of ["9876543210", "+91 98765-43210", "919876543210", "09876543210"]) {
    const r = await registry.execute(employer, "post_job", { ...JOB, contactInfo: raw });
    assert.equal(r.ok, true, raw);
    assert.match(detail(r, "Contact"), /^\+919876543210/, raw);
  }
});

test("post_job: the model cannot supply coordinates, photos, status or an owner", async () => {
  beforeEach();
  for (const extra of [{ latitude: 19.99 }, { longitude: 73.78 }, { photos: ["x"] }, { status: "filled" }, { employer: "someone-else" }, { employerId: "e2" }, { contactInfo2: "1" }]) {
    const r = await registry.execute(employer, "post_job", { ...JOB, ...extra });
    assert.equal(r.ok, false, JSON.stringify(extra));
    assert.match(r.error, /Unknown argument/);
  }
});

test("post_job: commit publishes under the signed-in employer, with no invented map pin", async () => {
  beforeEach();
  const out = await registry.commit(employer, "post_job", { ...JOB, skills: "Wiring", vacancies: 2 });
  assert.equal(out.ok, true);
  assert.match(out.message, /Electrician is now published/);
  assert.equal(writes.length, 1);
  const [name, ownerId, fields] = writes[0];
  assert.equal(name, "createJob");
  assert.equal(ownerId, "e1");
  assert.equal(fields.jobTitle, "Electrician");
  assert.equal(fields.companyName, "Acme Builders");
  assert.equal(fields.contactInfo, "+919876543210");
  assert.equal(fields.salary, 800);
  assert.equal(fields.vacancies, 2);
  assert.equal(fields.latitude, undefined);
  assert.equal(fields.longitude, undefined);
});

test("post_job: workers cannot see or run it", async () => {
  beforeEach();
  assert.ok(!registry.forRole("worker").some((t) => t.name === "post_job"));
  assert.equal((await registry.execute(worker, "post_job", JOB)).ok, false);
  assert.equal((await registry.commit(worker, "post_job", JOB)).ok, false);
  assert.deepEqual(writes, []);
});

test("post_job: a job just published cannot be published twice; an older twin only gets a heads-up", async () => {
  beforeEach();
  jobs = [{ _id: "64b0000000000000000000aa", status: "active", jobTitle: { en: "electrician" }, location: { en: "plot 4, midc, satpur, nashik" }, createdAt: new Date(NOW - 60_000) }];
  const recent = await registry.execute(employer, "post_job", JOB);
  assert.equal(recent.ok, false);
  assert.match(recent.error, /just published/);
  assert.deepEqual((await registry.commit(employer, "post_job", JOB)).ok, false);

  jobs[0].createdAt = new Date(NOW - 3 * 3600_000);
  const older = await registry.execute(employer, "post_job", JOB);
  assert.equal(older.ok, true);
  assert.match(detail(older, "Heads-up"), /already have an active job/);

  jobs[0].status = "closed"; // a closed job is not a duplicate
  const closed = await registry.execute(employer, "post_job", JOB);
  assert.equal(detail(closed, "Heads-up"), undefined);
  assert.deepEqual(writes, []);
});

test("post_job: confirming two identical cards publishes once", async () => {
  beforeEach();
  assert.equal((await registry.commit(employer, "post_job", JOB)).ok, true);
  const second = await registry.commit(employer, "post_job", JOB);
  assert.equal(second.ok, false);
  assert.match(second.error, /just published/);
  assert.equal(writes.length, 1);
});

// ── end to end through the HTTP handlers ──
const fakeRes = () => { const r = { code: 200, body: undefined }; r.status = (c) => ((r.code = c), r); r.json = (b) => ((r.body = b), r); return r; };
const reqOf = (ctx, body) => ({ auth: ctx.auth, user: ctx.user, body });
const scriptedProvider = (tool, input) => {
  let turn = 0;
  return { async chat() { turn += 1; return turn === 1
    ? { text: "", toolCalls: [{ id: "t1", name: tool, input }], content: [{ type: "tool_use", id: "t1", name: tool, input }], usage: {} }
    : { text: "I've prepared that. Please confirm with the card.", toolCalls: [], content: [], usage: {} }; } };
};
const handlersFor = (tool, input) => createAssistantHandlers({ getRegistry: async () => registry, getProvider: async () => scriptedProvider(tool, input), tokens: createActionTokens("s3cret"), configured: () => true });

for (const [label, ctx, tool, input, writeName] of [
  ["profile update", worker, "update_my_profile", { location: "Pune" }, "updateProfile"],
  ["job post", employer, "post_job", JOB, "createJob"],
]) {
  test(`handlers: ${label} writes only after Confirm, once, and never for another account`, async () => {
    beforeEach();
    const h = handlersFor(tool, input);
    const res = fakeRes();
    await h.message(reqOf(ctx, { message: "please do it", context: {} }), res);
    assert.equal(res.code, 200);
    assert.equal(res.body.pending.length, 1);
    assert.deepEqual(writes, [], "nothing is saved when the card is shown");
    const { token } = res.body.pending[0];

    const stranger = fakeRes();
    await h.confirm(reqOf({ auth: { ...ctx.auth, id: "someone-else" }, user: {} }, { token }), stranger);
    assert.equal(stranger.code, 403);
    assert.deepEqual(writes, []);

    const ok = fakeRes();
    await h.confirm(reqOf(ctx, { token }), ok);
    assert.equal(ok.body.ok, true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], writeName);
    assert.equal(writes[0][1], ctx.auth.id);

    const replay = fakeRes();
    await h.confirm(reqOf(ctx, { token }), replay);
    assert.equal(replay.code, 409);
    assert.equal(writes.length, 1);
  });
}

// ── prompt ──
test("system prompt: describes the form rules and no longer claims it cannot edit profiles or post jobs", () => {
  const p = buildSystemPrompt({ displayName: "Acme", role: "employer", language: "en", route: "/post-job", timeZone: "Asia/Kolkata", shown: [], now: new Date("2026-11-20T04:00:00Z") });
  assert.doesNotMatch(p, /cannot yet edit profiles/);
  assert.match(p, /NEVER invent or guess pay, phone numbers/);
  assert.match(p, /no map pin and no photos/);
  assert.match(p, /publish a new job/);
});
