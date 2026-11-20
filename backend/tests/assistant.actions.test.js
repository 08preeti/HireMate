import test from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI ||= "mongodb://localhost/unused";
process.env.JWT_SECRET ||= "test-secret";

const { createToolRegistry } = await import("../src/services/assistant/toolRegistry.js");
const { runAgent } = await import("../src/services/assistant/agentOrchestrator.js");
const { createActionTokens } = await import("../src/services/assistant/actionTokens.js");
const { createAssistantHandlers } = await import("../src/controllers/assistantController.js");
const { HttpError } = await import("../src/utils/httpError.js");

const J1 = "64b000000000000000000001", J_FILLED = "64b000000000000000000002", J_OTHER = "64b000000000000000000003";
const A_MINE = "64c000000000000000000001", A_OFFER = "64c000000000000000000002", A_OTHERS = "64c000000000000000000003";
const E_APP = "64d000000000000000000001", E_DONE = "64d000000000000000000002";

let writes;
const reset = () => { writes = []; };
reset();
const rec = (name, ret) => async (...a) => { writes.push([name, ...a]); return ret; };

const deps = {
  getProfile: async () => ({ name: "Asha", phone: "9876543210" }),
  getPublicJob: async (jobId) => {
    if (jobId === J_FILLED) return { _id: jobId, status: "filled", jobTitle: { en: "Cook" }, availablePositions: 0 };
    if (jobId === J_OTHER) throw new HttpError(404, "Job not found");
    return { _id: jobId, status: "active", jobTitle: { en: "Electrician" }, location: { en: "Nashik" }, salary: 800, salaryUnit: "day", availablePositions: 2 };
  },
  // Only this worker's applications are ever returned (the real service filters by worker id / phone).
  listMyApplications: async () => [
    { _id: A_MINE, status: "pending", job: { _id: "64b0000000000000000000aa", jobTitle: { en: "Painter" } } },
    { _id: A_OFFER, status: "accepted", job: { _id: "64b0000000000000000000bb", jobTitle: { en: "Mason" } } },
  ],
  // Only this employer's applications / jobs are returned.
  listEmployerApplications: async () => [
    { _id: E_APP, status: "pending", job: { _id: J1, jobTitle: { en: "Electrician" } }, worker: { name: "Ravi" } },
    { _id: E_DONE, status: "accepted", job: { _id: J1, jobTitle: { en: "Electrician" } }, worker: { name: "Sita" } },
  ],
  listEmployerJobs: async () => ({ jobs: [{ _id: J1, status: "active", jobTitle: { en: "Electrician" }, applicationCount: 3 }] }),
  listActiveJobs: async () => [], getDashboard: async () => ({}),
  applyToJob: rec("applyToJob", {}), withdrawApplication: rec("withdraw", {}), respondToOffer: rec("respondToOffer", {}),
  decideApplication: rec("decide", {}), markReviewed: rec("markReviewed", {}), closeEmployerJob: rec("close", {}), reopenEmployerJob: rec("reopen", {}),
};
const registry = createToolRegistry(deps);
const worker = { auth: { id: "w1", role: "worker", phone: "9876543210" }, user: {}, displayName: "Asha" };
const employer = { auth: { id: "e1", role: "employer" }, user: {}, displayName: "Acme" };

test("write tools only PREPARE: no service is called until commit", async () => {
  reset();
  const r = await registry.execute(worker, "apply_to_job", { jobId: J1, message: "I can start Monday" });
  assert.equal(r.ok, true);
  assert.equal(r.data.status, "awaiting_user_confirmation");
  assert.match(r.data.note, /NOT DONE YET/);
  assert.equal(r.pending.tool, "apply_to_job");
  assert.equal(r.pending.card.confirmLabel, "Submit application");
  assert.deepEqual(writes, []);
  for (const [who, tool, args] of [
    [worker, "withdraw_application", { applicationId: A_MINE }], [worker, "respond_to_offer", { applicationId: A_OFFER, response: "confirmed" }],
    [employer, "decide_application", { applicationId: E_APP, decision: "accepted" }], [employer, "shortlist_application", { applicationId: E_APP }],
    [employer, "close_job", { jobId: J1 }],
  ]) assert.equal((await registry.execute(who, tool, args)).ok, true, tool);
  assert.deepEqual(writes, [], "preparing must never write");
});

