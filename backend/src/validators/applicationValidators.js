import { HttpError } from "../utils/httpError.js";

// What an employer may do with a pending application.
export const APPLICATION_DECISIONS = ["accepted", "declined"];

// What the worker may do with an offer (an application the employer has accepted).
export const OFFER_RESPONSES = ["confirmed", "rejected"];

// Journey steps the worker may move to, and the status each one must come from.
// "completed" is not here: only the employer verifying a completion request can complete work.
export const JOURNEY_TRANSITIONS = {
  on_the_way: ["confirmed"],
  arrived: ["confirmed", "on_the_way"],
};

export const COMPLETION_DECISIONS = ["approved", "rejected"];

export function validateApplyBody(body) {
  const { applicantName, message } = body || {};
  if (applicantName !== undefined && (typeof applicantName !== "string" || applicantName.length > 100)) throw new HttpError(400, "Invalid name");
  if (message !== undefined && (typeof message !== "string" || message.length > 500)) throw new HttpError(400, "Message must be 500 characters or fewer");
}

export function validateOfferResponse(response) {
  if (!OFFER_RESPONSES.includes(response)) throw new HttpError(400, "Response must be confirmed or rejected");
}

export function validateDecision(decision) {
  if (!APPLICATION_DECISIONS.includes(decision)) throw new HttpError(400, "Decision must be accepted or declined");
}

export function validateStatus(status) {
  if (!Object.hasOwn(JOURNEY_TRANSITIONS, status)) throw new HttpError(400, "Invalid status");
}

export function validateLocationConsent(consent) {
  if (typeof consent !== "boolean") throw new HttpError(400, "consent must be true or false");
}


export function validateReason(reason, { required = false, label = "Reason" } = {}) {
  if (reason === undefined || reason === null || reason === "") {
    if (required) throw new HttpError(400, `${label} is required`, { field: "reason" });
    return "";
  }
  if (typeof reason !== "string") throw new HttpError(400, `${label} must be text`, { field: "reason" });
  const text = reason.trim();
  if (required && text.length < 3) throw new HttpError(400, `${label} must be at least 3 characters`, { field: "reason" });
  if (text.length > 300) throw new HttpError(400, `${label} must be 300 characters or fewer`, { field: "reason" });
  return text;
}

export function validateCompletionDecision(body = {}) {
  if (!COMPLETION_DECISIONS.includes(body.decision)) throw new HttpError(400, "Decision must be approved or rejected");
  return { decision: body.decision, reason: validateReason(body.reason, { required: body.decision === "rejected", label: "Reason for rejecting" }) };
}

export function validateReview(body = {}) {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Rating must be a whole number from 1 to 5", { field: "rating" });
  const review = typeof body.review === "string" ? body.review.trim() : "";
  if (body.review !== undefined && body.review !== null && typeof body.review !== "string") throw new HttpError(400, "Review must be text", { field: "review" });
  if (review.length > 500) throw new HttpError(400, "Review must be 500 characters or fewer", { field: "review" });
  return { rating, review };
}
