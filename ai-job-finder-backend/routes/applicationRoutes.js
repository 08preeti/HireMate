import express from "express";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import authEmployer from "../middleware/authEmployer.js";

const router = express.Router();

/**
 * WORKER APPLY TO JOB
 * POST /api/applications/:jobId/apply
 */
router.post("/:jobId/apply", async (req, res) => {
  try {
    const { applicantName, applicantContact, message } = req.body;

    if (!applicantName || !applicantContact) {
      return res.status(400).json({ message: "Name and contact required" });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const application = await Application.create({
      job: job._id,
      employer: job.employer,   // ✅ VERY IMPORTANT
      applicantName,
      applicantContact,
      message,
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Apply failed" });
  }
});

/**
 * EMPLOYER VIEW APPLICATIONS
 * GET /api/applications/employer
 */
router.get("/employer", authEmployer, async (req, res) => {
  try {

    console.log("Logged in employer ID:", req.employer.id);

    const applications = await Application.find().populate("job");

    console.log("Total applications in DB:", applications.length);

    res.json({ applications });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});


export default router;
