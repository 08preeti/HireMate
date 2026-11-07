import test from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI ||= "mongodb://localhost/unused";
process.env.JWT_SECRET ||= "test-secret";

const { parseLocationUpdate, parseCoordinates, parseSearchQuery } = await import("../src/validators/locationValidators.js");
const policy = await import("../src/services/locationPolicy.js");
const maps = await import("../src/services/mapProviderService.js");

const NOW = Date.parse("2026-11-06T10:00:00Z");
const status = (fn) => (err) => err?.status === fn;

test("accepts a real GPS fix and keeps its device timestamp", () => {
  const p = parseLocationUpdate({ lat: 19.9975, lng: 73.7898, accuracy: 12.4, recordedAt: NOW - 3000 }, NOW);
  assert.deepEqual({ lat: p.lat, lng: p.lng, accuracy: p.accuracy }, { lat: 19.9975, lng: 73.7898, accuracy: 12 });
  assert.equal(p.recordedAt.getTime(), NOW - 3000);
});

test("rejects coordinates that are not real numbers in range", () => {
  for (const body of [{ lat: "19.9", lng: 73.7 }, { lat: 91, lng: 10 }, { lat: 10, lng: 181 }, { lat: NaN, lng: 10 }, { lat: 0, lng: 0 }, {}, { lat: 19.9 }]) {
    assert.throws(() => parseLocationUpdate(body, NOW), status(400), JSON.stringify(body));
  }
});

test("rejects weak, stale and future readings", () => {
  assert.throws(() => parseLocationUpdate({ lat: 19.9, lng: 73.7, accuracy: 5000 }, NOW), status(422));
  assert.throws(() => parseLocationUpdate({ lat: 19.9, lng: 73.7, accuracy: -1 }, NOW), status(400));
  assert.throws(() => parseLocationUpdate({ lat: 19.9, lng: 73.7, recordedAt: NOW - 10 * 60_000 }, NOW), status(422));
  assert.throws(() => parseLocationUpdate({ lat: 19.9, lng: 73.7, recordedAt: NOW + 10 * 60_000 }, NOW), status(400));
  assert.throws(() => parseLocationUpdate({ lat: 19.9, lng: 73.7, recordedAt: "yesterday-ish" }, NOW), status(400));
});

test("query-string coordinates and search text are validated", () => {
  assert.deepEqual(parseCoordinates({ lat: "19.99", lng: "73.78" }), { lat: 19.99, lng: 73.78 });
  assert.throws(() => parseCoordinates({ lat: "abc", lng: "73" }), status(400));
  assert.throws(() => parseSearchQuery("ab"), status(400));
  assert.equal(parseSearchQuery("  Nashik Road  "), "Nashik Road");
});

test("sharing state follows status and consent", () => {
  for (const s of ["confirmed", "on_the_way", "arrived"]) {
    assert.equal(policy.sharingStateOf({ status: s, locationConsent: true }), "active");
    assert.equal(policy.sharingStateOf({ status: s, locationConsent: false }), "not_enabled");
  }
  for (const s of ["pending", "accepted", "declined", "rejected", "withdrawn", "cancelled", "completed"]) {
    assert.equal(policy.sharingStateOf({ status: s, locationConsent: true }), "ended", s);
  }
  assert.equal(policy.sharingStateOf({ status: "arrived", locationConsent: true, isCompleted: true }), "ended");
});

test("an employer sees a position only while sharing is active", () => {
  const point = { lat: 19.9, lng: 73.7, accuracy: 8, updatedAt: new Date(NOW) };
  assert.deepEqual(policy.visibleLocation({ status: "on_the_way", locationConsent: true, liveLocation: point }), { lat: 19.9, lng: 73.7, accuracy: 8, updatedAt: point.updatedAt });
  assert.equal(policy.visibleLocation({ status: "on_the_way", locationConsent: false, liveLocation: point }), null);
  assert.equal(policy.visibleLocation({ status: "completed", locationConsent: true, isCompleted: true, liveLocation: point }), null);
  assert.equal(policy.visibleLocation({ status: "cancelled", locationConsent: true, liveLocation: point }), null);
  assert.equal(policy.visibleLocation({ status: "confirmed", locationConsent: true }), null);
});

test("a position older than two minutes is stale", () => {
  assert.equal(policy.isStale(new Date(NOW - 30_000), NOW), false);
  assert.equal(policy.isStale(new Date(NOW - 3 * 60_000), NOW), true);
  assert.equal(policy.isStale(undefined, NOW), true);
});

const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });

