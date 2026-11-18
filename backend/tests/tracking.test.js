import test from "node:test";
import assert from "node:assert/strict";
import { publishChanged, publishLocation, setTrackingEmitter, trackingRoom } from "../src/services/trackingHub.js";
import { visibleLocation } from "../src/services/locationPolicy.js";
process.env.MONGODB_URI ||= "mongodb://localhost:27017/unused";
process.env.JWT_SECRET ||= "test-secret";
const { parseOsrmRoute } = await import("../src/services/mapProviderService.js");

test("publishing without a socket server is a harmless no-op", () => {
  setTrackingEmitter(null);
  assert.doesNotThrow(() => publishLocation("a1", { lat: 1, lng: 2 }));
  assert.doesNotThrow(() => publishChanged("a1"));
});

test("location and change events go to the application's own room", () => {
  const sent = [];
  setTrackingEmitter((room, event, payload) => sent.push({ room, event, payload }));
  publishLocation("abc", { lat: 19.99, lng: 73.78, updatedAt: new Date(0) }, new Date(1000));
  publishChanged("abc");
  setTrackingEmitter(null);
  assert.equal(sent[0].room, trackingRoom("abc"));
  assert.equal(sent[0].event, "tracking:location");
  assert.equal(sent[0].payload.serverTime, "1970-01-01T00:00:01.000Z");
  assert.equal(sent[1].event, "tracking:changed");
  assert.deepEqual(Object.keys(sent[1].payload), ["applicationId"]);
});

test("a failing emitter never breaks the caller", () => {
  setTrackingEmitter(() => {
    throw new Error("boom");
  });
  const original = console.error;
  console.error = () => {};
  assert.doesNotThrow(() => publishChanged("x"));
  console.error = original;
  setTrackingEmitter(null);
});

test("visibleLocation includes the trip start only while sharing is active", () => {
  const app = { status: "on_the_way", isCompleted: false, locationConsent: true, liveLocation: { lat: 1, lng: 2, updatedAt: new Date(), start: { lat: 3, lng: 4 } } };
  assert.deepEqual(visibleLocation(app).start, { lat: 3, lng: 4 });
  assert.equal(visibleLocation({ ...app, locationConsent: false }), null);
  assert.equal("start" in visibleLocation({ ...app, liveLocation: { lat: 1, lng: 2 } }), false);
});

test("route parsing keeps maneuver locations aligned with the steps", () => {
  const route = parseOsrmRoute({
    code: "Ok",
    routes: [{ distance: 100, duration: 10, geometry: { coordinates: [[73.78, 19.99], [73.79, 20.0]] }, legs: [{ steps: [
      { name: "A Road", maneuver: { type: "depart", modifier: "north", location: [73.78, 19.99] } },
      { name: "", maneuver: { type: "arrive", location: [73.79, 20.0] } },
    ] }] }],
  });
  assert.deepEqual(route.stepLocations, [[19.99, 73.78], [20.0, 73.79]]);
  assert.equal(route.stepLocations.length, route.steps.length);
});
