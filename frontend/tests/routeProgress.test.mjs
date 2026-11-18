import test from "node:test";
import assert from "node:assert/strict";
import { measureRoute, locateOnRoute, routeProgress, nextInstruction, offRouteLimit } from "../src/lib/routeProgress.ts";

// A straight road heading north, about 2.2 km long.
const coords = [[19.9, 73.8], [19.91, 73.8], [19.92, 73.8]];
const route = measureRoute(coords);

test("measures the polyline", () => {
  assert.ok(Math.abs(route.totalMeters - 2224) < 10);
});

test("a point on the road is on the route and splits it in two", () => {
  const p = routeProgress(route, { distanceMeters: 2224, durationSeconds: 300 }, [19.91, 73.8]);
  assert.ok(p.offRouteMeters < 1);
  assert.ok(Math.abs(p.remainingMeters - 1112) < 10);
  assert.ok(Math.abs(p.remainingSeconds - 150) < 5);
  assert.deepEqual(p.done[0], coords[0]);
  assert.deepEqual(p.remaining[p.remaining.length - 1], coords[2]);
});

test("a point beside the road reports how far off it is", () => {
  const off = locateOnRoute(route, [19.91, 73.8045]); // ~475 m east
  assert.ok(off.offRouteMeters > 400 && off.offRouteMeters < 550);
});

test("nothing is left at the destination and everything is left at the start", () => {
  assert.equal(routeProgress(route, { distanceMeters: 2224, durationSeconds: 300 }, [19.92, 73.8]).remainingMeters, 0);
  assert.equal(routeProgress(route, { distanceMeters: 2224, durationSeconds: 300 }, [19.9, 73.8]).remainingMeters, 2224);
});

test("next instruction skips maneuvers already passed", () => {
  const info = { steps: ["Head north", "Turn left", "Arrive"], stepLocations: [[19.9, 73.8], [19.91, 73.8], [19.92, 73.8]] };
  assert.equal(nextInstruction(route, info, 100).text, "Turn left");
  assert.equal(nextInstruction(route, info, 1200).text, "Arrive");
  assert.equal(nextInstruction(route, info, 2224), null);
});

test("GPS accuracy widens the off-route limit within bounds", () => {
  assert.equal(offRouteLimit(5), 50);
  assert.equal(offRouteLimit(60), 90);
  assert.equal(offRouteLimit(900), 150);
});
