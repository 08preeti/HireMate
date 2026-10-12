import Job from "../models/Job.js";
import Application from "../models/Application.js";

export async function getDashboard(employerId) {
  const jobs = await Job.find({ employer: employerId });
  const applications = await Application.find({ employer: employerId });

  const jobsWithCounts = jobs.map((job) => ({
    ...job._doc,
    applicationCount: applications.filter((app) => app.job.toString() === job._id.toString()).length,
  }));

  return { totalJobs: jobs.length, totalApplications: applications.length, jobs: jobsWithCounts };
}
