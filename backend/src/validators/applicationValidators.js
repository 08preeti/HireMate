import { HttpError } from "../utils/httpError.js";

export const APPLICATION_STATUSES = ["accepted", "on_the_way", "arrived", "completed"];

export function validateStatus(status) {
  if (!APPLICATION_STATUSES.includes(status)) throw new HttpError(400, "Invalid status");
}

export function validateRating(rating) {
  if (!rating) throw new HttpError(400, "Rating required");
}
