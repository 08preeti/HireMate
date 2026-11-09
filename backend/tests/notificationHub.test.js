import test from "node:test";
import assert from "node:assert/strict";
import { connectionCount, formatEvent, hasSubscribers, hubKey, publish, subscribe } from "../src/services/notificationHub.js";

const client = () => {
  const c = { got: [], closed: false, send: (event, data, id) => c.got.push({ event, data, id }), close: () => (c.closed = true) };
  return c;
};

test("an event reaches only the subscribers of that exact user", () => {
  const worker = client();
  const employer = client();
  const otherWorker = client();
  subscribe(hubKey("worker", "w1"), worker);
  subscribe(hubKey("employer", "e1"), employer);
  subscribe(hubKey("worker", "w2"), otherWorker);

  assert.equal(publish(hubKey("worker", "w1"), "notification", { title: "Hi" }, "n1"), 1);
  assert.deepEqual(worker.got, [{ event: "notification", data: { title: "Hi" }, id: "n1" }]);
  assert.equal(employer.got.length, 0);
  assert.equal(otherWorker.got.length, 0);
});

test("the same id under a different role is a different room", () => {
  const asWorker = client();
  const asEmployer = client();
  subscribe(hubKey("worker", "same"), asWorker);
  subscribe(hubKey("employer", "same"), asEmployer);
  publish(hubKey("employer", "same"), "notification", {}, "x");
  assert.equal(asWorker.got.length, 0);
  assert.equal(asEmployer.got.length, 1);
});

test("a user with two tabs gets the event in both, and nothing after unsubscribing", () => {
  const key = hubKey("worker", "two-tabs");
  const a = client();
  const b = client();
  const offA = subscribe(key, a);
  subscribe(key, b);
  assert.equal(publish(key, "notification", {}, "1"), 2);
  offA();
  assert.equal(publish(key, "notification", {}, "2"), 1);
  assert.equal(a.got.length, 1);
  assert.equal(b.got.length, 2);
});

test("a disconnected user has no subscribers, so publishing is a harmless no-op", () => {
  const key = hubKey("worker", "offline");
  assert.equal(hasSubscribers(key), false);
  assert.equal(publish(key, "notification", {}, "1"), 0);
  const off = subscribe(key, client());
  assert.equal(hasSubscribers(key), true);
  off();
  assert.equal(hasSubscribers(key), false);
});

test("connections per user are capped and the oldest is closed", () => {
  const key = hubKey("worker", "many");
  const all = Array.from({ length: 6 }, client);
  all.forEach((c) => subscribe(key, c));
  assert.equal(connectionCount(key), 4);
  assert.deepEqual(all.map((c) => c.closed), [true, true, false, false, false, false]);
});

test("a client that throws is dropped without affecting the others", () => {
  const key = hubKey("worker", "broken");
  const bad = { send: () => { throw new Error("socket closed"); }, close() {} };
  const good = client();
  subscribe(key, bad);
  subscribe(key, good);
  assert.equal(publish(key, "notification", {}, "1"), 1);
  assert.equal(connectionCount(key), 1);
});

test("events are written in the Server-Sent Events format", () => {
  assert.equal(formatEvent({ event: "ready", data: {} }), "event: ready\ndata: {}\n\n");
  assert.equal(formatEvent({ event: "notification", data: { a: "x\ny" }, id: "n1" }), 'id: n1\nevent: notification\ndata: {"a":"x\\ny"}\n\n');
});
