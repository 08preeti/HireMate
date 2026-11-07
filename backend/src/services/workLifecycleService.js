import mongoose from "mongoose";
import Application from "../models/Application.js";
import Worker from "../models/Worker.js";
import { HttpError } from "../utils/httpError.js";
import { ownsApplication } from "./applicationService.js";
import { notifyCompletionDecision, notifyCompletionRequested, notifyReviewReceived } from "./notificationService.js";

const entry = (event, by, at, note) => ({ event, by, at, ...(note && { note }) });
const readable = (status) => String(status).replace(/_/g, " ");

async function loadApplication(applicationId) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  return application;
}

function assertEmployer(application, employerId) {
  if (application.employer.toString() !== String(employerId)) throw new HttpError(403, "Not authorized");
}

// Worker: "my work is finished" — only asks the employer to verify; nothing is completed yet.
export async function requestCompletion(auth, applicationId) {
  const application = await loadApplication(applicationId);
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");
  if (application.status === "completed") throw new HttpError(409, "This work is already completed");
  if (application.status !== "arrived") throw new HttpError(409, application.status === "confirmed" || application.status === "on_the_way" ? "Mark yourself as arrived before requesting completion" : `Completion cannot be requested for work that is ${readable(application.status)}`);
  if (application.completionRequestedAt) throw new HttpError(409, "Completion was already requested. Waiting for the employer to verify it.");

  const now = new Date();
  const updated = await Application.findOneAndUpdate(
    { _id: application._id, status: "arrived", completionRequestedAt: null },
    { $set: { completionRequestedAt: now }, $unset: { completionRejection: "" }, $push: { timeline: entry("completion_requested", "worker", now) } },
    { new: true },
  );
  if (!updated) throw new HttpError(409, "The work status changed, please refresh");
  await notifyCompletionRequested(updated);
  return updated;
}

// Employer: verify the worker's completion request, or send it back with a reason.
export async function decideCompletion(employerId, applicationId, { decision, reason }) {
  const application = await loadApplication(applicationId);
  assertEmployer(application, employerId);

  const now = new Date();
  const filter = { _id: application._id, employer: employerId, status: "arrived", completionRequestedAt: { $ne: null } };
  const update =
    decision === "approved"
      ? { $set: { status: "completed", isCompleted: true, completedAt: now, locationConsent: false }, $unset: { liveLocation: "", locationConsentAt: "" }, $push: { timeline: entry("completed", "employer", now) } }
      : { $set: { completionRejection: { reason, at: now } }, $unset: { completionRequestedAt: "" }, $push: { timeline: entry("completion_rejected", "employer", now, reason) } };

  const updated = await Application.findOneAndUpdate(filter, update, { new: true });
  if (!updated) {
    if (application.status === "completed") throw new HttpError(409, "This work is already completed");
    throw new HttpError(409, application.status === "arrived" ? "There is no completion request to review" : `Work that is ${readable(application.status)} cannot be completed`);
  }
  await notifyCompletionDecision(updated, decision);
  return updated;
}

export async function recomputeWorkerRating(workerId) {
  if (!workerId) return;
  const [row] = await Application.aggregate([
    { $match: { worker: new mongoose.Types.ObjectId(String(workerId)), rating: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: "$rating" }, total: { $sum: 1 } } },
  ]);
  await Worker.updateOne({ _id: workerId }, { $set: { rating: row ? Math.round(row.avg * 10) / 10 : 0, totalReviews: row ? row.total : 0 } });
}

// Employer rates the worker. Only after completion, once per booking.
export async function rateApplication(employerId, applicationId, { rating, review }) {
  const application = await loadApplication(applicationId);
  assertEmployer(application, employerId);
  if (application.status !== "completed") throw new HttpError(409, "You can rate the worker only after the work is completed");
  if (application.rating) throw new HttpError(409, "You have already rated this work");

  const updated = await Application.findOneAndUpdate(
    { _id: application._id, employer: employerId, status: "completed", rating: null },
    { $set: { rating, review, ratedAt: new Date() } },
    { new: true },
  );
  if (!updated) throw new HttpError(409, "You have already rated this work");
  await recomputeWorkerRating(updated.worker);
  await notifyReviewReceived(updated, "employer");
  return updated;
}

// Worker rates the employer. Only after completion, once per booking.
export async function rateEmployer(auth, applicationId, { rating, review }) {
  const application = await loadApplication(applicationId);
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");
  if (application.status !== "completed") throw new HttpError(409, "You can rate the employer only after the work is completed");
  if (application.employerRating) throw new HttpError(409, "You have already rated this employer");

  const updated = await Application.findOneAndUpdate(
    { _id: application._id, status: "completed", employerRating: null },
    { $set: { employerRating: rating, employerReview: review, employerRatedAt: new Date() } },
    { new: true },
  );
  if (!updated) throw new HttpError(409, "You have already rated this employer");
  await notifyReviewReceived(updated, "worker");
  return updated;
}

// Ratings workers gave each employer, and how many jobs each has completed, from stored data only.
export async function getEmployerSummaries(employerIds) {
  const ids = [...new Set(employerIds.map(String))].map((id) => new mongoose.Types.ObjectId(id));
  if (!ids.length) return new Map();
  const rows = await Application.aggregate([
    { $match: { employer: { $in: ids }, status: "completed" } },
    {
      $group: {
        _id: "$employer",
        completedJobs: { $sum: 1 },
        ratingSum: { $sum: { $cond: [{ $gt: ["$employerRating", 0] }, "$employerRating", 0] } },
        ratingCount: { $sum: { $cond: [{ $gt: ["$employerRating", 0] }, 1, 0] } },
      },
    },
  ]);
  return new Map(
    rows.map((r) => [String(r._id), { completedJobs: r.completedJobs, totalReviews: r.ratingCount, rating: r.ratingCount ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : 0 }]),
  );
}