test("OSRM route is mapped to real distance, duration and a [lat,lng] polyline", () => {
  const route = maps.parseOsrmRoute({
    code: "Ok",
    routes: [{ distance: 4321.6, duration: 612.2, geometry: { coordinates: [[73.78, 19.99], [73.79, 20.0]] }, legs: [{ steps: [
      { name: "College Road", maneuver: { type: "depart", modifier: "north" } },
      { name: "Gangapur Road", maneuver: { type: "turn", modifier: "left" } },
      { name: "", maneuver: { type: "arrive" } },
    ] }] }],
  });
  assert.equal(route.distanceMeters, 4322);
  assert.equal(route.durationSeconds, 612);
  assert.deepEqual(route.coordinates, [[19.99, 73.78], [20.0, 73.79]]);
  assert.deepEqual(route.steps, ["Head north on College Road", "Turn left onto Gangapur Road", "You have reached the destination"]);
});

test("a missing route is a clear 404, not an invented one", () => {
  assert.throws(() => maps.parseOsrmRoute({ code: "NoRoute", routes: [] }), (e) => e.status === 404 && e.extra.code === "NO_ROUTE");
  assert.throws(() => maps.parseOsrmRoute({ code: "InvalidQuery" }), status(404));
});

test("calculateRoute reports an unreachable provider and caches successes", async () => {
  await assert.rejects(maps.calculateRoute({ lat: 19.9, lng: 73.7 }, { lat: 20, lng: 73.8 }, { fetchImpl: async () => { throw new Error("offline"); } }), (e) => e.status === 503 && e.extra.code === "PROVIDER_UNAVAILABLE");
  maps.clearMapCache();
  let calls = 0;
  const ok = async () => (calls++, json({ code: "Ok", routes: [{ distance: 1000, duration: 120, geometry: { coordinates: [[73.7, 19.9], [73.8, 20]] }, legs: [{ steps: [] }] }] }));
  await maps.calculateRoute({ lat: 19.9, lng: 73.7 }, { lat: 20, lng: 73.8 }, { fetchImpl: ok });
  await maps.calculateRoute({ lat: 19.9, lng: 73.7 }, { lat: 20, lng: 73.8 }, { fetchImpl: ok });
  assert.equal(calls, 1);
});

const photon = { features: [{ properties: { name: "Sambhaji Chowk", city: "Nashik", state: "Maharashtra" }, geometry: { coordinates: [73.7898, 19.9975] } }] };
const nominatim = [
  { lat: "19.99751", lon: "73.78981", display_name: "Sambhaji Chowk, Nashik", address: { road: "Sambhaji Chowk", city: "Nashik", state: "Maharashtra" } },
  { lat: "20.0100", lon: "73.8000", display_name: "Other, Nashik", address: { road: "Other Road", city: "Nashik", state: "Maharashtra" } },
];

test("address search merges both providers and drops near-duplicates", async () => {
  maps.clearMapCache();
  const fetchImpl = async (url) => json(String(url).includes("/api/?q=") ? photon : nominatim);
  const results = await maps.searchPlaces("Sambhaji Chowk", { fetchImpl, gapMs: 0 });
  assert.equal(results.length, 2);
  assert.equal(results[0].lat, 19.9975);
});

test("address search survives one provider failing, and reports when both are busy", async () => {
  maps.clearMapCache();
  const oneDown = async (url) => (String(url).includes("/api/?q=") ? json({}, 500) : json(nominatim));
  assert.equal((await maps.searchPlaces("Nashik Road", { fetchImpl: oneDown, gapMs: 0 })).length, 2);
  maps.clearMapCache();
  await assert.rejects(maps.searchPlaces("Nashik Road", { fetchImpl: async () => json({}, 429), gapMs: 0 }), (e) => e.status === 503 && e.extra.code === "PROVIDER_BUSY");
});

test("reverse lookup returns a label, or NO_ADDRESS when the spot has none", async () => {
  maps.clearMapCache();
  const place = await maps.reversePlace(19.9975, 73.7898, { fetchImpl: async () => json({ address: { road: "College Road", city: "Nashik", state: "Maharashtra", postcode: "422005" } }), gapMs: 0 });
  assert.deepEqual(place, { label: "College Road, Nashik, Maharashtra", postalCode: "422005", city: "Nashik", state: "Maharashtra" });
  maps.clearMapCache();
  await assert.rejects(maps.reversePlace(1, 1, { fetchImpl: async () => json({ error: "Unable to geocode" }), gapMs: 0 }), (e) => e.status === 404 && e.extra.code === "NO_ADDRESS");
});
