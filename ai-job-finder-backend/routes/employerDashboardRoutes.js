import express from "express";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import authEmployer from "../middleware/authEmployer.js";

const router = express.Router();

router.get("/", authEmployer, async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.employer._id });
    const applications = await Application.find({
      employer: req.employer._id,
    });

    const jobsWithCounts = jobs.map((job) => {
      const count = applications.filter(
        (app) => app.job.toString() === job._id.toString()
      ).length;

      return {
        ...job._doc,
        applicationCount: count,
      };
    });

    res.json({
      totalJobs: jobs.length,
      totalApplications: applications.length,
      jobs: jobsWithCounts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard error" });
  }
});

export default router;   // ✅ VERY IMPORTANT
