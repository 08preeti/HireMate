import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Worker from "../models/Worker.js";
import { HttpError } from "../utils/httpError.js";
import { JOURNEY_TRANSITIONS } from "../validators/applicationValidators.js";
import { RESERVING_STATUSES, assertJobOpen, healJobStatus, reserveVacancy, releaseVacancy, runAtomic, withVacancyCountsFor } from "./vacancyService.js";
import {
  notifyApplicationCreated,
  notifyApplicationDecision,
  notifyApplicationEnded,
  notifyOfferResponse,
  notifyWorkerStatusChange,
  notifyApplicationRated,
} from "./notificationService.js";

// Until the employer accepts, the worker's phone number and GPS location stay private.
// (Declined applications stay private too, and so do offers the worker rejected: they
// are no longer a hire, so they are never counted as staffed or tracked.)
const UNDECIDED = ["pending", "declined", "rejected", "withdrawn", "cancelled"];

// Live GPS may only be shared for a hire the worker has confirmed and is still doing.
// Any other (or future) status is excluded by default.
const LOCATION_SHARING = ["confirmed", "on_the_way", "arrived"];

// One timeline entry, stamped by the server at the moment the status change is written.
const entry = (event, by) => ({ event, by, at: new Date() });

// The worker an application belongs to (linked by id, or by phone for older applications).
export const ownsApplication = (auth, application) =>
  (application.worker && application.worker.toString() === auth.id) ||
  (auth.phone && application.applicantContact === auth.phone);

// ── Employer side ───────────────────────────────────────────────────────────
export async function rateApplication(employerId, applicationId, { rating, review }) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (application.employer.toString() !== employerId) throw new HttpError(403, "Not authorized");
  if (UNDECIDED.includes(application.status)) throw new HttpError(409, "Application has not been accepted");

  application.rating = Number(rating);
  application.review = review;
  application.isCompleted = true;
  application.locationConsent = false; // job is over: stop sharing location
  await application.save();
  await notifyApplicationRated(application);
}

// Only these worker fields ever reach an employer. OTP and everything else stay server-side.
const WORKER_FIELDS_FOR_EMPLOYER = "name phone skills location gender rating totalReviews currentLocation";

// Applies the privacy rules to one (plain) application before it goes to the employer:
//  - phone numbers only after the employer has accepted (status not pending/declined/rejected)
//  - live GPS only with the worker's consent, for a confirmed/active, not completed, application
function shapeForEmployer(application) {
  const contactAllowed = !UNDECIDED.includes(application.status);
  const locationAllowed =
    contactAllowed &&
    application.locationConsent === true &&
    !application.isCompleted &&
    LOCATION_SHARING.includes(application.status);

  if (!contactAllowed) delete application.applicantContact;
  if (application.worker) {
    if (!contactAllowed) delete application.worker.phone;
    if (!locationAllowed) delete application.worker.currentLocation;
  }
  return application;
}

// Workers only ever see an employer's contact number once the employer has accepted them.
export function shapeForWorker(application) {
  const plain = typeof application.toObject === "function" ? application.toObject() : application;
  if (UNDECIDED.includes(plain.status) && plain.job && typeof plain.job === "object") {
    delete plain.job.contactInfo;
  }
  return plain;
}

// Adds total / filled / available vacancies to each application's job.
async function attachJobCounts(applications) {
  await Promise.all(
    applications.map(async (a) => {
      if (a.job && typeof a.job === "object") a.job = (await withVacancyCountsFor([a.job]))[0];
    }),
  );
}

export async function listEmployerApplications(employerId) {
  const applications = await Application.find({ employer: employerId })
    .sort({ createdAt: -1 })
    .populate("job")
    .populate("worker", WORKER_FIELDS_FOR_EMPLOYER)
    .lean();
  await attachJobCounts(applications);
  return applications.map(shapeForEmployer);
}

// Active (not completed) applications for the employer's live map. Pending / declined /
// rejected applications are excluded; GPS is added only where the worker has consented.
export async function listLiveApplications(employerId) {
  const applications = await Application.find({
    employer: employerId,
    isCompleted: false,
    status: { $nin: UNDECIDED },
  })
    .populate("job")
    .populate("worker", WORKER_FIELDS_FOR_EMPLOYER)
    .lean();
  await attachJobCounts(applications);
  return applications.map(shapeForEmployer);
}

