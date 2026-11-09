import test from "node:test";
import assert from "node:assert/strict";
import { parseSse } from "../src/lib/sse.ts";

test("parses complete events and keeps the unfinished tail", () => {
  const { messages, rest } = parseSse('retry: 5000\n\nevent: ready\ndata: {}\n\nid: n1\nevent: notification\ndata: {"a":1}\n\nevent: noti');
  assert.deepEqual(messages, [
    { event: "ready", data: "{}", id: undefined },
    { event: "notification", data: '{"a":1}', id: "n1" },
  ]);
  assert.equal(rest, "event: noti");
});

test("an event split across chunks is assembled once, not twice", () => {
  const first = parseSse('event: notification\ndata: {"a"');
  assert.equal(first.messages.length, 0);
  const second = parseSse(first.rest + ':1}\n\n');
  assert.equal(second.messages.length, 1);
  assert.equal(second.messages[0].data, '{"a":1}');
  assert.equal(second.rest, "");
});

test("heartbeat comments and CRLF line endings are handled", () => {
  const { messages } = parseSse(': ping\n\n: ping\r\n\r\nevent: notification\r\ndata: {}\r\n\r\n');
  assert.deepEqual(messages.map((m) => m.event), ["notification"]);
});
