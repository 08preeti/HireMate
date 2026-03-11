import express from "express";
import Job from "../models/Job.js";
import authEmployer from "../middleware/authEmployer.js";

const router = express.Router();

/**
 * ✅ POST JOB (EMPLOYER)
 * POST /api/jobs
 */
router.post("/", authEmployer, async (req, res) => {
  try {
    const {
      jobTitle,
      description,
      skills,
      location,
      latitude,
      longitude,
      salary,
      paymentMethod,
      isUrgent,
    } = req.body;

    const job = await Job.create({
  jobTitle: {
    en: jobTitle,
    hi: jobTitle,
    mr: jobTitle,
  },

  description: {
    en: description,
    hi: description,
    mr: description,
  },

  skills: {
    en: skills,
    hi: skills,
    mr: skills,
  },

  location: {
    en: location,
    hi: location,
    mr: location,
  },

  latitude,
  longitude,

  salary,
  paymentMethod,
  isUrgent,

  employer: req.employer._id,
  status: "active",
});

    res.status(201).json(job);
  } catch (error) {
    console.error("Post Job Error:", error);
    res.status(500).json({ message: "Failed to post job" });
  }
});

/* GET ALL JOBS */
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find({ status: "active" })
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});


/* GET SINGLE JOB BY ID */
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job" });
  }
});


export default router;
