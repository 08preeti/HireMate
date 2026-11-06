import mongoose from "mongoose";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { HttpError } from "../utils/httpError.js";

// Statuses that hold a vacancy. pending reserves nothing; rejected / withdrawn / cancelled / declined release it.
export const RESERVING_STATUSES = ["accepted", "confirmed", "on_the_way", "arrived", "completed"];

// A job posted before vacancies existed has no `vacancies` / `filledPositions` fields: treat it as 1 vacancy.
const vacanciesOf = (job) => (Number.isInteger(job.vacancies) && job.vacancies > 0 ? job.vacancies : 1);

// Mongo expression: filledPositions < vacancies (missing fields behave like 0 filled / 1 vacancy).
export const hasFreeVacancy = { $lt: [{ $ifNull: ["$filledPositions", 0] }, { $ifNull: ["$vacancies", 1] }] };

// Legacy jobs may lack the counter and/or the vacancy total in the database.
//  - filledPositions missing → initialise it from the applications that already hold a vacancy.
//  - vacancies missing → default to 1. An existing vacancies value (even a custom one) is NEVER overwritten.
// Each `$exists: false` filter makes its update idempotent and safe if two requests race.
export async function ensureCounter(jobId, session) {
  const legacy = await Job.exists({
    _id: jobId,
    $or: [{ filledPositions: { $exists: false } }, { vacancies: { $exists: false } }],
  }).session(session);
  if (!legacy) return;

  const needsCounter = await Job.exists({ _id: jobId, filledPositions: { $exists: false } }).session(session);
  if (needsCounter) {
    const held = await Application.countDocuments({ job: jobId, status: { $in: RESERVING_STATUSES } }).session(session);
    await Job.updateOne({ _id: jobId, filledPositions: { $exists: false } }, { $set: { filledPositions: held } }, { session });
  }
  await Job.updateOne({ _id: jobId, vacancies: { $exists: false } }, { $set: { vacancies: 1 } }, { session });
}

// ── Transactions (with a safe fallback) ─────────────────────────────────────
// MongoDB transactions need a replica set (e.g. Atlas) or a sharded cluster; a standalone
// mongod rejects them. Support is detected once. Set VACANCY_TRANSACTIONS=off to force the fallback.
let transactionsOk; // undefined = not checked yet

async function transactionsSupported() {
  if (process.env.VACANCY_TRANSACTIONS === "off") return false;
  if (transactionsOk !== undefined) return transactionsOk;
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsOk = !!(info.setName || info.msg === "isdbgrid");
  } catch {
    transactionsOk = false;
  }
  return transactionsOk;
}

const isTransactionUnsupported = (err) =>
  err?.code === 20 || /Transaction numbers are only allowed|replica set member or mongos/i.test(err?.message || "");

/**
 * Runs `work(session, onUndo)` so that all of its database writes succeed or none do.
 *  - Transactions available: everything runs in ONE transaction (rolled back on any error;
 *    transient conflicts are retried automatically, so `work` must only touch the database).
 *  - Otherwise `session` is null and each write is still atomic on its own document. Steps that
 *    must be undone if a LATER step fails are registered with onUndo(fn); on error they run in
 *    reverse order (compensating updates). If a compensation itself fails it is logged.
 */
export async function runAtomic(work) {
  if (await transactionsSupported()) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session, () => {}); // rollback replaces compensation
      });
      return result;
    } catch (err) {
      if (!isTransactionUnsupported(err)) throw err;
      transactionsOk = false; // deployment cannot do transactions: use the fallback below
    } finally {
      await session.endSession();
    }
  }

  const undo = [];
  try {
    return await work(null, (fn) => undo.push(fn));
  } catch (err) {
    for (const fn of undo.reverse()) {
      try {
        await fn();
      } catch (undoErr) {
        console.error("⚠️ Vacancy compensation failed — run reconcileVacancies(jobId):", undoErr);
      }
    }
    throw err;
  }
}

// A job must never stay "filled" while a vacancy is free (e.g. data left by an older race).
export async function healJobStatus(jobId, session = null) {
  const res = await Job.updateOne(
    { _id: jobId, status: "filled", $expr: hasFreeVacancy },
    { $set: { status: "active" } },
    { session },
  );
  return res.modifiedCount > 0;
}

