import { HttpError } from "../utils/httpError.js";
import { JOB_TYPES, SALARY_UNITS, SHIFT_KEYS } from "../constants/jobRules.js";
import { isValidCoordinate } from "../utils/geo.js";

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const todayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

const TEXT_LIMITS = {
  jobTitle: ["Job title", 150],
  summary: ["Job description", 3000],
  skills: ["Required skills", 300],
  category: ["Job category", 80],
  experience: ["Experience requirement", 200],
  paymentMethod: ["Payment method", 40],
  paymentDetails: ["Payment details", 500],
  workSchedule: ["Work schedule", 200],
  duration: ["Duration", 100],
  workInstructions: ["Work instructions", 1500],
  gateNote: ["Gate instructions", 300],
  location: ["Address", 400],
  addressLine: ["Address line", 300],
  city: ["City / area", 80],
  state: ["State", 80],
  companyName: ["Company name", 120],
};

/**
 * Validates a job body and returns the cleaned fields that were supplied.
 * partial=true (editing): only supplied fields are checked. partial=false (creating): required fields must exist.
 * Throws HttpError(400) with { field, errors } so the form can show each message beside its input.
 */
export function parseJobInput(body = {}, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const has = (k) => body[k] !== undefined;
  const fail = (field, message) => {
    if (!errors[field]) errors[field] = message;
  };

  for (const [field, [label, max]] of Object.entries(TEXT_LIMITS)) {
    if (!has(field)) continue;
    if (body[field] !== null && typeof body[field] !== "string") {
      fail(field, `${label} must be text`);
      continue;
    }
    const value = (body[field] ?? "").trim();
    if (value.length > max) fail(field, `${label} must be ${max} characters or fewer`);
    out[field] = value;
  }

  if (has("description") && !has("summary")) {
    if (typeof body.description === "string") {
      if (body.description.length > 4000) fail("description", "Description must be 4000 characters or fewer");
      out.description = body.description.trim();
    }
  }

  if (!partial || has("jobTitle")) {
    if (isBlank(out.jobTitle)) fail("jobTitle", "Job title is required");
  }
  if (!partial || has("location")) {
    if (isBlank(out.location)) fail("location", "Work location is required");
  }

  if (!partial || has("salary")) {
    const raw = body.salary;
    const n = Number(raw);
    if (isBlank(raw) || Number.isNaN(n)) fail("salary", "A valid pay amount is required");
    else if (n <= 0) fail("salary", "Pay must be greater than zero");
    else if (n > 10_000_000) fail("salary", "Pay is too large");
    else out.salary = n;
  }

  if (has("salaryUnit") && !isBlank(body.salaryUnit)) {
    if (!SALARY_UNITS.includes(body.salaryUnit)) fail("salaryUnit", "Payment type must be hourly, daily, weekly or monthly");
    else out.salaryUnit = body.salaryUnit;
  }
  if (has("jobType") && !isBlank(body.jobType)) {
    if (!JOB_TYPES.includes(body.jobType)) fail("jobType", "Choose a valid job type");
    else out.jobType = body.jobType;
  }
  if (has("shift") && !isBlank(body.shift)) {
    if (!SHIFT_KEYS.includes(body.shift)) fail("shift", "Choose a valid shift");
    else out.shift = body.shift;
  }

  if (has("vacancies") && !isBlank(body.vacancies)) {
    const n = Number(body.vacancies);
    if (!Number.isInteger(n) || n < 1 || n > 500) fail("vacancies", "Workers required must be a whole number between 1 and 500");
    else out.vacancies = n;
  } else if (!partial) {
    out.vacancies = 1;
  }

  if (has("startDate")) {
    if (isBlank(body.startDate)) out.startDate = null;
    else {
      const text = String(body.startDate);
      const d = /^\d{4}-\d{2}-\d{2}/.test(text) ? new Date(`${text.slice(0, 10)}T00:00:00.000Z`) : new Date(NaN);
      if (Number.isNaN(d.getTime())) fail("startDate", "Start date is not a valid date");
      else if (!partial && d.getTime() < todayUtc() - 86_400_000) fail("startDate", "Start date cannot be in the past");
      else out.startDate = d;
    }
  }

  if (has("overtimeRate")) {
    if (isBlank(body.overtimeRate)) out.overtimeRate = 0;
    else {
      const n = Number(body.overtimeRate);
      if (Number.isNaN(n) || n < 0 || n > 100_000) fail("overtimeRate", "Overtime rate must be between 0 and 100000");
      else out.overtimeRate = n;
    }
  }

  if (has("perkItems")) {
    if (!Array.isArray(body.perkItems) || body.perkItems.length > 10 || body.perkItems.some((p) => typeof p !== "string" || !p.trim() || p.length > 60)) {
      fail("perkItems", "Perks must be a short list of text items");
    } else out.perkItems = body.perkItems.map((p) => p.trim());
  }

  if (has("postalCode") && !isBlank(body.postalCode)) {
    if (!/^\d{6}$/.test(String(body.postalCode).trim())) fail("postalCode", "Postal code must be 6 digits");
    else out.postalCode = String(body.postalCode).trim();
  }

  const latGiven = has("latitude") && !isBlank(body.latitude);
  const lngGiven = has("longitude") && !isBlank(body.longitude);
  if (latGiven || lngGiven) {
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    if (!latGiven || !lngGiven || !isValidCoordinate(lat, lng)) {
      fail("latitude", "Map location must have a valid latitude and longitude");
    } else {
      out.latitude = lat;
      out.longitude = lng;
    }
  }

  if (has("contactInfo") && !isBlank(body.contactInfo)) {
    const compact = String(body.contactInfo).replace(/[\s-]/g, "");
    if (!/^\+?\d{10,15}$/.test(compact)) fail("contactInfo", "Contact number must be 10 to 15 digits");
    else out.contactInfo = compact;
  } else if (has("contactInfo")) {
    out.contactInfo = "";
  }

  if (has("isUrgent")) {
    if (typeof body.isUrgent !== "boolean") fail("isUrgent", "Urgent must be true or false");
    else out.isUrgent = body.isUrgent;
  }

  const fields = Object.keys(errors);
  if (fields.length) throw new HttpError(400, errors[fields[0]], { field: fields[0], errors });
  return out;
}

export const validateNewJob = (body) => parseJobInput(body, { partial: false });
