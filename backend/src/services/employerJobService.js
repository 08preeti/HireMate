import mongoose from "mongoose";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Notification from "../models/Notification.js";
import { HttpError } from "../utils/httpError.js";
import { parseJobInput } from "../validators/jobValidators.js";
import {
  CONFIRMED_WORKER_STATUSES,
  LIVE_APPLICANT_STATUSES,
  TRANSITIONS,
  buildStats,
  changedFields,
  composeDescription,
  criticalChanges,
  emptyStats,
  filledOf,
  jobActions,
  meaningfulChanges,
  notifyLabels,
  vacanciesOf,
  FIELD_LABELS,
} from "../constants/jobRules.js";
import { ensureCounter, fillIfFull, hasFreeVacancy, healJobStatus, withVacancyCounts } from "./vacancyService.js";
import { notifyJobClosed, notifyJobUpdated } from "./notificationService.js";

const everyLanguage = (value) => ({ en: value, hi: value, mr: value });
const entry = (event, by) => ({ event, by, at: new Date() });
const toId = (id) => new mongoose.Types.ObjectId(String(id));

function assertValidId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid job id");
}

// The authenticated employer's own job. Unknown id -> 404, someone else's job -> 403.
async function loadOwnedJob(employerId, jobId) {
  assertValidId(jobId);
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, "Job not found");
  if (job.employer.toString() !== String(employerId)) throw new HttpError(403, "Not authorized");
  return job;
}

async function statsByJob(employerId, jobIds) {
  if (!jobIds.length) return new Map();
  const rows = await Application.aggregate([
    { $match: { employer: toId(employerId), job: { $in: jobIds.map(toId) } } },
    { $group: { _id: { job: "$job", status: "$status" }, n: { $sum: 1 } } },
  ]);
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row._id.job);
    if (!grouped.has(key)) grouped.set(key, {});
    grouped.get(key)[row._id.status] = row.n;
  }
  return new Map(jobIds.map((id) => [String(id), buildStats(grouped.get(String(id)))]));
}

// A job's vacancies as the enforcement code sees them (filledPositions counter), plus the application breakdown.
function shape(job, stats = emptyStats()) {
  const counted = withVacancyCounts(job);
  return {
    ...counted,
    applicationCount: stats.total,
    stats: {
      ...stats,
      totalVacancies: counted.vacancies,
      filledVacancies: counted.filledPositions,
      availableVacancies: counted.availablePositions,
    },
    actions: jobActions(counted, stats),
  };
}

export function summarize(jobs) {
  const summary = {
    totalJobs: jobs.length,
    activeJobs: 0,
    filledJobs: 0,
    closedJobs: 0,
    completedJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    confirmedWorkers: 0,
    reservedVacancies: 0,
    totalVacancies: 0,
    availableVacancies: 0,
  };
  for (const job of jobs) {
    summary[`${job.status}Jobs`] += 1;
    summary.totalApplications += job.stats.total;
    summary.pendingApplications += job.stats.pending;
    summary.confirmedWorkers += job.stats.confirmedWorkers;
    summary.reservedVacancies += job.stats.reserved;
    if (job.status === "active") {
      summary.totalVacancies += job.stats.totalVacancies;
      summary.availableVacancies += job.stats.availableVacancies;
    }
  }
  return summary;
}

export async function listEmployerJobs(employerId) {
  const docs = await Job.find({ employer: employerId }).sort({ createdAt: -1 });
  await Promise.all(docs.filter((j) => j.status === "filled").map((j) => healJobStatus(j._id)));
  const fresh = await Job.find({ employer: employerId }).sort({ createdAt: -1 });
  const stats = await statsByJob(employerId, fresh.map((j) => j._id));
  const jobs = fresh.map((j) => shape(j, stats.get(String(j._id))));
  return { jobs, summary: summarize(jobs) };
}

export async function getEmployerJob(employerId, jobId) {
  await loadOwnedJob(employerId, jobId);
  await healJobStatus(jobId);
  const job = await Job.findById(jobId);
  const stats = (await statsByJob(employerId, [job._id])).get(String(job._id));
  const hired = await Application.find({ job: job._id, employer: employerId, status: { $in: CONFIRMED_WORKER_STATUSES } })
    .sort({ updatedAt: -1 })
    .populate("worker", "name phone skills location rating totalReviews")
    .lean();
  return {
    ...shape(job, stats),
    confirmedWorkerList: hired.map((a) => ({
      applicationId: a._id,
      name: a.worker?.name || a.applicantName || "",
      phone: a.worker?.phone || a.applicantContact || "",
      status: a.status,
      rating: a.rating ?? null,
      confirmedAt: a.timeline?.find((t) => t.event === "confirmed")?.at ?? null,
    })),
  };
}

