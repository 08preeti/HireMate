import test, { before, after } from "node:test";
import assert from "node:assert/strict";

const URI = process.env.MONGO_TEST_URI;
const skip = URI ? false : "set MONGO_TEST_URI to a disposable MongoDB database to run these tests";

let svc;
let mongoose;
let hub;

before(async () => {
  if (!URI) return;
  ({ default: mongoose } = await import("mongoose"));
  await mongoose.connect(URI);
  const [{ default: Employer }, { default: Worker }, { default: Notification }, { default: Job }, jobs, apps, notes, hubMod] = await Promise.all([
    import("../src/models/Employer.js"),
    import("../src/models/Worker.js"),
    import("../src/models/Notification.js"),
    import("../src/models/Job.js"),
    import("../src/services/jobService.js"),
    import("../src/services/applicationService.js"),
    import("../src/services/notificationService.js"),
    import("../src/services/notificationHub.js"),
  ]);
  hub = hubMod;
  svc = { Employer, Worker, Notification, Job, ...jobs, ...apps, ...notes };
});

after(async () => {
  if (!URI) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const uniq = () => Math.random().toString(36).slice(2, 8);
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

async function setup(vacancies = 1) {
  const employer = await svc.Employer.create({ companyName: "Test Co", email: `${uniq()}@t.test`, password: "x" });
  const worker = await svc.Worker.create({ name: "Worker", phone: phone() });
  const e = { id: String(employer._id), role: "employer" };
  const w = { id: String(worker._id), phone: worker.phone, role: "worker" };
  const job = await svc.createJob(e.id, { jobTitle: "Mason", location: "Nashik", salary: 800, skills: "Mason", summary: "", vacancies });
  return { e, w, job };
}

test("filters split read and unread, and counts ignore deleted rows", { skip }, async () => {
  const { e, w, job } = await setup();
  const application = await svc.applyToJob(w.id, String(job._id), {});
  let list = await svc.listNotifications(w, { filter: "all" });
  assert.equal(list.unreadCount, list.total);
  const one = list.notifications.find((n) => n.type === "application_submitted");
  await svc.markRead(w, String(one._id));
  assert.equal((await svc.listNotifications(w, { filter: "read" })).notifications.length, 1);
  assert.equal((await svc.listNotifications(w, { filter: "unread" })).notifications.length, list.total - 1);
  await svc.deleteNotification(w, String(one._id));
  list = await svc.listNotifications(w, { filter: "all" });
  assert.equal(list.unreadCount, list.total);
  assert.equal((await svc.listNotifications(e, { filter: "all" })).notifications.some((n) => n.type === "new_application" && String(n.application) === String(application._id)), true);
});

test("a user can never read, mark or delete another user's notification", { skip }, async () => {
  const { e, w, job } = await setup();
  await svc.applyToJob(w.id, String(job._id), {});
  const mine = (await svc.listNotifications(w, { filter: "all" })).notifications[0];
  await assert.rejects(svc.markRead(e, String(mine._id)), { status: 404 });
  await assert.rejects(svc.deleteNotification(e, String(mine._id)), { status: 404 });
  await assert.rejects(svc.markRead(w, "not-an-id"), { status: 400 });
  assert.equal((await svc.listNotifications(e, { filter: "all" })).notifications.some((n) => String(n._id) === String(mine._id)), false);
});

test("repeating an event does not duplicate its notification", { skip }, async () => {
  const { w, job } = await setup();
  const application = await svc.applyToJob(w.id, String(job._id), {});
  await svc.notifyApplicationCreated(application, job);
  await svc.notifyApplicationCreated(application, job);
  assert.equal(await svc.Notification.countDocuments({ application: application._id, type: "application_submitted" }), 1);
});

test("accepting the last vacancy tells the employer the job is filled, once", { skip }, async () => {
  const { e, w, job } = await setup(1);
  const application = await svc.applyToJob(w.id, String(job._id), {});
  await svc.decideApplication(e.id, String(application._id), "accepted");
  const filled = await svc.Notification.find({ recipient: e.id, type: "job_filled" });
  assert.equal(filled.length, 1);
  assert.equal(filled[0].role, "employer");
});

test("a job with spare vacancies does not announce 'filled'", { skip }, async () => {
  const { e, w, job } = await setup(2);
  const application = await svc.applyToJob(w.id, String(job._id), {});
  await svc.decideApplication(e.id, String(application._id), "accepted");
  assert.equal(await svc.Notification.countDocuments({ recipient: e.id, type: "job_filled" }), 0);
});

test("only newly created notifications are pushed live, and only to their recipient", { skip }, async () => {
  const { e, w, job } = await setup();
  const got = { worker: [], employer: [], stranger: [] };
  const sub = (key, bucket) => hub.subscribe(key, { send: (event, data) => bucket.push(data), close() {} });
  const offW = sub(hub.hubKey("worker", w.id), got.worker);
  const offE = sub(hub.hubKey("employer", e.id), got.employer);
  const offS = sub(hub.hubKey("worker", String(new mongoose.Types.ObjectId())), got.stranger);
  const application = await svc.applyToJob(w.id, String(job._id), {});
  await svc.notifyApplicationCreated(application, job);
  offW(); offE(); offS();
  assert.deepEqual(got.worker.map((n) => n.type), ["application_submitted"]);
  assert.deepEqual(got.employer.map((n) => n.type), ["new_application"]);
  assert.equal(got.stranger.length, 0);
});

test("turning off job-match alerts stops only job_match notifications", { skip }, async () => {
  const { e, w } = await setup();
  await svc.Worker.updateOne({ _id: w.id }, { $set: { skills: "Mason", location: "Nashik" } });
  await svc.setPreferences(w, { jobMatches: false });
  assert.deepEqual(await svc.getPreferences(w), { jobMatches: false });
  const job = await svc.createJob(e.id, { jobTitle: "Mason", location: "Nashik", salary: 800, skills: "Mason", summary: "" });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await svc.Notification.countDocuments({ recipient: w.id, type: "job_match" }), 0);
  await svc.applyToJob(w.id, String(job._id), {});
  assert.equal(await svc.Notification.countDocuments({ recipient: w.id, type: "application_submitted" }), 1);
  await assert.rejects(svc.setPreferences(w, { jobMatches: "no" }), { status: 400 });
});
