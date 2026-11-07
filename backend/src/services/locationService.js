import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { HttpError } from "../utils/httpError.js";
import { isValidCoordinate } from "../utils/geo.js";
import { ownsApplication } from "./applicationService.js";
import { calculateRoute } from "./mapProviderService.js";
import { isEligibleForSharing, isStale, sharingStateOf, visibleLocation } from "./locationPolicy.js";
import { EXPIRE_AFTER_MS, LOCATION_SHARING_STATUSES, MIN_UPDATE_INTERVAL_MS } from "../constants/locationRules.js";

async function loadApplication(applicationId) {
  if (!mongoose.isValidObjectId(applicationId)) throw new HttpError(400, "Invalid application id");
  const application = await Application.findById(applicationId);
  if (!application) throw new HttpError(404, "Not found");
  return application;
}

const destinationOf = (job) => (job && isValidCoordinate(job.latitude, job.longitude) ? { lat: job.latitude, lng: job.longitude } : null);

// Worker: store the latest GPS fix for ONE of their own applications, only while they have switched sharing on.
export async function updateLiveLocation(auth, applicationId, point, now = Date.now()) {
  const application = await loadApplication(applicationId);
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");
  if (!isEligibleForSharing(application)) throw new HttpError(409, "Location can only be shared for confirmed, active work", { code: "NOT_ELIGIBLE" });
  if (application.locationConsent !== true) throw new HttpError(403, "Location sharing is not turned on for this job", { code: "NO_CONSENT" });

  const last = application.liveLocation?.updatedAt;
  if (last && now - new Date(last).getTime() < MIN_UPDATE_INTERVAL_MS) throw new HttpError(429, "Location updates are too frequent", { code: "TOO_FREQUENT" });

  const at = new Date(now);
  // Atomic: consent and status must still hold at the moment the point is written.
  const updated = await Application.findOneAndUpdate(
    { _id: application._id, locationConsent: true, isCompleted: false, status: { $in: LOCATION_SHARING_STATUSES } },
    { $set: { liveLocation: { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? undefined, recordedAt: point.recordedAt, updatedAt: at } } },
    { new: true, projection: "_id" },
  );
  if (!updated) throw new HttpError(409, "Location sharing has ended for this job", { code: "NOT_ELIGIBLE" });
  return { updatedAt: at };
}

// Employer: the latest position of a worker on one of THEIR OWN applications, only while the worker is sharing.
export async function getTrackedLocation(employerId, applicationId, now = Date.now()) {
  const application = await loadApplication(applicationId);
  if (application.employer.toString() !== String(employerId)) throw new HttpError(403, "Not authorized");

  const job = await Job.findById(application.job).select("latitude longitude employer");
  if (job && job.employer.toString() !== String(employerId)) throw new HttpError(403, "Not authorized");

  const location = visibleLocation(application);
  return {
    applicationId: String(application._id),
    serverTime: new Date(now).toISOString(),
    status: application.status,
    completionRequested: application.status === "arrived" && !!application.completionRequestedAt,
    sharing: sharingStateOf(application),
    location,
    stale: location ? isStale(location.updatedAt, now) : false,
    destination: destinationOf(job),
  };
}

// Worker: driving route from where they are to the job's stored destination. The destination always comes
// from the database; the client only supplies its own current position.
export async function getRouteToJob(auth, applicationId, from) {
  const application = await loadApplication(applicationId);
  if (!ownsApplication(auth, application)) throw new HttpError(403, "Not authorized");
  if (!isEligibleForSharing(application)) throw new HttpError(409, "Navigation is available for confirmed, active work", { code: "NOT_ELIGIBLE" });
  const job = await Job.findById(application.job).select("latitude longitude");
  const destination = destinationOf(job);
  if (!destination) throw new HttpError(404, "This job has no map location", { code: "NO_DESTINATION" });
  return { destination, ...(await calculateRoute(from, destination)) };
}

// Safety net: drop positions that outlived their work, and let abandoned consent lapse.
export async function purgeExpiredLocations(now = Date.now()) {
  const cutoff = new Date(now - EXPIRE_AFTER_MS);
  const ended = await Application.updateMany(
    { liveLocation: { $exists: true }, $or: [{ isCompleted: true }, { status: { $nin: LOCATION_SHARING_STATUSES } }] },
    { $unset: { liveLocation: "" } },
  );
  const lapsed = await Application.updateMany(
    { locationConsent: true, $or: [{ "liveLocation.updatedAt": { $lt: cutoff } }, { liveLocation: { $exists: false }, locationConsentAt: { $lt: cutoff } }] },
    { $set: { locationConsent: false }, $unset: { liveLocation: "", locationConsentAt: "" } },
  );
  return { endedCleared: ended.modifiedCount, consentLapsed: lapsed.modifiedCount };
}

export function startLocationCleanup(intervalMs = 30 * 60_000) {
  const run = () => purgeExpiredLocations().catch((err) => console.error("[location] cleanup failed:", err.message));
  run();
  return setInterval(run, intervalMs).unref();
}