// ── Pending applications when a job stops taking applicants ─────────────────
async function pendingAndOffers(job) {
  const [pending, offers] = await Promise.all([
    Application.find({ job: job._id, status: "pending" }).select("worker applicantContact").lean(),
    Application.find({ job: job._id, status: "accepted" }).select("worker applicantContact").lean(),
  ]);
  return { pending, offers };
}

// Declines pending applications one by one with a compare-and-set on "pending", so an application the
// employer accepted a moment ago is never overwritten.
async function declinePending(job) {
  const declined = [];
  const pending = await Application.find({ job: job._id, status: "pending" }).select("worker applicantContact").lean();
  for (const app of pending) {
    const done = await Application.findOneAndUpdate(
      { _id: app._id, status: "pending" },
      { $set: { status: "declined" }, $push: { timeline: entry("declined", "employer") } },
      { new: true },
    );
    if (done) declined.push(done);
  }
  return declined;
}

async function settleApplicants(job, kind, shouldDecline) {
  const found = await pendingAndOffers(job);
  const offers = kind === "closed" ? found.offers : [];
  let pending = [];
  if (shouldDecline) pending = await declinePending(job);
  else if (kind === "closed") pending = found.pending;
  await notifyJobClosed(job, { kind, pending, offers, declinedPending: shouldDecline });
  return { declined: shouldDecline ? pending.length : 0 };
}

// ── Edit ────────────────────────────────────────────────────────────────────
export async function updateEmployerJob(employerId, jobId, body) {
  const job = await loadOwnedJob(employerId, jobId);
  if (job.status === "completed") throw new HttpError(409, "A completed job cannot be edited");

  const patch = parseJobInput(body, { partial: true });
  const plainDescription = job.summary === undefined && patch.summary === undefined ? patch.description : undefined;
  delete patch.description;

  await ensureCounter(job._id);
  const current = await Job.findById(job._id);
  const changed = changedFields(current.toObject(), patch).filter((f) => f !== "description");
  const descriptionChanged = plainDescription !== undefined && plainDescription !== (current.description?.en ?? "");
  if (!changed.length && !descriptionChanged) {
    return getEmployerJob(employerId, jobId);
  }

  const held = filledOf(current);
  const meaningful = meaningfulChanges(current.toObject(), changed);
  const locked = criticalChanges(meaningful);
  if (held > 0 && locked.length) {
    const names = [...new Set(locked.map((f) => FIELD_LABELS[f]))].join(", ");
    throw new HttpError(409, `${held} worker${held > 1 ? "s hold" : " holds"} a position on this job, so these details cannot be changed: ${names}. Close this job and post a new one instead.`, { lockedFields: locked });
  }
  if (patch.vacancies !== undefined && patch.vacancies < held) {
    throw new HttpError(409, `${held} worker${held > 1 ? "s are" : " is"} already accepted or confirmed. Workers required cannot be lower than ${held}.`, { field: "vacancies", minVacancies: held });
  }

  const merged = { ...current.toObject(), ...patch, jobTitle: patch.jobTitle ?? current.jobTitle?.en, location: patch.location ?? current.location?.en, skills: patch.skills ?? current.skills?.en };
  const set = { ...patch };
  delete set.description;
  if (patch.jobTitle !== undefined) set.jobTitle = everyLanguage(patch.jobTitle);
  if (patch.location !== undefined) set.location = everyLanguage(patch.location);
  if (patch.skills !== undefined) set.skills = everyLanguage(patch.skills);

  const summaryMode = current.summary !== undefined || patch.summary !== undefined;
  if (summaryMode) {
    merged.summary = patch.summary ?? current.summary ?? "";
    set.summary = merged.summary;
    set.description = everyLanguage(composeDescription({ ...merged, jobTitle: merged.jobTitle, vacancies: patch.vacancies ?? vacanciesOf(current) }));
  } else if (plainDescription !== undefined) {
    set.description = everyLanguage(plainDescription);
  }

  const guards = [{ $lte: [{ $ifNull: ["$filledPositions", 0] }, patch.vacancies ?? Number.MAX_SAFE_INTEGER] }];
  const filter = { _id: job._id, employer: employerId, status: { $ne: "completed" }, $expr: { $and: guards } };
  if (locked.length) filter.filledPositions = 0;

  const updated = await Job.findOneAndUpdate(filter, { $set: set, $inc: { revision: 1 } }, { new: true });
  if (!updated) {
    const now = await Job.findById(job._id).select("status filledPositions");
    if (!now) throw new HttpError(404, "Job not found");
    if (now.status === "completed") throw new HttpError(409, "A completed job cannot be edited");
    throw new HttpError(409, "A worker was accepted while you were editing, so some changes can no longer be saved. Reload the job and try again.");
  }

  await healJobStatus(updated._id);
  await fillIfFull(updated._id);

  const labels = notifyLabels(meaningful);
  if (labels.length) {
    const audience = await Application.find({ job: updated._id, status: { $in: LIVE_APPLICANT_STATUSES } }).select("worker applicantContact status").lean();
    await notifyJobUpdated(updated, labels, audience);
  }
  return getEmployerJob(employerId, jobId);
}