test("commit performs the real service call with the verified identity and reports a deterministic message", async () => {
  reset();
  const r = await registry.commit(worker, "apply_to_job", { jobId: J1, message: "hi" });
  assert.deepEqual(r, { ok: true, message: "Your application for Electrician has been submitted." });
  assert.deepEqual(writes, [["applyToJob", "w1", J1, { message: "hi" }]]);
  reset();
  assert.equal((await registry.commit(employer, "decide_application", { applicationId: E_APP, decision: "declined" })).message, "Ravi's application has been declined.");
  assert.deepEqual(writes, [["decide", "e1", E_APP, "declined"]]);
  reset();
  await registry.commit(worker, "withdraw_application", { applicationId: A_MINE });
  assert.equal(writes[0][1].id, "w1");
});

test("preflight rejects impossible actions with clear reasons", async () => {
  const err = async (who, tool, args) => (await registry.execute(who, tool, args)).error;
  assert.match(await err(worker, "apply_to_job", { jobId: J_FILLED }), /filled/);
  assert.match(await err(worker, "apply_to_job", { jobId: J_OTHER }), /not found/i);
  assert.match(await err(worker, "apply_to_job", { jobId: "64b0000000000000000000aa" }), /already applied/i);
  assert.match(await err(worker, "respond_to_offer", { applicationId: A_MINE, response: "confirmed" }), /no open offer/);
  assert.match(await err(employer, "decide_application", { applicationId: E_DONE, decision: "declined" }), /already accepted/);
  assert.match(await err(worker, "respond_to_offer", { applicationId: A_OFFER, response: "maybe" }), /one of/);
});

test("ownership: someone else's application or job id is 'not found', never actionable", async () => {
  assert.match((await registry.execute(worker, "withdraw_application", { applicationId: A_OTHERS })).error, /not found/i);
  assert.match((await registry.execute(employer, "decide_application", { applicationId: A_OTHERS, decision: "accepted" })).error, /not found/i);
  assert.match((await registry.execute(employer, "close_job", { jobId: J_OTHER })).error, /not found/i);
  reset();
  assert.equal((await registry.commit(employer, "close_job", { jobId: J_OTHER })).ok, false);
  assert.deepEqual(writes, []);
});

test("roles: write tools are invisible and uncommittable across roles", async () => {
  assert.equal((await registry.execute(worker, "decide_application", { applicationId: E_APP, decision: "accepted" })).ok, false);
  assert.equal((await registry.execute(employer, "apply_to_job", { jobId: J1 })).ok, false);
  reset();
  assert.equal((await registry.commit(worker, "decide_application", { applicationId: E_APP, decision: "accepted" })).ok, false);
  assert.equal((await registry.commit(employer, "apply_to_job", { jobId: J1 })).ok, false);
  assert.equal((await registry.commit(worker, "search_jobs", {})).ok, false, "read tools can't be committed");
  assert.deepEqual(writes, []);
  assert.ok(!registry.forRole("worker").some((t) => t.name === "close_job"));
});

test("commit re-checks current state (e.g. applied elsewhere in the meantime)", async () => {
  reset();
  const stale = createToolRegistry({ ...deps, listMyApplications: async () => [{ _id: "x", status: "pending", job: { _id: J1, jobTitle: { en: "Electrician" } } }] });
  const r = await stale.commit(worker, "apply_to_job", { jobId: J1 });
  assert.equal(r.ok, false);
  assert.deepEqual(writes, []);
});

test("service failures surface truthfully; unexpected errors are masked", async () => {
  const dup = createToolRegistry({ ...deps, applyToJob: async () => { throw new HttpError(400, "Already applied"); } });
  assert.deepEqual(await dup.commit(worker, "apply_to_job", { jobId: J1 }), { ok: false, error: "Already applied" });
  const boom = createToolRegistry({ ...deps, applyToJob: async () => { throw new Error("E11000 mongodb://secret"); } });
  const r = await boom.commit(worker, "apply_to_job", { jobId: J1 });
  assert.equal(r.ok, false); assert.doesNotMatch(r.error, /mongo|E11000/);
});

