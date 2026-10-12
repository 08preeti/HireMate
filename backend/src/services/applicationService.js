import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Worker from "../models/Worker.js";
import { HttpError } from "../utils/httpError.js";

// ── Employer side ───────────────────────────────────────────────────────────
export async function rateApplication(employerId, applicationId, { rating, review }) {
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  if (application.employer.toString() !== employerId) throw new HttpError(403, "Not authorized");

  application.rating = Number(rating);
  application.review = review;
  application.isCompleted = true;
  await application.save();
}

export function listEmployerApplications(employerId) {
  return Application.find({ employer: employerId }).populate("job");
}

// Active (not completed) applications with the worker's live GPS location.
export function listLiveApplications(employerId) {
  return Application.find({ employer: employerId, isCompleted: false })
    .populate("job")
    .populate("worker", "name phone currentLocation skills");
}

// ── Worker side ─────────────────────────────────────────────────────────────
export async function applyToJob(workerId, jobId, { applicantName, message }) {
  const worker = await Worker.findById(workerId);
  if (!worker) throw new HttpError(401, "Account not found");

  // Identity comes from the authenticated worker; the body is only a fallback for the display name.
  const name = applicantName || worker.name;
  const contact = worker.phone;
  if (!name || !contact) throw new HttpError(400, "Name and contact required");

  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, "Job not found");

  const existing = await Application.findOne({
    job: job._id,
    $or: [{ worker: worker._id }, { applicantContact: contact }],
  });
  if (existing) throw new HttpError(400, "Already applied");

  return Application.create({
    job: job._id,
    employer: job.employer,
    worker: worker._id,
    applicantName: name,
    applicantContact: contact,
    message,
  });
}

// Worker moves through: accepted → on_the_way → arrived → completed
export async function updateApplicationStatus(auth, applicationId, status) {
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");

  const ownsIt =
    (application.worker && application.worker.toString() === auth.id) ||
    (auth.phone && application.applicantContact === auth.phone);
  if (!ownsIt) throw new HttpError(403, "Not authorized");

  application.status = status;
  if (status === "completed") application.isCompleted = true;
  await application.save();
}

export async function getRatingByName(name) {
  const apps = await Application.find({ applicantName: name, isCompleted: true });
  if (!apps.length) return { rating: 0, total: 0 };
  const avg = apps.reduce((sum, a) => sum + (a.rating || 0), 0) / apps.length;
  return { rating: avg.toFixed(1), total: apps.length };
}
