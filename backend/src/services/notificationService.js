import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import { ROLES } from "../constants/roles.js";
import { HttpError } from "../utils/httpError.js";
import { distanceKm } from "../utils/geo.js";

const MAX_PAGE_SIZE = 50;
const NEARBY_RADIUS_KM = 20;

// ── Creation (best-effort: a failure here must never break the main workflow) ─
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

// Upsert keyed on (recipient, dedupeKey): the key fields live only in the filter,
// everything else in $setOnInsert, so retries never duplicate or conflict.
async function createMany(docs, label = "notification") {
  if (!docs.length) return { created: 0, existing: 0 };
  try {
    const ops = docs.map(({ recipient, dedupeKey, ...rest }) => ({
      updateOne: {
        filter: { recipient, dedupeKey },
        update: { $setOnInsert: clean(rest) },
        upsert: true,
      },
    }));
    const result = await Notification.bulkWrite(ops, { ordered: false });
    const created = result.upsertedCount ?? 0;
    console.log(`[notifications] ${label}: attempted=${docs.length} created=${created} existing=${docs.length - created}`);
    return { created, existing: docs.length - created };
  } catch (err) {
    // Duplicate-key races (E11000) just mean someone else created it first.
    const writeErrors = err.writeErrors || err.result?.getWriteErrors?.() || [];
    const real = writeErrors.filter((e) => (e.code ?? e.err?.code) !== 11000);
    if (err.code === 11000 || (writeErrors.length && !real.length)) return { created: 0, existing: docs.length };
    console.error(`[notifications] ${label} FAILED (${docs.length} docs):`, err.message, real.length ? real.map((e) => e.errmsg || e.err?.errmsg) : err.stack);
    return { created: 0, existing: 0, error: err };
  }
}

const text = (field) => field?.en || field?.hi || field?.mr || "";
const jobName = (job) => text(job?.jobTitle) || "a job";

// Lowercase, strip punctuation; keeps Devanagari combining marks so Hindi/Marathi words stay whole.
const norm = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();

// Whole-word phrase containment ("driver" is in "car driver" but not in "screwdriver").
const hasPhrase = (haystack, phrase) => !!phrase && ` ${haystack} `.includes(` ${phrase} `);

const SKILL_ALIASES = {
  electrician: ["wireman", "lineman", "auto electrician"],
  "security guard": ["watchman", "gatekeeper"],
  "house maid": ["maid", "housekeeping"],
  "delivery boy": ["delivery rider", "delivery"],
  cleaner: ["sweeper", "cleaning"],
  gardener: ["mali"],
  mason: ["rajmistri", "brick layer"],
  cook: ["chef"],
};

// The job's trade (skills field) must contain the worker's skill, or the reverse.
// The free-text title is NOT used: "house painting" must not match a "House Maid".
function skillMatches(workerSkills, jobSkills) {
  const hay = norm(jobSkills);
  if (!hay) return false;
  return String(workerSkills || "")
    .split(/[,;|]/)
    .map(norm)
    .filter(Boolean)
    .some((phrase) =>
      [phrase, ...(SKILL_ALIASES[phrase] || [])].some((p) => hasPhrase(hay, p) || hasPhrase(p, hay)),
    );
}

const GENERIC_PLACES = new Set([
  "india", "andhra pradesh", "assam", "bihar", "chhattisgarh", "delhi", "goa", "gujarat", "haryana",
  "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "odisha",
  "punjab", "rajasthan", "tamil nadu", "telangana", "uttar pradesh", "uttarakhand", "west bengal",
]);
const GENERIC_WORDS = new Set(["road", "nagar", "near", "city", "east", "west", "north", "south", "colony", "sector", "phase", "area", "chowk", "marg"]);

// A comma-separated part of the worker's area must appear in the job's address
// (as a phrase, or with all its significant words). State/country names never count.
function locationMatches(workerLocation, jobLocation) {
  const job = norm(jobLocation);
  if (!job) return false;
  return String(workerLocation || "")
    .split(/[,;|\n]/)
    .map(norm)
    .filter((part) => part.length >= 3 && !GENERIC_PLACES.has(part))
    .some((part) => {
      if (hasPhrase(job, part)) return true;
      const words = part.split(" ").filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
      return words.length > 0 && words.every((w) => hasPhrase(job, w));
    });
}