// Employer accepts or declines a pending application for one of their own jobs.
export async function decideApplication(employerId, applicationId, decision) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");

  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");

  const job = await Job.findById(application.job);
  const ownsIt =
    application.employer.toString() === employerId && (!job || job.employer.toString() === employerId);
  if (!ownsIt) throw new HttpError(403, "Not authorized");
  if (!job) throw new HttpError(404, "Job not found");

  // Only one request can move the application out of "pending" (compare-and-set on the status), so a
  // double click or a second tab can never decide it twice (or notify twice).
  //
  // Accepting also reserves one vacancy. Reserve + status change run together in runAtomic: one MongoDB
  // transaction when available, otherwise the atomic reservation is given back if the status change fails.
  const pendingFilter = { _id: application._id, employer: employerId, status: "pending" };
  const alreadyDecided = () => new HttpError(409, `Application is already ${application.status.replace(/_/g, " ")}`);

  let decided;
  if (decision === "accepted") {
    decided = await runAtomic(async (session, onUndo) => {
      await reserveVacancy(job._id, session);
      onUndo(() => releaseVacancy(job._id));
      const updated = await Application.findOneAndUpdate(pendingFilter, { $set: { status: decision }, $push: { timeline: entry(decision, "employer") } }, { new: true, session });
      if (!updated) throw alreadyDecided();
      return updated;
    });
  } else {
    decided = await Application.findOneAndUpdate(pendingFilter, { $set: { status: decision }, $push: { timeline: entry(decision, "employer") } }, { new: true });
    if (!decided) throw alreadyDecided();
  }

  await notifyApplicationDecision(decided, job, decision);
  return decided;
}

// ── Worker side ─────────────────────────────────────────────────────────────
export async function applyToJob(workerId, jobId, { applicantName, message }) {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(401, "Account not found");

  // Identity comes from the authenticated worker; the body is only a fallback for the display name.
  const name = applicantName || worker.name;
  const contact = worker.phone;
  if (!name || !contact) throw new HttpError(400, "Name and contact required");

  if (!mongoose.isValidObjectId(jobId)) throw new HttpError(400, "Invalid job id");
  await healJobStatus(jobId); // a "filled" job with a free vacancy reopens
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, "Job not found");
  assertJobOpen(job); // filled / closed jobs take no new applications

  const existing = await Application.findOne({
    job: job._id,
    $or: [{ worker: worker._id }, { applicantContact: contact }],
  });
  if (existing) throw new HttpError(400, "Already applied");

  let application;
  try {
    application = await Application.create({
      job: job._id,
      employer: job.employer,
      worker: worker._id,
      applicantName: name,
      applicantContact: contact,
      message: typeof message === "string" ? message.trim() : undefined,
    });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(400, "Already applied");
    throw err;
  }
  await notifyApplicationCreated(application, job);
  return application;
}

// Worker answers an offer (an application the employer accepted): accepted → confirmed | rejected.
export async function respondToOffer(auth, applicationId, response) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");

  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");

  // Only one request can move the offer out of "accepted" (compare-and-set on the status), so a double
  // click or a second tab can never answer it twice (or notify twice). Rejecting also releases the
  // reserved vacancy: in the same transaction when available, otherwise by a compensating revert if the
  // release fails. Exactly one request wins the status change, so exactly one release happens.
  const updated = await runAtomic(async (session, onUndo) => {
    const changed = await Application.findOneAndUpdate(
      { _id: application._id, status: "accepted" },
      { $set: { status: response }, $push: { timeline: entry(response, "worker") } },
      { new: true, session },
    );
    if (!changed) {
      const current = application.status;
      throw new HttpError(
        409,
        UNDECIDED.includes(current) && current !== "rejected"
          ? "There is no offer to respond to"
          : `Offer is already ${current.replace(/_/g, " ")}`,
      );
    }
    if (response === "rejected") {
      onUndo(() => Application.updateOne({ _id: changed._id, status: "rejected" }, { $set: { status: "accepted" }, $pull: { timeline: { event: "rejected" } } }));
      await releaseVacancy(changed.job, session);
    }
    return changed;
  });

  const job = await Job.findById(updated.job);
  await notifyOfferResponse(updated, job, response);
  return updated;
}

