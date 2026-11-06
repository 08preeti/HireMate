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
  const [{ default: Employer }, { default: Worker }, { default: Application }, jobs, apps, life, mine] = await Promise.all([
    import("../src/models/Employer.js"),
    import("../src/models/Worker.js"),
    import("../src/models/Application.js"),
    import("../src/services/jobService.js"),
    import("../src/services/applicationService.js"),
    import("../src/services/workLifecycleService.js"),
    import("../src/services/employerJobService.js"),
  ]);
  svc = { Employer, Worker, Application, ...jobs, ...apps, ...life, ...mine };
});

after(async () => {
  if (!URI) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const uniq = () => Math.random().toString(36).slice(2, 8);
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

async function booking(vacancies = 1) {
  const employer = await svc.Employer.create({ companyName: "Test Co", email: `${uniq()}@t.test`, password: "x" });
  const worker = await svc.Worker.create({ name: "Worker", phone: phone() });
  const employerId = String(employer._id);
  const auth = { id: String(worker._id), phone: worker.phone };
  const job = await svc.createJob(employerId, { jobTitle: "Mason", location: "Nashik", salary: 800, vacancies, skills: "Mason", summary: "" });
  const application = await svc.applyToJob(auth.id, String(job._id), {});
  const id = String(application._id);
  await svc.decideApplication(employerId, id, "accepted");
  await svc.respondToOffer(auth, id, "confirmed");
  return { employerId, auth, worker, jobId: String(job._id), id };
}

const load = (id) => svc.Application.findById(id).lean();

test("full lifecycle: on the way, arrived, completion request, rejection, re-request, verification", { skip }, async () => {
  const { employerId, auth, id } = await booking();
  await assert.rejects(svc.requestCompletion(auth, id), { status: 409 });
  await svc.updateApplicationStatus(auth, id, "on_the_way");
  await assert.rejects(svc.updateApplicationStatus(auth, id, "on_the_way"), { status: 409 });
  await svc.updateApplicationStatus(auth, id, "arrived");
  await assert.rejects(svc.updateApplicationStatus(auth, id, "completed"), { status: 409 });

  await svc.requestCompletion(auth, id);
  await assert.rejects(svc.requestCompletion(auth, id), { status: 409 });
  assert.equal((await load(id)).status, "arrived");

  await svc.decideCompletion(employerId, id, { decision: "rejected", reason: "Wall not finished" });
  let a = await load(id);
  assert.equal(a.status, "arrived");
  assert.equal(a.completionRequestedAt, undefined);
  assert.equal(a.completionRejection.reason, "Wall not finished");
  await assert.rejects(svc.decideCompletion(employerId, id, { decision: "approved" }), { status: 409 });

  await svc.requestCompletion(auth, id);
  await svc.decideCompletion(employerId, id, { decision: "approved" });
  a = await load(id);
  assert.equal(a.status, "completed");
  assert.equal(a.isCompleted, true);
  assert.ok(a.completedAt);
  await assert.rejects(svc.decideCompletion(employerId, id, { decision: "approved" }), { status: 409 });
  assert.deepEqual(a.timeline.map((t) => t.event), ["submitted", "accepted", "confirmed", "on_the_way", "arrived", "completion_requested", "completion_rejected", "completion_requested", "completed"]);
});

test("another employer or worker cannot move the work", { skip }, async () => {
  const { employerId, auth, id } = await booking();
  await svc.updateApplicationStatus(auth, id, "arrived");
  await svc.requestCompletion(auth, id);
  const other = await svc.Employer.create({ companyName: "Other", email: `${uniq()}@t.test`, password: "x" });
  const stranger = await svc.Worker.create({ name: "Stranger", phone: phone() });
  await assert.rejects(svc.decideCompletion(String(other._id), id, { decision: "approved" }), { status: 403 });
  await assert.rejects(svc.requestCompletion({ id: String(stranger._id), phone: stranger.phone }, id), { status: 403 });
  await assert.rejects(svc.cancelApplication(String(other._id), id, "x y z"), { status: 403 });
  await svc.decideCompletion(employerId, id, { decision: "approved" });
});

test("reviews: only after completion, once each, ratings stored and aggregated", { skip }, async () => {
  const { employerId, auth, worker, id } = await booking();
  await assert.rejects(svc.rateApplication(employerId, id, { rating: 5, review: "" }), { status: 409 });
  await assert.rejects(svc.rateEmployer(auth, id, { rating: 5, review: "" }), { status: 409 });
  await svc.updateApplicationStatus(auth, id, "arrived");
  await svc.requestCompletion(auth, id);
  await svc.decideCompletion(employerId, id, { decision: "approved" });

  await svc.rateApplication(employerId, id, { rating: 4, review: "Good" });
  await assert.rejects(svc.rateApplication(employerId, id, { rating: 5, review: "" }), { status: 409 });
  await svc.rateEmployer(auth, id, { rating: 5, review: "Paid on time" });
  await assert.rejects(svc.rateEmployer(auth, id, { rating: 1, review: "" }), { status: 409 });

  const a = await load(id);
  assert.equal(a.rating, 4);
  assert.equal(a.employerRating, 5);
  assert.equal((await svc.Worker.findById(worker._id)).rating, 4);
  const summaries = await svc.getEmployerSummaries([employerId]);
  assert.deepEqual(summaries.get(employerId), { completedJobs: 1, totalReviews: 1, rating: 5 });
});

test("cancellation needs a reason once confirmed, releases the vacancy and keeps the record", { skip }, async () => {
  const { employerId, auth, jobId, id } = await booking(2);
  await assert.rejects(svc.withdrawApplication(auth, id), { status: 400 });
  await svc.withdrawApplication(auth, id, "Family emergency");
  const a = await load(id);
  assert.equal(a.status, "withdrawn");
  assert.equal(a.cancellationReason, "Family emergency");
  assert.equal(a.timeline.at(-1).note, "Family emergency");
  assert.equal((await svc.getEmployerJob(employerId, jobId)).filledPositions, 0);
  await assert.rejects(svc.cancelApplication(employerId, id, "again please"), { status: 409 });
});

test("completed work cannot be cancelled; employer cancellation notifies and releases", { skip }, async () => {
  const done = await booking();
  await svc.updateApplicationStatus(done.auth, done.id, "arrived");
  await svc.requestCompletion(done.auth, done.id);
  await svc.decideCompletion(done.employerId, done.id, { decision: "approved" });
  await assert.rejects(svc.cancelApplication(done.employerId, done.id, "too late now"), { status: 409 });
  await assert.rejects(svc.withdrawApplication(done.auth, done.id, "too late now"), { status: 409 });

  const live = await booking();
  await assert.rejects(svc.cancelApplication(live.employerId, live.id), { status: 400 });
  await svc.cancelApplication(live.employerId, live.id, "Site closed today");
  assert.equal((await load(live.id)).status, "cancelled");
  assert.equal((await svc.getEmployerJob(live.employerId, live.jobId)).filledPositions, 0);
  const { default: Notification } = await import("../src/models/Notification.js");
  assert.equal(await Notification.countDocuments({ application: live.id, type: "application_cancelled" }), 1);
});

test("a worker cannot withdraw after asking for completion", { skip }, async () => {
  const { auth, id } = await booking();
  await svc.updateApplicationStatus(auth, id, "arrived");
  await svc.requestCompletion(auth, id);
  await assert.rejects(svc.withdrawApplication(auth, id, "changed mind"), { status: 409 });
});
