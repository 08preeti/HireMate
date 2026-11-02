import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Worker from "../models/Worker.js";

export async function getDashboard(employerId) {
  const jobs = await Job.find({ employer: employerId });
  const applications = await Application.find({ employer: employerId });

  const jobsWithCounts = jobs.map((job) => ({
    ...job._doc,
    applicationCount: applications.filter(
      (app) => app.job.toString() === job._id.toString(),
    ).length,
  }));

  return {
    totalJobs: jobs.length,
    totalApplications: applications.length,
    jobs: jobsWithCounts,
  };
}

/**
 * Every worker who has created a work profile (a name is saved), newest first.
 * Only safe fields are returned — never the OTP. `busy` = currently on the way / on site for a job.
 */
export async function listWorkers() {
  const workers = await Worker.find({
    name: { $exists: true, $nin: [null, ""] },
  })
    .select(
      "name phone skills location gender rating totalReviews currentLocation createdAt",
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
