import test, { before, after } from "node:test";
import assert from "node:assert/strict";

const URI = process.env.MONGO_TEST_URI;
const skip = URI ? false : "set MONGO_TEST_URI to a disposable MongoDB database to run these tests";

let svc;
let mongoose;

before(async () => {
  if (!URI) return;
  ({ default: mongoose } = await import("mongoose"));
  await mongoose.connect(URI);
  const [{ default: Employer }, { default: Worker }, jobs, apps, mine] = await Promise.all([
    import("../src/models/Employer.js"),
    import("../src/models/Worker.js"),
    import("../src/services/jobService.js"),
    import("../src/services/applicationService.js"),
    import("../src/services/employerJobService.js"),
  ]);
  svc = { Employer, Worker, ...jobs, ...apps, ...mine };
});

after(async () => {
  if (!URI) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const uniq = () => Math.random().toString(36).slice(2, 8);

async function setup(vacancies, workerCount) {
  const employer = await svc.Employer.create({ companyName: "Test Co", email: `${uniq()}@t.test`, password: "x" });
  const workers = [];
  for (let i = 0; i < workerCount; i++) workers.push(await svc.Worker.create({ name: `W${i}`, phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}` }));
  const job = await svc.createJob(String(employer._id), { jobTitle: "Mason", location: "Nashik", salary: 800, vacancies, skills: "Mason", summary: "" });
  const applications = [];
  for (const w of workers) applications.push(await svc.applyToJob(String(w._id), String(job._id), {}));
  return { employerId: String(employer._id), job, jobId: String(job._id), workers, applications };
}

const detail = (employerId, jobId) => svc.getEmployerJob(employerId, jobId);

test("accepting beyond capacity is rejected and the job becomes filled", { skip }, async () => {
  const { employerId, jobId, applications } = await setup(2, 3);
  await svc.decideApplication(employerId, String(applications[0]._id), "accepted");
  await svc.decideApplication(employerId, String(applications[1]._id), "accepted");
  await assert.rejects(svc.decideApplication(employerId, String(applications[2]._id), "accepted"), { status: 409 });
  const d = await detail(employerId, jobId);
  assert.equal(d.status, "filled");
  assert.equal(d.stats.totalVacancies, 2);
  assert.equal(d.stats.availableVacancies, 0);
  assert.equal(d.stats.reserved, 2);
});

test("two simultaneous accepts for the last vacancy: exactly one wins", { skip }, async () => {
  const { employerId, jobId, applications } = await setup(1, 2);
  const results = await Promise.allSettled(applications.map((a) => svc.decideApplication(employerId, String(a._id), "accepted")));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const d = await detail(employerId, jobId);
  assert.equal(d.filledPositions, 1);
  assert.equal(d.availablePositions, 0);
});

test("rejecting an offer and withdrawing release the vacancy; counts never go negative", { skip }, async () => {
  const { employerId, jobId, workers, applications } = await setup(2, 2);
  const [a, b] = applications;
  await svc.decideApplication(employerId, String(a._id), "accepted");
  await svc.decideApplication(employerId, String(b._id), "accepted");
  await svc.respondToOffer({ id: String(workers[0]._id), phone: workers[0].phone }, String(a._id), "rejected");
  let d = await detail(employerId, jobId);
  assert.equal(d.status, "active");
  assert.equal(d.stats.availableVacancies, 1);
  await svc.respondToOffer({ id: String(workers[1]._id), phone: workers[1].phone }, String(b._id), "confirmed");
  await svc.withdrawApplication({ id: String(workers[1]._id), phone: workers[1].phone }, String(b._id));
  d = await detail(employerId, jobId);
  assert.equal(d.filledPositions, 0);
  assert.equal(d.stats.availableVacancies, 2);
  assert.equal(d.stats.confirmedWorkers, 0);
  await assert.rejects(svc.withdrawApplication({ id: String(workers[1]._id), phone: workers[1].phone }, String(b._id)), { status: 409 });
  assert.equal((await detail(employerId, jobId)).filledPositions, 0);
});

test("close, decline pending, reopen rules", { skip }, async () => {
  const { employerId, jobId, applications } = await setup(1, 2);
  await svc.decideApplication(employerId, String(applications[0]._id), "accepted");
  const closed = await svc.closeEmployerJob(employerId, jobId, { declinePending: true });
  assert.equal(closed.job.status, "closed");
  assert.equal(closed.declined, 1);
  await assert.rejects(svc.decideApplication(employerId, String(applications[1]._id), "accepted"), { status: 409 });
  await assert.rejects(svc.reopenEmployerJob(employerId, jobId), { status: 409 });
  await svc.updateEmployerJob(employerId, jobId, { vacancies: 3 });
  const reopened = await svc.reopenEmployerJob(employerId, jobId);
  assert.equal(reopened.status, "active");
  assert.equal(reopened.stats.confirmedWorkers + reopened.stats.reserved, 1);
});

test("critical edits are blocked while a worker holds a position; safe edits and vacancy rules work", { skip }, async () => {
  const { employerId, jobId, applications } = await setup(3, 1);
  await svc.updateEmployerJob(employerId, jobId, { salary: 900 });
  await svc.decideApplication(employerId, String(applications[0]._id), "accepted");
  await assert.rejects(svc.updateEmployerJob(employerId, jobId, { salary: 1000 }), { status: 409 });
  await assert.rejects(svc.updateEmployerJob(employerId, jobId, { vacancies: 0 }), { status: 400 });
  await svc.updateEmployerJob(employerId, jobId, { experience: "2 years", duration: "5 days" });
  await svc.updateEmployerJob(employerId, jobId, { vacancies: 1 });
  assert.equal((await detail(employerId, jobId)).status, "filled");
  await svc.updateEmployerJob(employerId, jobId, { vacancies: 4 });
  assert.equal((await detail(employerId, jobId)).status, "active");
});

test("another employer cannot read, edit, close or delete the job", { skip }, async () => {
  const { jobId } = await setup(1, 0);
  const other = await svc.Employer.create({ companyName: "Other", email: `${uniq()}@t.test`, password: "x" });
  const otherId = String(other._id);
  await assert.rejects(svc.getEmployerJob(otherId, jobId), { status: 403 });
  await assert.rejects(svc.updateEmployerJob(otherId, jobId, { salary: 1 }), { status: 403 });
  await assert.rejects(svc.closeEmployerJob(otherId, jobId, {}), { status: 403 });
  await assert.rejects(svc.deleteEmployerJob(otherId, jobId), { status: 403 });
});

test("a job with applications cannot be deleted; an empty one can", { skip }, async () => {
  const withApps = await setup(1, 1);
  await assert.rejects(svc.deleteEmployerJob(withApps.employerId, withApps.jobId), { status: 409 });
  const empty = await setup(1, 0);
  assert.deepEqual(await svc.deleteEmployerJob(empty.employerId, empty.jobId), { success: true });
  await assert.rejects(svc.getEmployerJob(empty.employerId, empty.jobId), { status: 404 });
});

test("dashboard summary matches the per-job numbers", { skip }, async () => {
  const { employerId, applications } = await setup(2, 2);
  await svc.decideApplication(employerId, String(applications[0]._id), "accepted");
  const { jobs, summary } = await svc.listEmployerJobs(employerId);
  assert.equal(summary.totalJobs, jobs.length);
  assert.equal(summary.totalApplications, 2);
  assert.equal(summary.pendingApplications, 1);
  assert.equal(summary.reservedVacancies, 1);
  assert.equal(summary.availableVacancies, 1);
  for (const j of jobs) assert.equal(j.stats.reserved + j.stats.confirmedWorkers, j.filledPositions);
});
