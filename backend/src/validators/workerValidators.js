import { HttpError } from "../utils/httpError.js";

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const isBlank = (v) => v === undefined || v === null || v === "";

export function validateWorkerProfile(body = {}) {
  const { name, skills, location, about, experienceYears, experienceDetails, serviceAreas, availability } = body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60)) {
    throw new HttpError(400, "Name must be between 2 and 60 characters");
  }
  if (skills !== undefined && (typeof skills !== "string" || skills.length > 200)) {
    throw new HttpError(400, "Skills must be at most 200 characters");
  }
  if (location !== undefined && (typeof location !== "string" || location.length > 100)) {
    throw new HttpError(400, "Location must be at most 100 characters");
  }
  if (about !== undefined && (typeof about !== "string" || about.length > 500)) {
    throw new HttpError(400, "About me must be at most 500 characters");
  }
  if (experienceDetails !== undefined && (typeof experienceDetails !== "string" || experienceDetails.length > 500)) {
    throw new HttpError(400, "Work experience must be at most 500 characters");
  }
  if (!isBlank(experienceYears)) {
    const n = Number(experienceYears);
    if (!Number.isInteger(n) || n < 0 || n > 60) {
      throw new HttpError(400, "Experience must be a whole number between 0 and 60 years");
    }
  }
  if (serviceAreas !== undefined) {
    if (!Array.isArray(serviceAreas) || serviceAreas.length > 10 || serviceAreas.some((a) => typeof a !== "string" || a.trim().length > 60)) {
      throw new HttpError(400, "Preferred work locations: up to 10 areas, 60 characters each");
    }
  }
  if (availability !== undefined) {
    const { isAvailable, days, from, to } = availability || {};
    if (isAvailable !== undefined && typeof isAvailable !== "boolean") throw new HttpError(400, "Invalid availability");
    if (days !== undefined && (!Array.isArray(days) || days.some((d) => !WEEK_DAYS.includes(d)))) {
      throw new HttpError(400, "Invalid working days");
    }
    if (!isBlank(from) && !TIME.test(from)) throw new HttpError(400, "Invalid start time");
    if (!isBlank(to) && !TIME.test(to)) throw new HttpError(400, "Invalid end time");
    if (!isBlank(from) && !isBlank(to) && from >= to) throw new HttpError(400, "End time must be after start time");
  }
}