// ── tokens ──
test("tokens: signed, expiring, single-use, tamper-proof", () => {
  let t = 1_000_000;
  const tokens = createActionTokens("s3cret", { now: () => t });
  const { token, expiresAt } = tokens.sign({ sub: "w1", role: "worker", tool: "apply_to_job", args: { jobId: J1 }, card: {} });
  assert.equal(expiresAt, 1_000_000 + 300_000);
  const p = tokens.verify(token);
  assert.equal(p.sub, "w1");
  assert.equal(tokens.consume(p), true);
  assert.equal(tokens.consume(p), false, "replay rejected");
  const [h, body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...p, args: { jobId: J_OTHER } })).toString("base64url");
  assert.throws(() => tokens.verify(`${h}.${forged}.${sig}`));
  assert.throws(() => createActionTokens("other-secret", { now: () => t }).verify(token));
  t += 301_000;
  assert.throws(() => tokens.verify(token), /expired/);
});

// ── orchestrator ──
const useTool = (name, input, id) => ({ text: "", toolCalls: [{ id, name, input }], content: [{ type: "tool_use", id, name, input }], usage: { input: 1, output: 1 } });
const say = (t) => ({ text: t, toolCalls: [], content: [{ type: "text", text: t }], usage: { input: 1, output: 1 } });
const scripted = (...r) => { const seen = []; return { seen, chat: async (q) => (seen.push(JSON.parse(JSON.stringify(q))), r.shift()) }; };
const context = { language: "en", route: "/jobs", timeZone: "Asia/Kolkata", shown: [] };

test("agent: collects pending actions, dedupes repeats, caps per turn, and tells the model it is not done", async () => {
  reset();
  const provider = scripted(
    { text: "", toolCalls: [1, 2, 3, 4, 5].map((n) => ({ id: `t${n}`, name: n === 2 ? "apply_to_job" : "apply_to_job", input: { jobId: n === 2 ? J1 : `64b00000000000000000010${n}` } })), content: [], usage: { input: 1, output: 1 } },
    say("I've prepared it. Please confirm."),
  );
  // jobs 101,103,104,105 resolve (active); J1 duplicate of none → 5 distinct calls: first 3 accepted, rest rejected.
  const out = await runAgent({ provider, registry, ctx: worker, history: [], message: "apply to these", context });
  assert.equal(out.pendingActions.length, 3);
  const results = provider.seen[1].messages.at(-1).content;
  assert.equal(results.filter((r) => r.is_error).length, 2);
  assert.match(results[0].content, /NOT DONE YET/);
  assert.deepEqual(writes, []);
  const dup = scripted(useTool("apply_to_job", { jobId: J1 }, "a"), { ...useTool("apply_to_job", { jobId: J1 }, "b") }, say("ok"));
  const out2 = await runAgent({ provider: dup, registry, ctx: worker, history: [], message: "apply", context });
  assert.equal(out2.pendingActions.length, 1);
  assert.match(dup.seen[1].messages.at(-1).content[0].content, /NOT DONE YET/);
});

test("agent: saying 'yes' in chat cannot execute anything", async () => {
  reset();
  const provider = scripted(say("Please press Confirm on the card."));
  const out = await runAgent({ provider, registry, ctx: worker, history: [{ role: "user", text: "apply to the electrician job" }, { role: "assistant", text: "Prepared." }], message: "yes, submit it", context });
  assert.equal(out.pendingActions.length, 0);
  assert.deepEqual(writes, []);
  assert.ok(!provider.seen[0].tools.some((t) => t.name === "confirm"), "the model has no confirm tool");
});

// ── HTTP handlers ──
const fakeRes = () => { const r = { code: 200, body: undefined }; r.status = (c) => ((r.code = c), r); r.json = (b) => ((r.body = b), r); return r; };
const mk = (now = () => 5_000_000) => {
  const tokens = createActionTokens("s3cret", { now });
  const provider = scripted(useTool("apply_to_job", { jobId: J1 }, "t1"), say("Prepared — please confirm."));
  const h = createAssistantHandlers({ getRegistry: async () => registry, getProvider: async () => provider, tokens, configured: () => true });
  return { h, tokens };
};
const reqOf = (ctx, body) => ({ auth: ctx.auth, user: { name: "Asha" }, body });

