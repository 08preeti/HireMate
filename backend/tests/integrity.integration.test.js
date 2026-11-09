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
  const [{ default: Employer }, { default: Worker }, { default: Application }, { default: Job }, { default: Notification }, jobs, apps, life, auth, empJobs, empAuth] = await Promise.all([
    import("../src/models/Employer.js"),
    import("../src/models/Worker.js"),
    import("../src/models/Application.js"),
    import("../src/models/Job.js"),
    import("../src/models/Notification.js"),
    import("../src/services/jobService.js"),
    import("../src/services/applicationService.js"),
    import("../src/services/workLifecycleService.js"),
    import("../src/services/workerAuthService.js"),
    import("../src/services/employerJobService.js"),
    import("../src/services/employerAuthService.js"),
  ]);
  svc = { Employer, Worker, Application, Job, Notification, ...jobs, ...apps, ...life, ...auth, ...empJobs, ...empAuth };
  await Promise.all([Worker.init(), Application.init(), Employer.init()]);
});

after(async () => {
  if (!URI) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const uniq = () => Math.random().toString(36).slice(2, 8);
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
const settled = (promises) => Promise.allSettled(promises);
const ok = (results) => results.filter((r) => r.status === "fulfilled").length;

async function employerWithJob(vacancies = 1) {
  const employer = await svc.Employer.create({ companyName: "Test Co", email: `${uniq()}@t.test`, password: "x" });
  const e = String(employer._id);
  const job = await svc.createJob(e, { jobTitle: "Mason", location: "Nashik", salary: 800, skills: "Mason", summary: "", vacancies });
  return { e, job };
}
const newWorker = async () => {
  const w = await svc.Worker.create({ name: "Worker", phone: phone() });
  return { id: String(w._id), phone: w.phone, role: "worker" };
};

test("the same worker applying many times at once creates exactly one application", { skip }, async () => {
  const { job } = await employerWithJob(3);
  const w = await newWorker();
  const results = await settled(Array.from({ length: 6 }, () => svc.applyToJob(w.id, String(job._id), {})));
  assert.equal(ok(results), 1);
  assert.equal(await svc.Application.countDocuments({ job: job._id, worker: w.id }), 1);
});

test("accepting more applicants than there are vacancies is impossible, even simultaneously", { skip }, async () => {
  const { e, job } = await employerWithJob(1);
  const workers = await Promise.all([newWorker(), newWorker(), newWorker()]);
  const applications = [];
  for (const w of workers) applications.push(await svc.applyToJob(w.id, String(job._id), {}));
  const results = await settled(applications.map((a) => svc.decideApplication(e, String(a._id), "accepted")));
  assert.equal(ok(results), 1);
  const after = await svc.Job.findById(job._id).lean();
  assert.equal(after.filledPositions, 1);
  assert.equal(after.status, "filled");
  assert.equal(await svc.Application.countDocuments({ job: job._id, status: "accepted" }), 1);
});

test("a full job takes no further applications", { skip }, async () => {
  const { e, job } = await employerWithJob(1);
  const first = await newWorker();
  const application = await svc.applyToJob(first.id, String(job._id), {});
  await svc.decideApplication(e, String(application._id), "accepted");
  const late = await newWorker();
  await assert.rejects(svc.applyToJob(late.id, String(job._id), {}), (err) => err.status >= 400 && err.status < 500);
});

test("answering an offer twice at once changes it once and notifies once", { skip }, async () => {
  const { e, job } = await employerWithJob(2);
  const w = await newWorker();
  const application = await svc.applyToJob(w.id, String(job._id), {});
  await svc.decideApplication(e, String(application._id), "accepted");
  const results = await settled([svc.respondToOffer(w, String(application._id), "confirmed"), svc.respondToOffer(w, String(application._id), "confirmed")]);
  assert.equal(ok(results), 1);
  assert.equal(await svc.Notification.countDocuments({ recipient: e, application: application._id, type: "offer_confirmed" }), 1);
});

test("rejecting an offer releases its vacancy exactly once", { skip }, async () => {
  const { e, job } = await employerWithJob(1);
  const w = await newWorker();
  const application = await svc.applyToJob(w.id, String(job._id), {});
  await svc.decideApplication(e, String(application._id), "accepted");
  const results = await settled([svc.respondToOffer(w, String(application._id), "rejected"), svc.respondToOffer(w, String(application._id), "rejected")]);
  assert.equal(ok(results), 1);
  const after = await svc.Job.findById(job._id).lean();
  assert.equal(after.filledPositions, 0);
});

test("a completed job can be rated once, however many requests arrive", { skip }, async () => {
  const { e, job } = await employerWithJob(1);
  const w = await newWorker();
  const application = await svc.applyToJob(w.id, String(job._id), {});
  const id = String(application._id);
  await svc.decideApplication(e, id, "accepted");
  await svc.respondToOffer(w, id, "confirmed");
  await svc.updateApplicationStatus(w, id, "arrived");
  await svc.requestCompletion(w, id);
  await svc.decideCompletion(e, id, { decision: "approved" });
  const results = await settled([svc.rateApplication(e, id, { rating: 5, review: "" }), svc.rateApplication(e, id, { rating: 1, review: "" }), svc.rateEmployer(w, id, { rating: 4, review: "" }), svc.rateEmployer(w, id, { rating: 2, review: "" })]);
  assert.equal(ok(results), 2);
  assert.equal(await svc.Notification.countDocuments({ application: id, type: "review_received" }), 2);
  assert.equal((await svc.Worker.findById(w.id).lean()).totalReviews, 1);
});

test("five wrong OTP guesses invalidate the code, and a new code starts fresh", { skip }, async () => {
  const p = phone();
  const { otp } = await svc.sendWorkerOtp(p);
  const wrong = otp === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i += 1) await assert.rejects(svc.verifyWorkerOtp({ phone: p, otp: wrong, name: "Asha" }), { status: 400 });
  await assert.rejects(svc.verifyWorkerOtp({ phone: p, otp, name: "Asha" }), (err) => err.status === 400 || err.status === 429);
  const fresh = await svc.sendWorkerOtp(p);
  const session = await svc.verifyWorkerOtp({ phone: p, otp: fresh.otp, name: "Asha" });
  assert.ok(session.token);
});

test("login responses never carry OTP fields", { skip }, async () => {
  const p = phone();
  const { otp } = await svc.sendWorkerOtp(p);
  const session = await svc.verifyWorkerOtp({ phone: p, otp, name: "Asha" });
  for (const key of ["otp", "otpExpires", "otpAttempts"]) assert.equal(key in session.worker, false, key);
});

test("simultaneous first-time OTP requests for one number create one account", { skip }, async () => {
  const p = phone();
  await settled(Array.from({ length: 6 }, () => svc.sendWorkerOtp(p)));
  assert.equal(await svc.Worker.countDocuments({ phone: p }), 1);
});

test("employer emails are case-insensitive for sign-up and sign-in", { skip }, async () => {
  const tag = uniq();
  await svc.registerEmployer({ companyName: "Case Co", email: `Owner.${tag}@Test.IN`, password: "longenough1" });
  await assert.rejects(svc.registerEmployer({ companyName: "Case Co", email: `OWNER.${tag}@test.in`, password: "longenough1" }), { status: 400 });
  const session = await svc.loginEmployer({ email: `owner.${tag}@TEST.in`, password: "longenough1" });
  assert.ok(session.token);
  await assert.rejects(svc.loginEmployer({ email: `owner.${tag}@test.in`, password: "wrong-password" }), { status: 401 });
});
