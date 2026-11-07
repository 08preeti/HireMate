import { HttpError } from "../utils/httpError.js";
import { isValidCoordinate } from "../utils/geo.js";
import { MAX_ACCURACY_M, MAX_FIX_AGE_MS, MAX_FUTURE_SKEW_MS } from "../constants/locationRules.js";

const toNumber = (v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);

export function parseCoordinates(source = {}, latKey = "lat", lngKey = "lng") {
  const lat = toNumber(source[latKey]);
  const lng = toNumber(source[lngKey]);
  if (!isValidCoordinate(lat, lng)) throw new HttpError(400, "Valid latitude and longitude are required", { code: "INVALID_COORDINATES" });
  return { lat, lng };
}

// A worker's GPS fix. Everything is checked here; the client is never trusted for who or which application.
export function parseLocationUpdate(body = {}, now = Date.now()) {
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    throw new HttpError(400, "lat and lng must be numbers", { code: "INVALID_COORDINATES" });
  }
  const { lat, lng } = parseCoordinates(body);

  let accuracy = null;
  if (body.accuracy !== undefined && body.accuracy !== null) {
    if (typeof body.accuracy !== "number" || !Number.isFinite(body.accuracy) || body.accuracy < 0) {
      throw new HttpError(400, "accuracy must be a positive number of metres", { code: "INVALID_ACCURACY" });
    }
    if (body.accuracy > MAX_ACCURACY_M) {
      throw new HttpError(422, "GPS signal is too weak to share a useful location", { code: "LOW_ACCURACY" });
    }
    accuracy = Math.round(body.accuracy);
  }

  let recordedAt = new Date(now);
  if (body.recordedAt !== undefined && body.recordedAt !== null) {
    const t = typeof body.recordedAt === "number" ? body.recordedAt : Date.parse(body.recordedAt);
    if (!Number.isFinite(t)) throw new HttpError(400, "recordedAt is not a valid time", { code: "INVALID_TIMESTAMP" });
    if (t > now + MAX_FUTURE_SKEW_MS) throw new HttpError(400, "recordedAt is in the future", { code: "INVALID_TIMESTAMP" });
    if (t < now - MAX_FIX_AGE_MS) throw new HttpError(422, "That GPS reading is too old", { code: "STALE_FIX" });
    recordedAt = new Date(t);
  }
  return { lat, lng, accuracy, recordedAt };
}

export function parseSearchQuery(q) {
  const text = typeof q === "string" ? q.trim() : "";
  if (text.length < 3) throw new HttpError(400, "Type at least 3 characters to search", { code: "QUERY_TOO_SHORT" });
  if (text.length > 200) throw new HttpError(400, "Search text is too long", { code: "QUERY_TOO_LONG" });
  return text;
}