test("handlers: message returns a signed card; confirm executes once; replay is refused", async () => {
  reset();
  const { h } = mk();
  const res = fakeRes();
  await h.message(reqOf(worker, { message: "apply to the electrician job", context: {} }), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.pending.length, 1);
  assert.deepEqual(writes, [], "nothing written when the card is shown");
  const { token } = res.body.pending[0];

  const ok = fakeRes();
  await h.confirm(reqOf(worker, { token }), ok);
  assert.deepEqual(ok.body, { ok: true, message: "Your application for Electrician has been submitted." });
  assert.equal(writes.length, 1);

  const again = fakeRes();
  await h.confirm(reqOf(worker, { token }), again);
  assert.equal(again.code, 409);
  assert.equal(writes.length, 1, "double-click / replay does not apply twice");
});

test("handlers: another account, tampered, malformed and expired tokens are refused; cancel kills a card", async () => {
  reset();
  let t = 5_000_000;
  const { h, tokens } = mk(() => t);
  const { token } = tokens.sign({ sub: "w1", role: "worker", tool: "apply_to_job", args: { jobId: J1 }, card: {} });

  let r = fakeRes(); await h.confirm(reqOf({ auth: { id: "w2", role: "worker" } }, { token }), r); assert.equal(r.code, 403);
  r = fakeRes(); await h.confirm(reqOf(employer, { token }), r); assert.equal(r.code, 403);
  r = fakeRes(); await h.confirm(reqOf(worker, { token: token.slice(0, -3) + "abc" }), r); assert.equal(r.code, 410);
  r = fakeRes(); await h.confirm(reqOf(worker, { token: { $ne: 1 } }), r); assert.equal(r.code, 400);
  r = fakeRes(); await h.confirm(reqOf(worker, {}), r); assert.equal(r.code, 400);
  assert.deepEqual(writes, []);

  const c = tokens.sign({ sub: "w1", role: "worker", tool: "apply_to_job", args: { jobId: J1 }, card: {} });
  r = fakeRes(); await h.cancel(reqOf(worker, { token: c.token }), r); assert.equal(r.body.ok, true);
  r = fakeRes(); await h.confirm(reqOf(worker, { token: c.token }), r); assert.equal(r.code, 409);

  const e = tokens.sign({ sub: "w1", role: "worker", tool: "apply_to_job", args: { jobId: J1 }, card: {} });
  t += 301_000;
  r = fakeRes(); await h.confirm(reqOf(worker, { token: e.token }), r); assert.equal(r.code, 410); assert.match(r.body.message, /expired/);
  assert.deepEqual(writes, []);
});

test("handlers: a token whose action is no longer valid fails honestly (no fake success)", async () => {
  reset();
  const { tokens } = mk();
  const failing = createToolRegistry({ ...deps, applyToJob: async () => { throw new HttpError(409, "All vacancies for this job are filled"); } });
  const h = createAssistantHandlers({ getRegistry: async () => failing, getProvider: async () => null, tokens, configured: () => true });
  const { token } = tokens.sign({ sub: "w1", role: "worker", tool: "apply_to_job", args: { jobId: J1 }, card: {} });
  const r = fakeRes(); await h.confirm(reqOf(worker, { token }), r);
  assert.equal(r.code, 409);
  assert.deepEqual(r.body, { ok: false, message: "All vacancies for this job are filled" });
});

test("handlers: a forged token naming a read tool or unknown tool cannot be used to run anything", async () => {
  reset();
  const { h, tokens } = mk();
  for (const tool of ["search_jobs", "delete_everything"]) {
    const { token } = tokens.sign({ sub: "w1", role: "worker", tool, args: {}, card: {} });
    const r = fakeRes(); await h.confirm(reqOf(worker, { token }), r);
    assert.equal(r.code, 409);
  }
  assert.deepEqual(writes, []);
});