function isNearby(worker, job) {
  const { lat, lng } = worker.currentLocation || {};
  return !!(lat && lng && job.latitude && job.longitude && distanceKm(lat, lng, job.latitude, job.longitude) <= NEARBY_RADIUS_KM);
}

// Exported for tests/diagnostics.
export const workerMatchesJob = (worker, job) =>
  skillMatches(worker.skills, text(job.skills) || text(job.jobTitle)) &&
  (locationMatches(worker.location, text(job.location)) || isNearby(worker, job));

export async function notifyMatchingWorkers(job) {
  try {
    const workers = await Worker.find({ skills: { $exists: true, $nin: [null, ""] } })
      .select("skills location currentLocation")
      .lean();
    const matched = workers.filter((w) => workerMatchesJob(w, job));
    console.log(`[notifications] job_match job=${job._id} candidates=${workers.length} matched=${matched.length}`);

    await createMany(
      matched.map((w) => ({
        recipient: w._id,
        role: ROLES.WORKER,
        type: "job_match",
        title: "New job matching your skills",
        message: `${jobName(job)}${text(job.location) ? ` in ${text(job.location)}` : ""} — ₹${job.salary}`,
        job: job._id,
        dedupeKey: `job_match:${job._id}`,
      })),
      "job_match",
    );
  } catch (err) {
    console.error("[notifications] job_match FAILED:", err.stack || err.message);
  }
}

export function notifyApplicationCreated(application, job) {
  const name = application.applicantName || "A worker";
  return createMany([
    {
      recipient: application.worker,
      role: ROLES.WORKER,
      type: "application_submitted",
      title: "Application submitted",
      message: `You applied for ${jobName(job)}.`,
      job: job._id,
      application: application._id,
      dedupeKey: `application_submitted:${application._id}`,
    },
    {
      recipient: application.employer,
      role: ROLES.EMPLOYER,
      type: "new_application",
      title: "New application",
      message: `${name} applied for ${jobName(job)}.`,
      job: job._id,
      application: application._id,
      dedupeKey: `new_application:${application._id}`,
    },
  ], "application_created");
}

// Older applications have no worker link; the worker is then identified by phone (as auth does).
const workerIdOf = async (application) =>
  application.worker ||
  (application.applicantContact && (await Worker.findOne({ phone: application.applicantContact }).select("_id").lean())?._id);

const DECISION_EVENTS = {
  accepted: { type: "application_accepted", title: "Application accepted - new offer", verb: "accepted. You have a new offer to confirm or reject" },
  declined: { type: "application_declined", title: "Application declined", verb: "declined" },
};

// Employer's accept / decline of a pending application -> tells the worker.
export async function notifyApplicationDecision(application, job, decision) {
  const event = DECISION_EVENTS[decision];
  if (!event) return;
  const workerId = await workerIdOf(application);
  if (!workerId) {
    console.warn(`[notifications] ${event.type} skipped: no worker for application ${application._id}`);
    return;
  }
  await createMany([
    {
      recipient: workerId,
      role: ROLES.WORKER,
      type: event.type,
      title: event.title,
      message: `Your application for ${jobName(job)} was ${event.verb}.`,
      job: job._id,
      application: application._id,
      dedupeKey: `${event.type}:${application._id}`,
    },
  ], event.type);
}

const OFFER_EVENTS = {
  confirmed: { type: "offer_confirmed", title: "Offer confirmed", verb: "confirmed" },
  rejected: { type: "offer_rejected", title: "Offer rejected", verb: "rejected" },
};

