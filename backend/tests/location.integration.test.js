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
  const [{ default: Employer }, { default: Worker }, { default: Application }, { default: Job }, jobs, apps, life, loc] = await Promise.all([
    import("../src/models/Employer.js"),
    import("../src/models/Worker.js"),
    import("../src/models/Application.js"),
    import("../src/models/Job.js"),
    import("../src/services/jobService.js"),
    import("../src/services/applicationService.js"),
    import("../src/services/workLifecycleService.js"),
    import("../src/services/locationService.js"),
  ]);
  svc = { Employer, Worker, Application, Job, ...jobs, ...apps, ...life, ...loc };
});

after(async () => {
  if (!URI) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const uniq = () => Math.random().toString(36).slice(2, 8);
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
const fix = (lat = 19.9975, lng = 73.7898) => ({ lat, lng, accuracy: 10, recordedAt: new Date() });

async function confirmedBooking() {
  const employer = await svc.Employer.create({ companyName: "Test Co", email: `${uniq()}@t.test`, password: "x" });
  const worker = await svc.Worker.create({ name: "Worker", phone: phone() });
  const employerId = String(employer._id);
  const auth = { id: String(worker._id), phone: worker.phone };
  const job = await svc.createJob(employerId, { jobTitle: "Mason", location: "Nashik", salary: 800, skills: "Mason", summary: "", latitude: 19.99, longitude: 73.78 });
  const application = await svc.applyToJob(auth.id, String(job._id), {});
  const id = String(application._id);
  await svc.decideApplication(employerId, id, "accepted");
  await svc.respondToOffer(auth, id, "confirmed");
  return { employerId, auth, id };
}

const otherWorker = async () => {
  const w = await svc.Worker.create({ name: "Other", phone: phone() });
  return { id: String(w._id), phone: w.phone };
};
const otherEmployer = async () => String((await svc.Employer.create({ companyName: "Other Co", email: `${uniq()}@t.test`, password: "x" }))._id);

test("no location is accepted until the worker has switched sharing on", { skip }, async () => {
  const { auth, id } = await confirmedBooking();
  await assert.rejects(svc.updateLiveLocation(auth, id, fix()), { status: 403 });
  await svc.setLocationConsent(auth, id, true);
  await svc.updateLiveLocation(auth, id, fix());
});

test("only the owning worker can update, and only the owning employer can read", { skip }, async () => {
  const { employerId, auth, id } = await confirmedBooking();
  await svc.setLocationConsent(auth, id, true);
  await assert.rejects(svc.updateLiveLocation(await otherWorker(), id, fix()), { status: 403 });
  await svc.updateLiveLocation(auth, id, fix());

  const seen = await svc.getTrackedLocation(employerId, id);
  assert.equal(seen.sharing, "active");
  assert.equal(seen.location.lat, 19.9975);
  assert.deepEqual(seen.destination, { lat: 19.99, lng: 73.78 });
  await assert.rejects(svc.getTrackedLocation(await otherEmployer(), id), { status: 403 });
});

test("updates are rate limited per application and only the latest point is stored", { skip }, async () => {
  const { auth, id } = await confirmedBooking();
  await svc.setLocationConsent(auth, id, true);
  await svc.updateLiveLocation(auth, id, fix(19.9975, 73.7898));
  await assert.rejects(svc.updateLiveLocation(auth, id, fix(20.1, 73.9)), { status: 429 });
  await svc.updateLiveLocation(auth, id, fix(20.1, 73.9), Date.now() + 10_000);
  const a = await svc.Application.findById(id).lean();
  assert.equal(a.liveLocation.lat, 20.1);
  assert.equal(Object.keys(a).filter((k) => /history|track/i.test(k)).length, 0);
});

test("stopping sharing deletes the stored position and hides it from the employer", { skip }, async () => {
  const { employerId, auth, id } = await confirmedBooking();
  await svc.setLocationConsent(auth, id, true);
  await svc.updateLiveLocation(auth, id, fix());
  await svc.setLocationConsent(auth, id, false);
  assert.equal((await svc.Application.findById(id).lean()).liveLocation, undefined);
  const seen = await svc.getTrackedLocation(employerId, id);
  assert.equal(seen.sharing, "not_enabled");
  assert.equal(seen.location, null);
  await assert.rejects(svc.updateLiveLocation(auth, id, fix(), Date.now() + 10_000), { status: 403 });
});

test("completing or cancelling the work ends sharing and removes the position", { skip }, async () => {
  const done = await confirmedBooking();
  await svc.setLocationConsent(done.auth, done.id, true);
  await svc.updateLiveLocation(done.auth, done.id, fix());
  await svc.updateApplicationStatus(done.auth, done.id, "arrived");
  await svc.requestCompletion(done.auth, done.id);
  await svc.decideCompletion(done.employerId, done.id, { decision: "approved" });
  let a = await svc.Application.findById(done.id).lean();
  assert.equal(a.liveLocation, undefined);
  assert.equal(a.locationConsent, false);
  await assert.rejects(svc.updateLiveLocation(done.auth, done.id, fix(), Date.now() + 10_000), { status: 409 });
  assert.equal((await svc.getTrackedLocation(done.employerId, done.id)).sharing, "ended");

  const cancelled = await confirmedBooking();
  await svc.setLocationConsent(cancelled.auth, cancelled.id, true);
  await svc.updateLiveLocation(cancelled.auth, cancelled.id, fix());
  await svc.cancelApplication(cancelled.employerId, cancelled.id, "Site closed");
  a = await svc.Application.findById(cancelled.id).lean();
  assert.equal(a.liveLocation, undefined);
  assert.equal(a.locationConsent, false);
});

test("the employer application list never carries a position without consent", { skip }, async () => {
  const { employerId, auth, id } = await confirmedBooking();
  await svc.setLocationConsent(auth, id, true);
  await svc.updateLiveLocation(auth, id, fix());
  let [row] = await svc.listEmployerApplications(employerId);
  assert.equal(row.liveLocation.lat, 19.9975);
  assert.equal(row.worker.currentLocation, undefined);
  await svc.setLocationConsent(auth, id, false);
  [row] = await svc.listEmployerApplications(employerId);
  assert.equal(row.liveLocation, undefined);
});

test("expired consent lapses and its stored position is purged", { skip }, async () => {
  const { auth, id } = await confirmedBooking();
  await svc.setLocationConsent(auth, id, true);
  await svc.updateLiveLocation(auth, id, fix());
  await svc.purgeExpiredLocations(Date.now() + 13 * 60 * 60_000);
  const a = await svc.Application.findById(id).lean();
  assert.equal(a.locationConsent, false);
  assert.equal(a.liveLocation, undefined);
});
