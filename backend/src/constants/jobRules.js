export const JOB_STATUSES = ["active", "filled", "closed", "completed"];
export const JOB_TYPES = ["one_day", "multi_day", "part_time", "full_time", "contract"];
export const SALARY_UNITS = ["hour", "day", "week", "month"];
export const SHIFT_KEYS = ["day", "night", "half"];

export const HOLDING_STATUSES = ["accepted", "confirmed", "on_the_way", "arrived", "completed"];
export const CONFIRMED_WORKER_STATUSES = ["confirmed", "on_the_way", "arrived", "completed"];
export const IN_PROGRESS_STATUSES = ["accepted", "confirmed", "on_the_way", "arrived"];
export const LIVE_APPLICANT_STATUSES = ["pending", "accepted", "confirmed", "on_the_way", "arrived"];

export const TRANSITIONS = {
  close: ["active", "filled"],
  reopen: ["closed", "filled"],
  fill: ["active"],
  complete: ["active", "filled", "closed"],
};

export const CRITICAL_FIELDS = [
  "jobTitle",
  "category",
  "salary",
  "salaryUnit",
  "paymentMethod",
  "location",
  "addressLine",
  "city",
  "state",
  "postalCode",
  "latitude",
  "longitude",
  "startDate",
  "workSchedule",
  "shift",
  "jobType",
];

export const NOTIFY_FIELDS = [...CRITICAL_FIELDS, "duration", "workInstructions", "gateNote", "perkItems", "overtimeRate", "contactInfo", "paymentDetails"];

export const FIELD_LABELS = {
  jobTitle: "job title",
  category: "category",
  salary: "pay",
  salaryUnit: "pay period",
  paymentMethod: "payment method",
  paymentDetails: "payment details",
  location: "location",
  addressLine: "address",
  city: "city",
  state: "state",
  postalCode: "postal code",
  latitude: "map location",
  longitude: "map location",
  startDate: "start date",
  workSchedule: "work schedule",
  shift: "work schedule",
  jobType: "job type",
  duration: "duration",
  workInstructions: "work instructions",
  gateNote: "gate instructions",
  perkItems: "perks",
  overtimeRate: "overtime rate",
  contactInfo: "contact number",
};

const sameValue = (a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  if (a instanceof Date || b instanceof Date) return (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);
  const empty = (v) => v === undefined || v === null || v === "";
  if (empty(a) && empty(b)) return true;
  return a === b;
};

const currentValue = (job, field) => {
  if (field === "jobTitle" || field === "location" || field === "skills") return job[field]?.en ?? "";
  return job[field];
};

export function changedFields(job, patch) {
  return Object.keys(patch).filter((field) => !sameValue(currentValue(job, field), patch[field]));
}

const isUnset = (job, field) => {
  const v = currentValue(job, field);
  return v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
};

// Filling in a detail that was never set (jobs posted before these fields existed) changes nothing for existing workers.
export const meaningfulChanges = (job, fields) => fields.filter((f) => !isUnset(job, f));

export const criticalChanges = (fields) => fields.filter((f) => CRITICAL_FIELDS.includes(f));

export const notifyLabels = (fields) => [...new Set(fields.filter((f) => NOTIFY_FIELDS.includes(f)).map((f) => FIELD_LABELS[f]))];

export const vacanciesOf = (job) => (Number.isInteger(job.vacancies) && job.vacancies > 0 ? job.vacancies : 1);
export const filledOf = (job) => (Number.isInteger(job.filledPositions) && job.filledPositions > 0 ? job.filledPositions : 0);

export function emptyStats() {
  return { total: 0, pending: 0, reserved: 0, confirmed: 0, inProgress: 0, completed: 0, confirmedWorkers: 0, declined: 0, rejected: 0, withdrawn: 0, cancelled: 0, ended: 0 };
}

export function buildStats(statusCounts = {}) {
  const n = (s) => statusCounts[s] || 0;
  const stats = emptyStats();
  stats.total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  stats.pending = n("pending");
  stats.reserved = n("accepted");
  stats.confirmed = n("confirmed");
  stats.inProgress = n("on_the_way") + n("arrived");
  stats.completed = n("completed");
  stats.confirmedWorkers = stats.confirmed + stats.inProgress + stats.completed;
  stats.declined = n("declined");
  stats.rejected = n("rejected");
  stats.withdrawn = n("withdrawn");
  stats.cancelled = n("cancelled");
  stats.ended = stats.declined + stats.rejected + stats.withdrawn + stats.cancelled;
  return stats;
}

export function jobActions(job, stats) {
  const total = vacanciesOf(job);
  const filled = Math.min(filledOf(job), total);
  const available = total - filled;
  const status = job.status;
  const liveHolders = stats.reserved + stats.confirmed + stats.inProgress;
  return {
    canEdit: status !== "completed",
    canClose: TRANSITIONS.close.includes(status),
    canReopen: status === "closed" && available > 0,
    canFill: status === "active" && filled >= 1 && available >= 1,
    canComplete: TRANSITIONS.complete.includes(status) && liveHolders === 0 && stats.completed >= 1,
    canDelete: stats.total === 0,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function composeDescription(f) {
  const count = vacanciesOf(f);
  const lead = `${f.skills || (f.jobTitle?.en ?? f.jobTitle) || "Workers"} — ${count} worker${count > 1 ? "s" : ""} needed.`;
  return [
    lead,
    f.summary ? f.summary.trim() : "",
    f.startDate ? `Work date: ${formatDateLabel(f.startDate)}.` : "",
    f.workSchedule ? `Shift: ${f.workSchedule}.` : "",
    f.duration ? `Duration: ${f.duration}.` : "",
    f.experience ? `Experience: ${f.experience}.` : "",
    f.overtimeRate > 0 ? `Overtime paid extra at ₹${f.overtimeRate}/hour beyond shift hours.` : "",
    Array.isArray(f.perkItems) && f.perkItems.length ? `Provided: ${f.perkItems.join(", ")}.` : "",
    f.gateNote ? `Gate instructions: ${f.gateNote.trim()}` : "",
    f.workInstructions ? `Note: ${f.workInstructions.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