// Worker's confirm / reject of an offer -> tells the employer, and confirms to the worker.
export async function notifyOfferResponse(application, job, response) {
  const event = OFFER_EVENTS[response];
  if (!event) return;
  const workerId = await workerIdOf(application);
  const confirmed = response === "confirmed";
  await createMany([
    {
      recipient: application.employer,
      role: ROLES.EMPLOYER,
      type: event.type,
      title: event.title,
      message: `${application.applicantName || "A worker"} ${event.verb} the offer for ${jobName(job)}.`,
      job: job?._id,
      application: application._id,
      dedupeKey: `${event.type}:${application._id}`,
    },
    ...(workerId
      ? [
          {
            recipient: workerId,
            role: ROLES.WORKER,
            type: event.type,
            title: confirmed ? "Job confirmed" : "Offer rejected",
            message: confirmed ? `You accepted the offer. ${jobName(job)} is confirmed.` : `You rejected the offer for ${jobName(job)}.`,
            job: job?._id,
            application: application._id,
            dedupeKey: `${event.type}:${application._id}:worker`,
          },
        ]
      : []),
  ], event.type);
}

// Worker withdraws -> tells the employer. Employer cancels -> tells the worker.
export async function notifyApplicationEnded(application, job, status) {
  if (status === "withdrawn") {
    await createMany([
      {
        recipient: application.employer,
        role: ROLES.EMPLOYER,
        type: "application_withdrawn",
        title: "Application withdrawn",
        message: `${application.applicantName || "A worker"} withdrew from ${jobName(job)}.`,
        job: job?._id,
        application: application._id,
        dedupeKey: `application_withdrawn:${application._id}`,
      },
    ], "application_withdrawn");
    return;
  }
  const workerId = await workerIdOf(application);
  if (!workerId) return;
  await createMany([
    {
      recipient: workerId,
      role: ROLES.WORKER,
      type: "application_cancelled",
      title: "Job cancelled",
      message: `The employer cancelled your work for ${jobName(job)}.`,
      job: job?._id,
      application: application._id,
      dedupeKey: `application_cancelled:${application._id}`,
    },
  ], "application_cancelled");
}

const WORKER_STATUS_EVENTS = {
  on_the_way: { type: "worker_on_the_way", title: "Worker is on the way", verb: "is on the way for" },
  arrived: { type: "worker_arrived", title: "Worker has arrived", verb: "has arrived for" },
  completed: { type: "worker_completed", title: "Job completed by worker", verb: "marked as completed:" },
};

export async function notifyWorkerStatusChange(application, status) {
  const event = WORKER_STATUS_EVENTS[status];
  if (!event) return;
  const application_ = await application.populate("job", "jobTitle");
  await createMany([
    {
      recipient: application.employer,
      role: ROLES.EMPLOYER,
      type: event.type,
      title: event.title,
      message: `${application.applicantName || "A worker"} ${event.verb} ${jobName(application_.job)}.`,
      job: application_.job?._id,
      application: application._id,
      dedupeKey: `${event.type}:${application._id}`,
    },
  ], event.type);
}

// Employer rating is what completes an application from the employer's side.
export async function notifyApplicationRated(application) {
  const workerId = await workerIdOf(application);
  if (!workerId) {
    console.warn(`[notifications] application_completed skipped: no worker for application ${application._id}`);
    return;
  }
  const populated = await application.populate("job", "jobTitle");
  await createMany([
    {
      recipient: workerId,
      role: ROLES.WORKER,
      type: "application_completed",
      title: "Job completed",
      message: `${jobName(populated.job)} is complete. You were rated ${application.rating}/5.`,
      job: populated.job?._id,
      application: application._id,
      dedupeKey: `application_completed:${application._id}`,
    },
  ], "application_completed");
}

const STOP_COPY = {
  closed: {
    title: "Job closed",
    declined: (name) => `${name} was closed by the employer and your application was declined.`,
    held: (name) => `${name} was closed. Your application stays on hold until the employer reopens the job.`,
    offer: (name) => `${name} was closed to new applicants, but your offer is still valid. Please confirm or reject it.`,
  },
  filled: {
    title: "Job filled",
    declined: (name) => `All positions for ${name} were filled and your application was declined.`,
    offer: (name) => `All positions for ${name} are now filled. Your offer is still valid. Please confirm or reject it.`,
  },
  completed: {
    title: "Job completed",
    declined: (name) => `${name} was completed by the employer and your application was declined.`,
    offer: (name) => `${name} was completed. Your pending offer is still open. Please confirm or reject it.`,
  },
};

