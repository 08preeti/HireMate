import test from "node:test";
import assert from "node:assert/strict";
import { buildStats, changedFields, criticalChanges, meaningfulChanges, composeDescription, jobActions, notifyLabels } from "../src/constants/jobRules.js";
import { parseJobInput } from "../src/validators/jobValidators.js";
import { HttpError } from "../src/utils/httpError.js";

const valid = { jobTitle: "Mason", location: "Nashik Road", salary: 800, vacancies: 5 };
const fieldError = (body, opts) => {
  try {
    parseJobInput(body, opts);
  } catch (err) {
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 400);
    return err.extra.field;
  }
  return null;
};

test("stats: confirmed workers include active and completed, reserved is offers only", () => {
  const s = buildStats({ pending: 3, accepted: 1, confirmed: 2, on_the_way: 1, arrived: 1, completed: 1, declined: 2, rejected: 1, withdrawn: 1, cancelled: 1 });
  assert.equal(s.total, 14);
  assert.equal(s.reserved, 1);
  assert.equal(s.confirmedWorkers, 5);
  assert.equal(s.ended, 5);
  assert.equal(s.pending, 3);
});

test("stats: rejected / declined / withdrawn / cancelled are never confirmed workers", () => {
  const s = buildStats({ declined: 4, rejected: 4, withdrawn: 4, cancelled: 4 });
  assert.equal(s.confirmedWorkers, 0);
  assert.equal(s.reserved, 0);
});

test("actions follow status and vacancies", () => {
  const stats = buildStats({ confirmed: 2 });
  const active = jobActions({ status: "active", vacancies: 5, filledPositions: 2 }, stats);
  assert.deepEqual(active, { canEdit: true, canClose: true, canReopen: false, canFill: true, canComplete: false, canDelete: false });
  const full = jobActions({ status: "closed", vacancies: 2, filledPositions: 2 }, stats);
  assert.equal(full.canReopen, false);
  const roomy = jobActions({ status: "closed", vacancies: 5, filledPositions: 2 }, stats);
  assert.equal(roomy.canReopen, true);
  const done = jobActions({ status: "completed", vacancies: 2, filledPositions: 2 }, buildStats({ completed: 2 }));
  assert.equal(done.canEdit, false);
  assert.equal(done.canReopen, false);
  assert.equal(done.canClose, false);
  const empty = jobActions({ status: "active", vacancies: 1, filledPositions: 0 }, buildStats({}));
  assert.equal(empty.canDelete, true);
  assert.equal(empty.canFill, false);
});

test("complete is allowed only when nobody is still working and someone finished", () => {
  assert.equal(jobActions({ status: "active", vacancies: 2, filledPositions: 2 }, buildStats({ completed: 2 })).canComplete, true);
  assert.equal(jobActions({ status: "active", vacancies: 2, filledPositions: 2 }, buildStats({ completed: 1, arrived: 1 })).canComplete, false);
  assert.equal(jobActions({ status: "active", vacancies: 2, filledPositions: 1 }, buildStats({ accepted: 1 })).canComplete, false);
  assert.equal(jobActions({ status: "active", vacancies: 2, filledPositions: 0 }, buildStats({ pending: 2 })).canComplete, false);
});

test("critical changes are detected; harmless ones are not", () => {
  const job = { jobTitle: { en: "Mason" }, location: { en: "Nashik" }, skills: { en: "Mason" }, salary: 800, companyName: "A", perkItems: [], startDate: new Date("2026-11-10T00:00:00Z") };
  const same = changedFields(job, { jobTitle: "Mason", salary: 800, perkItems: [], startDate: new Date("2026-11-10T00:00:00Z"), skills: "Mason" });
  assert.deepEqual(same, []);
  const changed = changedFields(job, { salary: 900, companyName: "B", startDate: new Date("2026-11-11T00:00:00Z") });
  assert.deepEqual(changed.sort(), ["companyName", "salary", "startDate"]);
  assert.deepEqual(criticalChanges(changed).sort(), ["salary", "startDate"]);
  assert.deepEqual(notifyLabels(changed).sort(), ["pay", "start date"]);
});

