import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { matchLocalNashikPlaces } from "../constants/nashikLocations.js";

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
  const run = nominatimTurn.then(
    () => new Promise((resolve) => setTimeout(resolve, gapMs)),
  );
  nominatimTurn = run.catch(() => {});
  return run;
}

const userAgent = () =>
  `HireMate/1.0${env.maps.contactEmail ? ` (${env.maps.contactEmail})` : ""}`;

async function getJson(url, { fetchImpl = fetch, headers = {}, label }) {
  let res;
  try {
    res = await fetchImpl(url, {
      headers: {
        "User-Agent": userAgent(),
        Accept: "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(
      503,
      `${label} is not reachable right now. Please try again.`,
      { code: "PROVIDER_UNAVAILABLE" },
    );
  }
  if (res.status === 429)
    throw new HttpError(
      503,
      `${label} is busy. Please wait a moment and try again.`,
      { code: "PROVIDER_BUSY" },
    );
  if (!res.ok)
    throw new HttpError(503, `${label} is not available right now.`, {
      code: "PROVIDER_UNAVAILABLE",
    });
  try {
    return await res.json();
  } catch {
    throw new HttpError(502, `${label} returned an unreadable answer.`, {
      code: "PROVIDER_BAD_RESPONSE",
    });
  }
}

const unique = (parts) => [...new Set(parts.filter(Boolean))];

export function normalizePhoton(data) {
  return (data?.features ?? []).flatMap((f) => {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const parts = unique([
      p.name,
      street,
      p.suburb || p.neighbourhood || p.district,
      p.city || p.town || p.village,
      p.state,
    ]);
    return Number.isFinite(lat) && Number.isFinite(lng) && parts.length
      ? [{ label: parts.join(", "), short: p.name || parts[0], lat, lng }]
      : [];
  });
}

export function normalizeGeoapify(data) {
  return (data?.features ?? []).flatMap((f) => {
    const p = f.properties ?? {};
    const lat = Number(p.lat ?? f.geometry?.coordinates?.[1]);
    const lng = Number(p.lon ?? f.geometry?.coordinates?.[0]);
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const parts = unique([
      p.name,
      street,
      p.suburb || p.neighbourhood || p.district,
      p.city || p.town || p.village || p.county,
      p.state,
    ]);
    const label = parts.length
      ? parts.join(", ")
      : String(p.formatted ?? "")
          .split(",")
          .slice(0, 4)
          .join(",");
    return Number.isFinite(lat) && Number.isFinite(lng) && label
      ? [
          {
            label,
            short: p.name || parts[0] || label.split(",")[0],
            lat,
            lng,
            source: "geoapify",
          },
        ]
      : [];
  });
}

export function normalizeNominatim(items) {
  return (Array.isArray(items) ? items : []).flatMap((item) => {
    const a = item.address ?? {};
    // Keep the place's own name (hospital, shop, hotel...) so it matches what the employer typed.
    const placeName = item.name || item.namedetails?.name || "";
    const parts = unique([
      placeName,
      a.road || a.pedestrian || a.footway,
      a.neighbourhood || a.suburb || a.quarter,
      a.village || a.town || a.city_district,
      a.city || a.county,
      a.state,
    ]);
    const label =
      parts.length > 1
        ? parts.join(", ")
        : String(item.display_name ?? "")
            .split(",")
            .slice(0, 4)
            .join(",");
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && label
      ? [{ label, short: parts[0] || label.split(",")[0], lat, lng }]
      : [];
  });
}

const norm = (t) =>
  String(t ?? "")
    .toLowerCase()
    .trim();

function metersBetween(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Two rows are the same place when they sit on top of each other, or are close AND share a name.
// (The old rule dropped anything within ~150 m, which hid different hospitals/shops on the same road.)
function samePlace(a, b) {
  const d = metersBetween(a, b);
  if (d < 25) return true;
  if (d > 250) return false;
  const na = norm(a.short);
  const nb = norm(b.short);
  return !!na && !!nb && (na === nb || na.includes(nb) || nb.includes(na));
}

function dedupe(results, limit) {
  const out = [];
  for (const r of results) if (!out.some((u) => samePlace(u, r))) out.push(r);
  return out.slice(0, limit);
}

// Google-style ordering: places containing every typed word first, then nearest to the map, then provider order.
function rank(results, query, bias) {
  const tokens = norm(query)
    .split(/[\s,]+/)
    .filter(Boolean);
  const scored = results.map((r, i) => {
    const hay = norm(r.label);
    const hits = tokens.filter((t) => hay.includes(t)).length;
    const full = hits === tokens.length ? 0 : 1;
    const startsWith = norm(r.short).startsWith(tokens[0] ?? "") ? 0 : 1;
    const dist = bias ? metersBetween(bias, r) : 0;
    return { r, i, full, startsWith, band: Math.floor(dist / 15000), hits };
  });
  scored.sort(
    (x, y) =>
      x.full - y.full ||
      x.band - y.band ||
      x.startsWith - y.startsWith ||
      y.hits - x.hits ||
      x.i - y.i,
  );
  return scored.map((x) => x.r);
}

const SEARCH_LIMIT = 10;
const OSM_WAIT_MS = 3_000;
const TIMED_OUT = Symbol("timed-out");

export async function searchPlaces(
  query,
  { lat, lng, fetchImpl = fetch, gapMs = NOMINATIM_GAP_MS } = {},
) {
  const bias =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const key = `search:${query.toLowerCase()}:${bias ? `${bias.lat.toFixed(1)},${bias.lng.toFixed(1)}` : "-"}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // 1. Check local Nashik places dictionary first (handles abbreviations like CCM, ABB Circle, Untwadi Rd, etc.)
  const localNashikMatches = fetchImpl === fetch ? matchLocalNashikPlaces(query) : [];

  // Photon is built for type-ahead and handles half-typed words; bias it toward where the employer is looking.
  const biasParams = bias
    ? `&lat=${bias.lat.toFixed(5)}&lon=${bias.lng.toFixed(5)}&location_bias_scale=0.4`
    : "";
  const photon = getJson(
    `${env.maps.photonUrl}/api/?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}&lang=en&bbox=68.1,8.0,97.4,37.6${biasParams}`,
    { fetchImpl, label: "Address search" },
  )
    .then(normalizePhoton)
    .catch((err) => err);

  // Nominatim is slower (1 request/second policy), so it only gets a short window to add extra matches.
  const viewbox = bias
    ? `&viewbox=${(bias.lng - 0.6).toFixed(4)},${(bias.lat + 0.6).toFixed(4)},${(bias.lng + 0.6).toFixed(4)},${(bias.lat - 0.6).toFixed(4)}`
    : "";
  const osmRequest = nominatimSlot(gapMs)
    .then(() =>
      getJson(
        `${env.maps.nominatimUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=${SEARCH_LIMIT}&addressdetails=1&namedetails=1&countrycodes=in&accept-language=en${viewbox}`,
        { fetchImpl, label: "Address search" },
      ),
    )
    .then(normalizeNominatim)
    .catch((err) => err);
  let timer;
  const osm = Promise.race([
    osmRequest,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), OSM_WAIT_MS);
    }),
  ]).finally(() => clearTimeout(timer));

  // Optional third source: Geoapify (free key). Strong type-ahead, and it understands "near me" bias.
  const geoapify = env.maps.geoapifyKey
    ? Promise.race([
        getJson(
          `${env.maps.geoapifyUrl}/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&format=geojson&limit=${SEARCH_LIMIT}&lang=en&filter=countrycode:in${bias ? `&bias=proximity:${bias.lng.toFixed(5)},${bias.lat.toFixed(5)}` : ""}&apiKey=${env.maps.geoapifyKey}`,
          { fetchImpl, label: "Address search" },
        )
          .then(normalizeGeoapify)
          .catch((err) => err),
        new Promise((resolve) => {
          const t = setTimeout(() => resolve(TIMED_OUT), OSM_WAIT_MS);
          t.unref?.();
        }),
      ])
    : Promise.resolve(null);

  const [a, b, g] = await Promise.all([photon, osm, geoapify]);
  const osmLate = b === TIMED_OUT || g === TIMED_OUT;
  // Geoapify first so it wins ties; Photon and Nominatim fill in what it misses.
  const lists = [g, a, b].filter(Array.isArray);

  // Compound address fallback: e.g. "Murli Apartment, Sambhaji Chowk, Untwadi Rd, Nashik"
  // If external search returned nothing and the query has comma parts, search for the area/street
  let fallbackMatches = [];
  if (lists.flat().length === 0 && query.includes(",")) {
    const parts = query.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const subQuery = parts.slice(1).join(", ");
      try {
        const subData = await getJson(
          `${env.maps.photonUrl}/api/?q=${encodeURIComponent(subQuery)}&limit=3&lang=en&bbox=68.1,8.0,97.4,37.6${biasParams}`,
          { fetchImpl, label: "Address search fallback" },
        );
        const normalized = normalizePhoton(subData);
        fallbackMatches = normalized.map((item) => ({
          ...item,
          label: `${parts[0]}, ${item.label}`,
        }));
      } catch {}
    }
  }

  const allFound = [...localNashikMatches, ...lists.flat(), ...fallbackMatches];

  if (!allFound.length) {
    if (lists.length === 0 && localNashikMatches.length === 0) {
      throw a instanceof HttpError
        ? a
        : new HttpError(503, "Address search is not available right now.", {
            code: "PROVIDER_UNAVAILABLE",
          });
    }
    return [];
  }

  const results = dedupe(rank(allFound, query, bias), SEARCH_LIMIT);
  if (!osmLate) cacheSet(key, results);
  return results;
}

export async function reversePlace(
  lat,
  lng,
  { fetchImpl = fetch, gapMs = NOMINATIM_GAP_MS } = {},
) {
  const key = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  await nominatimSlot(gapMs);
  const data = await getJson(
    `${env.maps.nominatimUrl}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
    { fetchImpl, label: "Address lookup" },
  );
  if (data?.error)
    throw new HttpError(404, "No address could be found for that spot.", {
      code: "NO_ADDRESS",
    });
  const a = data?.address ?? {};
  const parts = unique([
    a.road || a.pedestrian || a.neighbourhood,
    a.suburb || a.quarter,
    a.village || a.town || a.city_district,
    a.city || a.county,
    a.state,
  ]);
  const label = parts.join(", ") || data?.display_name;
  if (!label)
    throw new HttpError(404, "No address could be found for that spot.", {
      code: "NO_ADDRESS",
    });
  const result = {
    label,
    postalCode: /^\d{6}$/.test(a.postcode ?? "") ? a.postcode : "",
    city: a.city || a.town || a.village || a.county || "",
    state: a.state || "",
  };
  cacheSet(key, result);
  return result;
}

const MODIFIER = {
  left: "left",
  right: "right",
  "slight left": "slightly left",
  "slight right": "slightly right",
  "sharp left": "sharp left",
  "sharp right": "sharp right",
  straight: "straight",
  uturn: "around (U-turn)",
};

// OSRM returns structured maneuvers, not sentences; this turns them into short text instructions.
export function describeStep(step) {
  const { type, modifier } = step.maneuver ?? {};
  const road = step.name ? ` onto ${step.name}` : "";
  if (type === "depart")
    return `Head ${modifier ?? "out"}${step.name ? ` on ${step.name}` : ""}`;
  if (type === "arrive") return "You have reached the destination";
  if (type === "roundabout" || type === "rotary")
    return `Take the roundabout${road}`;
  if (
    type === "continue" ||
    (type === "new name" && !modifier) ||
    modifier === "straight"
  )
    return `Continue straight${step.name ? ` on ${step.name}` : ""}`;
  if (modifier) return `Turn ${MODIFIER[modifier] ?? modifier}${road}`;
  return step.name ? `Continue on ${step.name}` : "Continue";
}

export function parseOsrmRoute(data) {
  if (!data || data.code === "NoRoute" || !data.routes?.length)
    throw new HttpError(
      404,
      "No driving route was found between these points.",
      { code: "NO_ROUTE" },
    );
  if (data.code !== "Ok")
    throw new HttpError(
      502,
      "The routing service could not calculate a route.",
      { code: "PROVIDER_BAD_RESPONSE" },
    );
  const route = data.routes[0];
  return {
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    coordinates: (route.geometry?.coordinates ?? []).map(([lng, lat]) => [
      lat,
      lng,
    ]),
    steps: (route.legs?.[0]?.steps ?? []).map(describeStep).slice(0, 60),
    detailedSteps: (route.legs?.[0]?.steps ?? []).slice(0, 60).map((s) => ({
      instruction: describeStep(s),
      type: s.maneuver?.type || "turn",
      modifier: s.maneuver?.modifier || "straight",
      distanceMeters: Math.round(s.distance || 0),
      durationSeconds: Math.round(s.duration || 0),
      streetName: s.name || "",
      location: s.maneuver?.location
        ? [s.maneuver.location[1], s.maneuver.location[0]]
        : null,
    })),
    // [lat, lng] of each maneuver, same order as `steps`, so a client can tell which step is still ahead.
    stepLocations: (route.legs?.[0]?.steps ?? [])
      .slice(0, 60)
      .map((s) =>
        s.maneuver?.location
          ? [s.maneuver.location[1], s.maneuver.location[0]]
          : null,
      ),
  };
}

export async function calculateRoute(from, to, { fetchImpl = fetch } = {}) {
  const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}`;
  const key = `route:${coords}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const data = await getJson(
    `${env.maps.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`,
    { fetchImpl, label: "The routing service" },
  );
  const route = parseOsrmRoute(data);
  cacheSet(key, route);
  return route;
}