// Tells workers whose application is affected when an employer closes / fills / completes a job.
// `pending` / `offers` are application records. One notification per worker per close event.
export async function notifyJobClosed(job, { kind = "closed", pending = [], offers = [], declinedPending = false } = {}) {
  try {
    const copy = STOP_COPY[kind];
    if (!copy) return;
    const name = jobName(job);
    const stamp = new Date(job.closedAt || job.completedAt || job.updatedAt || Date.now()).getTime();
    const docs = [];
    for (const app of pending) {
      const message = declinedPending ? copy.declined(name) : copy.held?.(name);
      if (!message) continue;
      const recipient = await workerIdOf(app);
      if (recipient) docs.push({ recipient, role: ROLES.WORKER, type: "job_closed", title: copy.title, message, job: job._id, application: app._id, dedupeKey: `job_${kind}:${job._id}:${stamp}` });
    }
    for (const app of offers) {
      const recipient = await workerIdOf(app);
      if (recipient) docs.push({ recipient, role: ROLES.WORKER, type: "job_closed", title: copy.title, message: copy.offer(name), job: job._id, application: app._id, dedupeKey: `job_${kind}:${job._id}:${stamp}` });
    }
    await createMany(docs, `job_${kind}`);
  } catch (err) {
    console.error("[notifications] job_closed FAILED:", err.stack || err.message);
  }
}

// An employer edit that changes something applicants or hired workers rely on. One notification per worker per edit.
export async function notifyJobUpdated(job, labels, applications) {
  try {
    if (!labels.length) return;
    const name = jobName(job);
    const list = labels.join(", ");
    const docs = [];
    for (const app of applications) {
      const recipient = await workerIdOf(app);
      if (!recipient) continue;
      const hired = ["confirmed", "on_the_way", "arrived"].includes(app.status);
      docs.push({
        recipient,
        role: ROLES.WORKER,
        type: "job_updated",
        title: hired ? "Your confirmed job was updated" : "Job updated",
        message: hired ? `${name} was updated (${list}). Please review the details of your confirmed job.` : `${name} was updated (${list}). Please review before you respond.`,
        job: job._id,
        application: app._id,
        dedupeKey: `job_updated:${job._id}:${job.revision}`,
      });
    }
    await createMany(docs, "job_updated");
  } catch (err) {
    console.error("[notifications] job_updated FAILED:", err.stack || err.message);
  }
}

// ── Reading / managing (always scoped to the authenticated user's id AND role) ─
const scope = (auth) => ({ recipient: auth.id, role: auth.role });

function assertId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid notification id");
}

export async function listNotifications(auth, { page, limit, filter }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_PAGE_SIZE);
  const query = { ...scope(auth), ...(filter === "unread" && { isRead: false }) };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...scope(auth), isRead: false }),
  ]);
  return { notifications, total, unreadCount, page: p, limit: l, hasMore: p * l < total };
}

export async function getUnreadCount(auth) {
  return { unreadCount: await Notification.countDocuments({ ...scope(auth), isRead: false }) };
}

export async function markRead(auth, id) {
  assertId(id);
  const notification = await Notification.findOneAndUpdate(
    { _id: id, ...scope(auth) },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  ).lean();
  if (!notification) throw new HttpError(404, "Notification not found");
  return { notification };
}

export async function markAllRead(auth) {
  const { modifiedCount } = await Notification.updateMany(
    { ...scope(auth), isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return { updated: modifiedCount };
}

export async function deleteNotification(auth, id) {
  assertId(id);
  const deleted = await Notification.findOneAndDelete({ _id: id, ...scope(auth) });
  if (!deleted) throw new HttpError(404, "Notification not found");
  return { success: true };
}
