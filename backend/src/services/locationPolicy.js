import { LOCATION_SHARING_STATUSES, STALE_AFTER_MS } from "../constants/locationRules.js";

export const isEligibleForSharing = (application) =>
  !!application && application.isCompleted !== true && LOCATION_SHARING_STATUSES.includes(application.status);

// "ended"       the work is over (or never became active): nothing may be shared or shown.
// "not_enabled" active work, but the worker has not switched sharing on.
// "active"      the worker has switched sharing on (a point may or may not have arrived yet).
export function sharingStateOf(application) {
  if (!isEligibleForSharing(application)) return "ended";
  return application.locationConsent === true ? "active" : "not_enabled";
}

export const isStale = (updatedAt, now = Date.now()) => !updatedAt || now - new Date(updatedAt).getTime() > STALE_AFTER_MS;

// What an employer may see of a worker's position: only while sharing is active.
export function visibleLocation(application) {
  if (sharingStateOf(application) !== "active") return null;
  const point = application.liveLocation;
  if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return null;
  return { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? null, updatedAt: point.updatedAt };
}