// ── Status changes ──────────────────────────────────────────────────────────
export async function closeEmployerJob(employerId, jobId, { declinePending: decline = false } = {}) {
  const job = await loadOwnedJob(employerId, jobId);
  if (job.status === "closed") throw new HttpError(409, "This job is already closed");
  if (job.status === "completed") throw new HttpError(409, "A completed job cannot be closed");

  const closed = await Job.findOneAndUpdate(
    { _id: job._id, employer: employerId, status: { $in: TRANSITIONS.close } },
    { $set: { status: "closed", closedAt: new Date() } },
    { new: true },
  );
  if (!closed) throw new HttpError(409, "The job status changed, please refresh");

  const { declined } = await settleApplicants(closed, "closed", decline === true);
  return { job: await getEmployerJob(employerId, jobId), declined };
}

export async function reopenEmployerJob(employerId, jobId) {
  const job = await loadOwnedJob(employerId, jobId);
  if (job.status === "completed") throw new HttpError(409, "A completed job cannot be reopened");
  if (job.status === "active") throw new HttpError(409, "This job is already open");
  await ensureCounter(job._id);

  const reopened = await Job.findOneAndUpdate(
    { _id: job._id, employer: employerId, status: { $in: TRANSITIONS.reopen }, $expr: hasFreeVacancy },
    { $set: { status: "active" }, $unset: { closedAt: "" } },
    { new: true },
  );
  if (!reopened) {
    const now = await Job.findById(job._id);
    if (now && now.status === "completed") throw new HttpError(409, "A completed job cannot be reopened");
    throw new HttpError(409, "All vacancies are filled. Increase the number of workers required before reopening this job.");
  }
  return getEmployerJob(employerId, jobId);
}

export async function fillEmployerJob(employerId, jobId, { declinePending: decline = false } = {}) {
  const job = await loadOwnedJob(employerId, jobId);
  if (job.status !== "active") throw new HttpError(409, job.status === "filled" ? "This job is already filled" : `A ${job.status} job cannot be marked as filled`);
  await ensureCounter(job._id);

  // One atomic update: the total becomes exactly the number of workers holding a position, so counts stay consistent.
  const filled = await Job.findOneAndUpdate(
    { _id: job._id, employer: employerId, status: "active", filledPositions: { $gte: 1 }, $expr: hasFreeVacancy },
    [{ $set: { vacancies: "$filledPositions", status: "filled", revision: { $add: [{ $ifNull: ["$revision", 0] }, 1] } } }],
    { new: true },
  );
  if (!filled) throw new HttpError(409, "A job can be marked as filled only after at least one worker has been accepted and while positions are still open");

  const { declined } = await settleApplicants({ ...filled.toObject(), closedAt: new Date() }, "filled", decline === true);
  return { job: await getEmployerJob(employerId, jobId), declined };
}

export async function completeEmployerJob(employerId, jobId) {
  const job = await loadOwnedJob(employerId, jobId);
  if (job.status === "completed") throw new HttpError(409, "This job is already completed");
  await ensureCounter(job._id);

  const stats = (await statsByJob(employerId, [job._id])).get(String(job._id));
  if (stats.reserved + stats.confirmed + stats.inProgress > 0) {
    throw new HttpError(409, "Some workers have not finished yet. Complete or cancel their work before completing this job.");
  }
  if (stats.completed < 1) throw new HttpError(409, "A job can be completed only after at least one worker has completed the work");

  const done = await Job.findOneAndUpdate(
    { _id: job._id, employer: employerId, status: { $in: TRANSITIONS.complete }, filledPositions: { $lte: stats.completed } },
    { $set: { status: "completed", completedAt: new Date() } },
    { new: true },
  );
  if (!done) throw new HttpError(409, "The job changed while completing it. Please refresh and try again.");

  const { declined } = await settleApplicants(done, "completed", true);
  return { job: await getEmployerJob(employerId, jobId), declined };
}

export async function deleteEmployerJob(employerId, jobId) {
  const job = await loadOwnedJob(employerId, jobId);
  if (await Application.exists({ job: job._id })) {
    throw new HttpError(409, "This job has applications and cannot be deleted. Close it instead.");
  }
  const removed = await Job.deleteOne({ _id: job._id, employer: employerId });
  if (!removed.deletedCount) throw new HttpError(404, "Job not found");
  await Notification.deleteMany({ job: job._id });
  return { success: true };
}