// Ends an application and releases its vacancy if it held one. The status change is a compare-and-set
// on the status that was validated, so of several simultaneous requests (double click, worker withdraw
// vs employer cancel vs worker reject) exactly ONE wins and only the winner releases the vacancy.
// Status change + release share a transaction when available; otherwise the status is reverted if the
// release fails, so a vacancy is never lost or released twice.
async function endApplication(application, newStatus, by) {
  const previous = application.status;
  const heldVacancy = RESERVING_STATUSES.includes(previous);
  return runAtomic(async (session, onUndo) => {
    const ended = await Application.findOneAndUpdate(
      { _id: application._id, status: previous },
      { $set: { status: newStatus, locationConsent: false }, $push: { timeline: entry(newStatus, by) } },
      { new: true, session },
    );
    if (!ended) throw new HttpError(409, "Application status changed, please refresh");
    if (heldVacancy) {
      onUndo(() => Application.updateOne({ _id: ended._id, status: newStatus }, { $set: { status: previous }, $pull: { timeline: { event: newStatus } } }));
      await releaseVacancy(ended.job, session);
    }
    return ended;
  });
}

// Worker withdraws their own application (pending, or an offer / confirmed job not yet started).
export async function withdrawApplication(auth, applicationId) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");
  if (!["pending", "accepted", "confirmed"].includes(application.status)) {
    throw new HttpError(409, `Cannot withdraw an application that is ${application.status.replace(/_/g, " ")}`);
  }
  const ended = await endApplication(application, "withdrawn", "worker");
  await notifyApplicationEnded(ended, await Job.findById(ended.job), "withdrawn");
  return ended;
}

// Employer cancels a hire they had accepted (before the job is completed).
export async function cancelApplication(employerId, applicationId) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (application.employer.toString() !== employerId) throw new HttpError(403, "Not authorized");
  if (!["accepted", "confirmed", "on_the_way", "arrived"].includes(application.status)) {
    throw new HttpError(409, `Cannot cancel an application that is ${application.status.replace(/_/g, " ")}`);
  }
  const ended = await endApplication(application, "cancelled", "employer");
  await notifyApplicationEnded(ended, await Job.findById(ended.job), "cancelled");
  return ended;
}

// Employer opened a pending application: recorded once, and only while it is still pending.
export async function markReviewed(employerId, applicationId) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");
  const application = await Application.findById(applicationId).select("employer");
  if (!application) throw new HttpError(404, "Not found");
  if (application.employer.toString() !== employerId) throw new HttpError(403, "Not authorized");
  await Application.updateOne(
    { _id: application._id, status: "pending", "timeline.event": { $ne: "reviewed" } },
    { $push: { timeline: entry("reviewed", "employer") } },
  );
}

// Worker moves through: confirmed → on_the_way → arrived → completed
export async function updateApplicationStatus(auth, applicationId, status) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");

  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");

  const allowedFrom = JOURNEY_TRANSITIONS[status] || [];
  if (!allowedFrom.includes(application.status)) {
    throw new HttpError(
      409,
      application.status === "accepted"
        ? "Confirm the offer before starting the job"
        : `Cannot change status from ${application.status.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}`,
    );
  }

  // Atomic, like the other transitions: the status must still be the one validated above.
  const updated = await Application.findOneAndUpdate(
    { _id: application._id, status: application.status },
    { $set: { status, ...(status === "completed" && { isCompleted: true, locationConsent: false }) }, $push: { timeline: entry(status, "worker") } },
    { new: true },
  );
  if (!updated) throw new HttpError(409, "Application status changed, please refresh");
  await notifyWorkerStatusChange(updated, status);
}

// Worker grants or withdraws consent to share live GPS for ONE of their own applications.
// Granting is only possible while the job is confirmed / on the way / arrived; withdrawing always works.
export async function setLocationConsent(auth, applicationId, consent) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");

  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");

  if (!consent) {
    await Application.updateOne({ _id: application._id }, { $set: { locationConsent: false } });
    return false;
  }

  // Atomic: the status must still allow sharing at the moment consent is stored.
  const updated = await Application.findOneAndUpdate(
    { _id: application._id, isCompleted: false, status: { $in: LOCATION_SHARING } },
    { $set: { locationConsent: true } },
    { new: true },
  );
  if (!updated) throw new HttpError(409, "Location can only be shared for a confirmed, active job");
  return true;
}

export async function getRatingByName(name) {
  const apps = await Application.find({ applicantName: name, isCompleted: true });
  if (!apps.length) return { rating: 0, total: 0 };
  const avg = apps.reduce((sum, a) => sum + (a.rating || 0), 0) / apps.length;
  return { rating: avg.toFixed(1), total: apps.length };
}