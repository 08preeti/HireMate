export const START_STATUSES = ["confirmed", "on_the_way", "arrived"];
export const ACTIVE_WORK_STATUSES = ["confirmed", "on_the_way", "arrived"];
export const WORKER_CANCELLABLE = ["pending", "accepted", "confirmed", "on_the_way"];
export const EMPLOYER_CANCELLABLE = ["accepted", "confirmed", "on_the_way", "arrived"];
export const REASON_REQUIRED_FROM = ["confirmed", "on_the_way", "arrived"];

export const hasPendingCompletion = (a) => a.status === "arrived" && !!a.completionRequestedAt;

export function canRequestCompletion(a) {
  return a.status === "arrived" && !a.completionRequestedAt;
}

export function canReviewCompletion(a) {
  return hasPendingCompletion(a);
}

export function canWorkerCancel(a) {
  return WORKER_CANCELLABLE.includes(a.status) && !a.completionRequestedAt;
}

export function canEmployerCancel(a) {
  return EMPLOYER_CANCELLABLE.includes(a.status);
}

export const reasonRequired = (a) => REASON_REQUIRED_FROM.includes(a.status);

export const canReview = (a) => a.status === "completed";

// Which timeline entry/step a record is at, for dashboards and tests.
export function workStage(a) {
  if (a.status === "completed") return "completed";
  if (a.status === "arrived") return a.completionRequestedAt ? "completion_requested" : "arrived";
  return a.status;
}
