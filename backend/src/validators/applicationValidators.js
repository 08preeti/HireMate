import { HttpError } from "../utils/httpError.js";

// What an employer may do with a pending application.
export const APPLICATION_DECISIONS = ["accepted", "declined"];

// What the worker may do with an offer (an application the employer has accepted).
export const OFFER_RESPONSES = ["confirmed", "rejected"];

// Journey steps the worker may move to, and the status each one must come from.
export const JOURNEY_TRANSITIONS = {
  on_the_way: ["confirmed"],
  arrived: ["confirmed", "on_the_way"],
  completed: ["on_the_way", "arrived"],
};

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

export function validateRating(rating) {
  if (!rating) throw new HttpError(400, "Rating required");
}
