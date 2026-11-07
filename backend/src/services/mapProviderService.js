import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

const TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 500;
const NOMINATIM_GAP_MS = 1_100;

const cache = new Map();
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
};
const cacheSet = (key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
};
export const clearMapCache = () => cache.clear();

// Nominatim's usage policy allows one request per second and requires an identifying User-Agent.
let nominatimTurn = Promise.resolve();
function nominatimSlot(gapMs) {
  const run = nominatimTurn.then(() => new Promise((resolve) => setTimeout(resolve, gapMs)));
  nominatimTurn = run.catch(() => {});
  return run;
}

const userAgent = () => `HireMate/1.0${env.maps.contactEmail ? ` (${env.maps.contactEmail})` : ""}`;

async function getJson(url, { fetchImpl = fetch, headers = {}, label }) {
  let res;
  try {
    res = await fetchImpl(url, { headers: { "User-Agent": userAgent(), Accept: "application/json", ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new HttpError(503, `${label} is not reachable right now. Please try again.`, { code: "PROVIDER_UNAVAILABLE" });
  }
  if (res.status === 429) throw new HttpError(503, `${label} is busy. Please wait a moment and try again.`, { code: "PROVIDER_BUSY" });
  if (!res.ok) throw new HttpError(503, `${label} is not available right now.`, { code: "PROVIDER_UNAVAILABLE" });
  try {
    return await res.json();
  } catch {
    throw new HttpError(502, `${label} returned an unreadable answer.`, { code: "PROVIDER_BAD_RESPONSE" });
  }
}

const unique = (parts) => [...new Set(parts.filter(Boolean))];

export function normalizePhoton(data) {
  return (data?.features ?? []).flatMap((f) => {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const parts = unique([p.name, p.housenumber, p.street, p.suburb || p.neighbourhood || p.district, p.city || p.town || p.village, p.state]);
    return Number.isFinite(lat) && Number.isFinite(lng) && parts.length ? [{ label: parts.join(", "), short: p.name || parts[0], lat, lng }] : [];
  });
}

export function normalizeNominatim(items) {
  return (Array.isArray(items) ? items : []).flatMap((item) => {
    const a = item.address ?? {};
    const parts = unique([a.road || a.pedestrian || a.footway, a.neighbourhood || a.suburb || a.quarter, a.village || a.town || a.city_district, a.city || a.county, a.state]);
    const label = parts.length > 1 ? parts.join(", ") : String(item.display_name ?? "").split(",").slice(0, 4).join(",");
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && label ? [{ label, short: parts[0] || label.split(",")[0], lat, lng }] : [];
  });
}

function dedupe(results) {
  const out = [];
  for (const r of results) {
    if (!out.some((u) => Math.abs(u.lat - r.lat) < 0.0015 && Math.abs(u.lng - r.lng) < 0.0015)) out.push(r);
  }
  return out.slice(0, 9);
}

export async function searchPlaces(query, { fetchImpl = fetch, gapMs = NOMINATIM_GAP_MS } = {}) {
  const key = `search:${query.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const photon = getJson(`${env.maps.photonUrl}/api/?q=${encodeURIComponent(query)}&limit=8&lang=en&bbox=68.1,8.0,97.4,37.6`, { fetchImpl, label: "Address search" })
    .then(normalizePhoton)
    .catch((err) => err);
  const osm = nominatimSlot(gapMs)
    .then(() => getJson(`${env.maps.nominatimUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&countrycodes=in&accept-language=en`, { fetchImpl, label: "Address search" }))
    .then(normalizeNominatim)
    .catch((err) => err);

  const [a, b] = await Promise.all([photon, osm]);
  const lists = [a, b].filter(Array.isArray);
  if (!lists.length) throw a instanceof HttpError ? a : new HttpError(503, "Address search is not available right now.", { code: "PROVIDER_UNAVAILABLE" });
  const results = dedupe(lists.flat());
  cacheSet(key, results);
  return results;
}

export async function reversePlace(lat, lng, { fetchImpl = fetch, gapMs = NOMINATIM_GAP_MS } = {}) {
  const key = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  await nominatimSlot(gapMs);
  const data = await getJson(`${env.maps.nominatimUrl}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`, { fetchImpl, label: "Address lookup" });
  if (data?.error) throw new HttpError(404, "No address could be found for that spot.", { code: "NO_ADDRESS" });
  const a = data?.address ?? {};
  const parts = unique([a.road || a.pedestrian || a.neighbourhood, a.suburb || a.quarter, a.village || a.town || a.city_district, a.city || a.county, a.state]);
  const label = parts.join(", ") || data?.display_name;
  if (!label) throw new HttpError(404, "No address could be found for that spot.", { code: "NO_ADDRESS" });
  const result = { label, postalCode: /^\d{6}$/.test(a.postcode ?? "") ? a.postcode : "", city: a.city || a.town || a.village || a.county || "", state: a.state || "" };
  cacheSet(key, result);
  return result;
}

const MODIFIER = { left: "left", right: "right", "slight left": "slightly left", "slight right": "slightly right", "sharp left": "sharp left", "sharp right": "sharp right", straight: "straight", uturn: "around (U-turn)" };

// OSRM returns structured maneuvers, not sentences; this turns them into short text instructions.
export function describeStep(step) {
  const { type, modifier } = step.maneuver ?? {};
  const road = step.name ? ` onto ${step.name}` : "";
  if (type === "depart") return `Head ${modifier ?? "out"}${step.name ? ` on ${step.name}` : ""}`;
  if (type === "arrive") return "You have reached the destination";
  if (type === "roundabout" || type === "rotary") return `Take the roundabout${road}`;
  if (type === "continue" || (type === "new name" && !modifier) || modifier === "straight") return `Continue straight${step.name ? ` on ${step.name}` : ""}`;
  if (modifier) return `Turn ${MODIFIER[modifier] ?? modifier}${road}`;
  return step.name ? `Continue on ${step.name}` : "Continue";
}

export function parseOsrmRoute(data) {
  if (!data || data.code === "NoRoute" || !data.routes?.length) throw new HttpError(404, "No driving route was found between these points.", { code: "NO_ROUTE" });
  if (data.code !== "Ok") throw new HttpError(502, "The routing service could not calculate a route.", { code: "PROVIDER_BAD_RESPONSE" });
  const route = data.routes[0];
  return {
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    coordinates: (route.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng]),
    steps: (route.legs?.[0]?.steps ?? []).map(describeStep).slice(0, 60),
  };
}

export async function calculateRoute(from, to, { fetchImpl = fetch } = {}) {
  const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}`;
  const key = `route:${coords}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const data = await getJson(`${env.maps.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`, { fetchImpl, label: "The routing service" });
  const route = parseOsrmRoute(data);
  cacheSet(key, route);
  return route;
}