test("description keeps the existing sentence format", () => {
  const text = composeDescription({ skills: "Mason", vacancies: 3, summary: "Plaster work.", startDate: new Date("2026-11-10T00:00:00Z"), workSchedule: "Standard Day Shift (08:00 AM – 05:00 PM)", overtimeRate: 120, perkItems: ["Free Lunch / Chai"], gateNote: "Gate 3", workInstructions: "Bring tape" });
  assert.equal(text, "Mason — 3 workers needed. Plaster work. Work date: 10 Nov 2026. Shift: Standard Day Shift (08:00 AM – 05:00 PM). Overtime paid extra at ₹120/hour beyond shift hours. Provided: Free Lunch / Chai. Gate instructions: Gate 3 Note: Bring tape");
});

test("create requires title, location and a positive salary", () => {
  assert.equal(fieldError({ ...valid, jobTitle: " " }), "jobTitle");
  assert.equal(fieldError({ ...valid, location: "" }), "location");
  assert.equal(fieldError({ ...valid, salary: 0 }), "salary");
  assert.equal(fieldError({ ...valid, salary: "abc" }), "salary");
  assert.equal(fieldError({ ...valid, salary: -5 }), "salary");
  assert.equal(fieldError(valid), null);
});

test("vacancies, enums, postal code, coordinates and phone are validated", () => {
  assert.equal(fieldError({ ...valid, vacancies: 0 }), "vacancies");
  assert.equal(fieldError({ ...valid, vacancies: 2.5 }), "vacancies");
  assert.equal(fieldError({ ...valid, vacancies: 501 }), "vacancies");
  assert.equal(fieldError({ ...valid, salaryUnit: "year" }), "salaryUnit");
  assert.equal(fieldError({ ...valid, jobType: "weekend" }), "jobType");
  assert.equal(fieldError({ ...valid, postalCode: "4220" }), "postalCode");
  assert.equal(fieldError({ ...valid, latitude: 120, longitude: 10 }), "latitude");
  assert.equal(fieldError({ ...valid, latitude: 19.9 }), "latitude");
  assert.equal(fieldError({ ...valid, contactInfo: "12ab" }), "contactInfo");
  assert.equal(fieldError({ ...valid, startDate: "2001-01-01" }), "startDate");
  assert.equal(fieldError({ ...valid, startDate: "not-a-date" }), "startDate");
  assert.equal(fieldError({ ...valid, isUrgent: "yes" }), "isUrgent");
  const ok = parseJobInput({ ...valid, postalCode: "422101", latitude: "19.99", longitude: "73.78", contactInfo: "+91 98230 44192", salaryUnit: "day" });
  assert.equal(ok.postalCode, "422101");
  assert.equal(ok.latitude, 19.99);
  assert.equal(ok.contactInfo, "+919823044192");
});

test("omitted vacancies default to 1 on create; edits only validate supplied fields", () => {
  assert.equal(parseJobInput({ jobTitle: "A", location: "B", salary: 1 }).vacancies, 1);
  assert.deepEqual(parseJobInput({ salary: 900 }, { partial: true }), { salary: 900 });
  assert.equal(fieldError({ salary: -1 }, { partial: true }), "salary");
  assert.equal(fieldError({ jobTitle: "" }, { partial: true }), "jobTitle");
  assert.equal(Object.keys(parseJobInput({ employer: "someone-else", status: "completed", filledPositions: 0, salary: 5 }, { partial: true })).join(), "salary");
});

test("client supplied employer, status and counters are ignored", () => {
  const out = parseJobInput({ ...valid, employer: "x", status: "filled", filledPositions: 5 });
  assert.equal("employer" in out, false);
  assert.equal("status" in out, false);
  assert.equal("filledPositions" in out, false);
});

test("filling in a never-set detail is not a meaningful change", () => {
  const job = { jobTitle: { en: "Mason" }, salary: 800 };
  const changed = changedFields(job, { salaryUnit: "day", salary: 900, startDate: new Date("2026-11-10T00:00:00Z") });
  assert.deepEqual(meaningfulChanges(job, changed), ["salary"]);
});
