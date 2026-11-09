import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

process.env.MONGODB_URI ||= "mongodb://localhost/unused";
process.env.JWT_SECRET ||= "test-secret";

const v = await import("../src/validators/authValidators.js");
const { maskPhone, loggable } = await import("../src/utils/privacy.js");
const { sendError, HttpError } = await import("../src/utils/httpError.js");
const { errorHandler } = await import("../src/middleware/errorHandler.js");
const { securityHeaders } = await import("../src/middleware/securityHeaders.js");

const status = (code) => (err) => err?.status === code;
const fakeRes = () => {
  const r = { code: 200, body: undefined, headers: {} };
  r.status = (c) => ((r.code = c), r);
  r.json = (b) => ((r.body = b), r);
  r.set = (h) => (Object.assign(r.headers, h), r);
  return r;
};

test("operator objects can never reach a database query as a phone number", () => {
  for (const phone of [{ $ne: null }, { $gt: "" }, ["9876543210"], 9876543210, "", null, undefined, "12345", "98765 43210", "9876543210; drop"]) {
    assert.throws(() => v.validatePhone(phone), status(400), JSON.stringify(phone));
  }
  assert.doesNotThrow(() => v.validatePhone("9876543210"));
  assert.doesNotThrow(() => v.validatePhone("+919876543210"));
});

test("OTP verification only accepts a 6-digit string", () => {
  assert.throws(() => v.validateOtpVerify({ phone: "9876543210", otp: { $ne: "" } }), status(400));
  assert.throws(() => v.validateOtpVerify({ phone: "9876543210", otp: "12345" }), status(400));
  assert.throws(() => v.validateOtpVerify({ phone: "9876543210", otp: 123456 }), status(400));
  assert.throws(() => v.validateOtpVerify({ phone: { $ne: null }, otp: "123456" }), status(400));
  assert.throws(() => v.validateOtpVerify({ phone: "9876543210", otp: "123456", name: { $ne: 1 } }), status(400));
  assert.doesNotThrow(() => v.validateOtpVerify({ phone: "9876543210", otp: "123456", name: "Asha", skills: "Mason", location: "Nashik" }));
});

test("worker registration validates contact, otp and profile types", () => {
  assert.throws(() => v.validateWorkerRegister({ name: "Asha", contact: { $ne: null }, otp: "123456" }), status(400));
  assert.throws(() => v.validateWorkerRegister({ name: "Asha", contact: "9876543210" }), status(400));
  assert.throws(() => v.validateWorkerRegister({ name: ["x"], contact: "9876543210", otp: "123456" }), status(400));
  assert.doesNotThrow(() => v.validateWorkerRegister({ name: "Asha", contact: "9876543210", otp: "123456", skills: "Mason" }));
});

test("employer registration rejects non-strings, bad emails and weak passwords", () => {
  const ok = { companyName: "Test Co", email: "owner@test.in", password: "longenough1" };
  assert.doesNotThrow(() => v.validateEmployerRegister(ok));
  assert.throws(() => v.validateEmployerRegister({ ...ok, email: { $ne: null } }), status(400));
  assert.throws(() => v.validateEmployerRegister({ ...ok, password: { $ne: null } }), status(400));
  assert.throws(() => v.validateEmployerRegister({ ...ok, email: "not-an-email" }), status(400));
  assert.throws(() => v.validateEmployerRegister({ ...ok, password: "short" }), status(400));
  assert.throws(() => v.validateEmployerRegister({ ...ok, password: "x".repeat(73) }), status(400));
  assert.throws(() => v.validateEmployerRegister({ ...ok, companyName: "A" }), status(400));
});

test("employer login rejects operator objects and normalizes email case", () => {
  assert.throws(() => v.validateEmployerLogin({ email: { $gt: "" }, password: "x" }), status(400));
  assert.throws(() => v.validateEmployerLogin({ email: "a@b.in", password: { $ne: "" } }), status(400));
  assert.doesNotThrow(() => v.validateEmployerLogin({ email: "a@b.in", password: "whatever" }));
  assert.equal(v.normalizeEmail("  Owner@Test.IN "), "owner@test.in");
});

test("phone numbers are masked and log text cannot forge extra log lines", () => {
  assert.equal(maskPhone("+919876543210"), "*********3210");
  assert.equal(maskPhone(""), "****");
  assert.equal(loggable("spam\n🚨 Job reported: fake\r\nline"), "spam 🚨 Job reported: fake line");
  assert.equal(loggable("x".repeat(500), 300).length, 300);
});

test("a malformed id is a 400, not a 500", () => {
  const res = fakeRes();
  const cast = Object.assign(new Error("Cast to ObjectId failed"), { name: "CastError" });
  sendError(res, cast, "Failed");
  assert.equal(res.code, 400);
  const res2 = fakeRes();
  sendError(res2, new HttpError(404, "Not found"), "Failed");
  assert.equal(res2.code, 404);
});

test("bad JSON bodies get a clean 400 and unknown errors never leak details", () => {
  const bad = fakeRes();
  errorHandler(Object.assign(new SyntaxError("Unexpected token } in JSON at position 5"), { type: "entity.parse.failed", status: 400 }), {}, bad, () => {});
  assert.equal(bad.code, 400);
  assert.deepEqual(bad.body, { message: "Invalid JSON body" });
  const boom = fakeRes();
  const original = console.error;
  console.error = () => {};
  errorHandler(new Error("connect ECONNREFUSED 10.0.0.5:27017 user:secret"), {}, boom, () => {});
  console.error = original;
  assert.equal(boom.code, 500);
  assert.deepEqual(boom.body, { message: "Internal server error" });
});

test("security headers are set on every response", () => {
  const res = fakeRes();
  let called = false;
  securityHeaders({}, res, () => (called = true));
  assert.equal(called, true);
  assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(res.headers["X-Frame-Options"], "DENY");
});

const boot = (extra) =>
  spawnSync(process.execPath, ["--input-type=module", "-e", 'const { env } = await import("./src/config/env.js"); console.log(JSON.stringify({ cors: env.corsOrigins, proxy: env.trustProxy }));'], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { PATH: process.env.PATH, MONGODB_URI: "mongodb://x/y", JWT_SECRET: "a".repeat(40), ...extra },
    encoding: "utf8",
  });

test("production refuses to start without FRONTEND_URL, and trusts one proxy hop", () => {
  const missing = boot({ NODE_ENV: "production" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /FRONTEND_URL is required/);
  const fine = boot({ NODE_ENV: "production", FRONTEND_URL: "https://app.example.com/, https://www.example.com" });
  assert.equal(fine.status, 0);
  assert.deepEqual(JSON.parse(fine.stdout), { cors: ["https://app.example.com", "https://www.example.com"], proxy: 1 });
});

test("development falls back to the local frontend origin only", () => {
  const dev = boot({ NODE_ENV: "development" });
  assert.equal(dev.status, 0);
  assert.deepEqual(JSON.parse(dev.stdout), { cors: ["http://localhost:3000"], proxy: 0 });
});
