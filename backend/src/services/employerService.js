import Application from "../models/Application.js";
import Worker from "../models/Worker.js";
import { listEmployerJobs } from "./employerJobService.js";

export async function getDashboard(employerId) {
  const { jobs, summary } = await listEmployerJobs(employerId);
  return {
    totalJobs: summary.totalJobs,
    totalApplications: summary.totalApplications,
    jobs,
    stats: summary,
  };
}

/**
 * Every worker who has created a work profile (a name is saved), newest first.
 * Only non-private fields are returned — never the OTP, phone number or GPS location. `busy` = currently on the way / on site for a job.
 */
export async function listWorkers() {
  const workers = await Worker.find({
    name: { $exists: true, $nin: [null, ""] },
  })
    .select(
      "name skills location gender rating totalReviews createdAt",
    )
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const busyIds = new Set(
    (
      await Application.find({
        worker: { $in: workers.map((w) => w._id) },
        status: { $in: ["on_the_way", "arrived"] },
        isCompleted: { $ne: true },
      }).distinct("worker")
    ).map(String),
  );

  return {
    total: workers.length,
    workers: workers.map((w) => ({ ...w, busy: busyIds.has(String(w._id)) })),
  };
}
