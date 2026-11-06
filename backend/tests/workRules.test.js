import test from "node:test";
import assert from "node:assert/strict";
import { canEmployerCancel, canRequestCompletion, canReview, canReviewCompletion, canWorkerCancel, reasonRequired, workStage } from "../src/constants/workRules.js";
import { JOURNEY_TRANSITIONS, validateCompletionDecision, validateReason, validateReview, validateStatus } from "../src/validators/applicationValidators.js";
import { HttpError } from "../src/utils/httpError.js";

const fails = (fn, field) => {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 400);
    if (field) assert.equal(err.extra.field, field);
    return true;
  }
  return false;
};

test("a worker can never move work to completed directly", () => {
  assert.equal(Object.hasOwn(JOURNEY_TRANSITIONS, "completed"), false);
  assert.ok(fails(() => validateStatus("completed")));
  assert.doesNotThrow(() => validateStatus("on_the_way"));
  assert.doesNotThrow(() => validateStatus("arrived"));
});

test("completion can be requested only once, and only after arriving", () => {
  assert.equal(canRequestCompletion({ status: "confirmed" }), false);
  assert.equal(canRequestCompletion({ status: "on_the_way" }), false);
  assert.equal(canRequestCompletion({ status: "arrived" }), true);
  assert.equal(canRequestCompletion({ status: "arrived", completionRequestedAt: new Date() }), false);
  assert.equal(canRequestCompletion({ status: "completed" }), false);
});

test("an employer can review only a pending completion request", () => {
  assert.equal(canReviewCompletion({ status: "arrived", completionRequestedAt: new Date() }), true);
  assert.equal(canReviewCompletion({ status: "arrived" }), false);
  assert.equal(canReviewCompletion({ status: "completed", completionRequestedAt: new Date() }), false);
});

test("cancellation eligibility", () => {
  assert.equal(canWorkerCancel({ status: "confirmed" }), true);
  assert.equal(canWorkerCancel({ status: "on_the_way" }), true);
  assert.equal(canWorkerCancel({ status: "arrived" }), false);
  assert.equal(canWorkerCancel({ status: "on_the_way", completionRequestedAt: new Date() }), false);
  assert.equal(canWorkerCancel({ status: "completed" }), false);
  assert.equal(canEmployerCancel({ status: "arrived" }), true);
  assert.equal(canEmployerCancel({ status: "completed" }), false);
  assert.equal(canEmployerCancel({ status: "pending" }), false);
  assert.equal(reasonRequired({ status: "confirmed" }), true);
  assert.equal(reasonRequired({ status: "accepted" }), false);
});

test("reviews are possible only for completed work", () => {
  assert.equal(canReview({ status: "completed" }), true);
  for (const status of ["pending", "accepted", "confirmed", "on_the_way", "arrived", "cancelled", "withdrawn"]) assert.equal(canReview({ status }), false);
});

test("work stage reflects a pending completion request", () => {
  assert.equal(workStage({ status: "arrived" }), "arrived");
  assert.equal(workStage({ status: "arrived", completionRequestedAt: new Date() }), "completion_requested");
  assert.equal(workStage({ status: "completed" }), "completed");
});

test("rating validation", () => {
  assert.deepEqual(validateReview({ rating: 5, review: "  Good  " }), { rating: 5, review: "Good" });
  assert.deepEqual(validateReview({ rating: "4" }), { rating: 4, review: "" });
  for (const rating of [0, 6, 2.5, "x", undefined, null, -1]) assert.ok(fails(() => validateReview({ rating }), "rating"), String(rating));
  assert.ok(fails(() => validateReview({ rating: 3, review: "x".repeat(501) }), "review"));
  assert.ok(fails(() => validateReview({ rating: 3, review: 42 }), "review"));
});

test("completion decisions and reasons", () => {
  assert.deepEqual(validateCompletionDecision({ decision: "approved" }), { decision: "approved", reason: "" });
  assert.ok(fails(() => validateCompletionDecision({ decision: "rejected" }), "reason"));
  assert.ok(fails(() => validateCompletionDecision({ decision: "rejected", reason: "no" }), "reason"));
  assert.equal(validateCompletionDecision({ decision: "rejected", reason: " Work not done " }).reason, "Work not done");
  assert.ok(fails(() => validateCompletionDecision({ decision: "done" })));
  assert.equal(validateReason(undefined), "");
  assert.ok(fails(() => validateReason(undefined, { required: true }), "reason"));
  assert.ok(fails(() => validateReason("x".repeat(301)), "reason"));
});
