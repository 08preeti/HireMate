import { HttpError } from "../utils/httpError.js";

export function validateNewJob({ jobTitle, salary } = {}) {
  if (!jobTitle || String(jobTitle).trim() === "") throw new HttpError(400, "Job title is required");
  if (salary === undefined || salary === null || salary === "" || Number.isNaN(Number(salary))) {
    throw new HttpError(400, "A valid salary is required");
  }
}