// An active job whose last vacancy is taken becomes "filled" (the mirror of healJobStatus).
export async function fillIfFull(jobId, session = null) {
  const res = await Job.updateOne(
    { _id: jobId, status: "active", $expr: { $not: [hasFreeVacancy] } },
    { $set: { status: "filled" } },
    { session },
  );
  return res.modifiedCount > 0;
}

/** Adds vacancies / filledPositions / availablePositions to a job (plain object or document). */
export function withVacancyCounts(job) {
  if (!job) return job;
  const plain = typeof job.toObject === "function" ? job.toObject() : { ...job };
  const total = vacanciesOf(plain);
  const filled = Math.min(Number.isInteger(plain.filledPositions) ? plain.filledPositions : 0, total);
  return { ...plain, vacancies: total, filledPositions: filled, availablePositions: Math.max(0, total - filled) };
}

/** Same as withVacancyCounts, but legacy jobs (no counter yet) get their count from the applications. */
export async function withVacancyCountsFor(jobs) {
  return Promise.all(
    jobs.map(async (job) => {
      const plain = typeof job.toObject === "function" ? job.toObject() : { ...job };
      if (!Number.isInteger(plain.filledPositions)) {
        plain.filledPositions = await Application.countDocuments({ job: plain._id, status: { $in: RESERVING_STATUSES } });
      }
      return withVacancyCounts(plain);
    }),
  );
}

/** A job may receive new applications only while it is active and still has a free vacancy. */
export function assertJobOpen(job) {
  if (job.status !== "active") {
    throw new HttpError(409, job.status === "filled" ? "All vacancies for this job are filled" : "This job is no longer accepting applications");
  }
  const filled = Number.isInteger(job.filledPositions) ? job.filledPositions : 0;
  if (filled >= vacanciesOf(job)) throw new HttpError(409, "All vacancies for this job are filled");
}

/**
 * Reserves ONE vacancy with a SINGLE atomic update that checks "is there room?", increments the
 * counter AND flips the job to "filled" when it was the last one. Because counter and status change
 * in the same document write, a concurrent release can never leave a job "filled" with room free.
 */
export async function reserveVacancy(jobId, session = null) {
  await ensureCounter(jobId, session);
  await healJobStatus(jobId, session);
  const job = await Job.findOneAndUpdate(
    { _id: jobId, status: "active", $expr: hasFreeVacancy },
    [
      { $set: { filledPositions: { $add: [{ $ifNull: ["$filledPositions", 0] }, 1] } } },
      { $set: { status: { $cond: [{ $gte: ["$filledPositions", { $ifNull: ["$vacancies", 1] }] }, "filled", "$status"] } } },
    ],
    { new: true, session },
  );
  if (!job) {
    const current = await Job.findById(jobId).select("status").session(session);
    if (!current) throw new HttpError(404, "Job not found");
    throw new HttpError(
      409,
      current.status === "active" || current.status === "filled"
        ? "All vacancies for this job are already filled"
        : "This job is closed, so applications cannot be accepted",
    );
  }
  return job;
}

/**
 * Releases ONE reserved vacancy (never below 0) with a single atomic update that also reopens a
 * "filled" job once room exists. A job the employer closed manually stays closed.
 */
export async function releaseVacancy(jobId, session = null) {
  await ensureCounter(jobId, session);
  return Job.findOneAndUpdate(
    { _id: jobId, filledPositions: { $gt: 0 } },
    [
      { $set: { filledPositions: { $subtract: ["$filledPositions", 1] } } },
      {
        $set: {
          status: {
            $cond: [
              { $and: [{ $eq: ["$status", "filled"] }, { $lt: ["$filledPositions", { $ifNull: ["$vacancies", 1] }] }] },
              "active",
              "$status",
            ],
          },
        },
      },
    ],
    { new: true, session },
  );
}

/**
 * Maintenance helper (not called by the API): recomputes a job's counter from its applications and
 * fixes its status. Use it if a compensation failure was logged.
 */
export async function reconcileVacancies(jobId) {
  const held = await Application.countDocuments({ job: jobId, status: { $in: RESERVING_STATUSES } });
  await Job.updateOne({ _id: jobId }, { $set: { filledPositions: held } });
  await Job.updateOne({ _id: jobId, status: "active", $expr: { $gte: ["$filledPositions", { $ifNull: ["$vacancies", 1] }] } }, { $set: { status: "filled" } });
  await healJobStatus(jobId);
}

export const isValidId = (id) => mongoose.isValidObjectId(id);
