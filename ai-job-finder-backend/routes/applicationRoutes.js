import express from "express";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import authEmployer from "../middleware/authEmployer.js";

const router = express.Router();

/**
 * EMPLOYER RATE WORKER
 * POST /api/applications/rate/:id
 * Must come BEFORE /:jobId/apply to prevent route matching conflicts
 */
router.post("/rate/:id", authEmployer, async (req, res) => {

  try {

    const { rating, review } = req.body;
    console.log("📝 Rating request - ID:", req.params.id, "Rating:", rating, "Review:", review);

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        message: "Application not found"
      });
    }

    console.log("✅ Application found:", application._id);

    application.rating = rating;
    application.review = review;
    application.isCompleted = true;

    await application.save();
    console.log("✅ Application saved successfully");

    res.json({
      success: true,
      message: "Rating saved"
    });

  } catch (err) {

    console.error("❌ Error in rating endpoint:", err.message);
    console.error("Full error:", err);

    res.status(500).json({
      message: "Server error",
      error: err.message // Add error details in development
    });

  }

});

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

router.get("/test", (req, res) => {
  res.send("Applications route working");
});


/**
 * GET WORKER RATING BY NAME
 * /api/applications/rating/:name
 */
router.get("/rating/:name", async (req, res) => {

 try {

 const apps = await Application.find({
 applicantName: req.params.name,
 isCompleted: true
 });

 if(apps.length === 0){
 return res.json({
 rating: 0,
 total: 0
 });
 }

 const totalRating = apps.reduce(
 (sum,a)=> sum + a.rating,0
 );

 const avg = totalRating / apps.length;

 res.json({
 rating: avg.toFixed(1),
 total: apps.length
 });

 }
 catch(err){

 res.status(500).json({
 message:"Error"
 });

 }

});

export default router;
