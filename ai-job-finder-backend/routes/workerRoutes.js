/* import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";

const router = express.Router();

router.post("/register", async (req, res) => {

  try {

    const { name, skills, location, contact } = req.body;

    const worker = await Worker.create({
      name,
      skills,
      location,
      phone: contact
    });

    res.json(worker);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Worker registration failed"
    });

  }

});

router.get("/profile/:id", async (req, res) => {

  try {

    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found"
      });
    }


    

    const reviews = await Application.find({
      applicantContact: worker.phone,
      isCompleted: true
    });


    let avgRating = 0;

    if (reviews.length > 0) {

      const total =
        reviews.reduce((sum, r) =>
          sum + (r.rating || 0), 0);

      avgRating = total / reviews.length;

    }


    res.json({

      ...worker._doc,

      rating: avgRating.toFixed(1),

      totalReviews: reviews.length

    });


  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});

router.put("/update/:id", async (req, res) => {

  try {

    const { location } = req.body;

    const updatedWorker = await Worker.findByIdAndUpdate(
      req.params.id,
      { location },
      { new: true }
    );

    if (!updatedWorker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.json(updatedWorker);

  } catch (err) {

    console.log(err);
    res.status(500).json({ message: "Update failed" });

  }

});


router.get("/my-jobs/:phone", async (req, res) => {

  try {

    const applications = await Application.find({
      applicantContact: req.params.phone
    }).populate("job");


    res.json(applications);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Failed to fetch jobs"
    });

  }

});


import Job from "../models/Job.js";

router.get("/job-alerts", async (req, res) => {

  try {

    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        message: "Latitude and longitude required"
      });
    }

    const jobs = await Job.find({
      status: "active"
    }).sort({ createdAt: -1 });

    res.json(jobs);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Failed to fetch alerts"
    });

  }

});


router.post("/accept-job", async (req,res)=>{

try{

const {workerId,jobId} = req.body;

// 🔥 find job first to get employer
const job = await Job.findById(jobId);

if(!job){
  return res.status(404).json({message:"Job not found"});
}

const application = new Application({

job: jobId,
employer: job.employer,   // ✅ REQUIRED
worker:  workerId,
applicantName: "",        // optional
applicantContact: "",     // optional
message: "",
isCompleted: false

});

await application.save();

res.json({
message:"Job Accepted"
});

}catch(error){

console.log("Accept Job Error:", error);
res.status(500).json({message:"Server error"});

}

});

router.get("/job-history/:workerId", async (req,res)=>{

try{

const applications = await Application
.find({ worker: req.params.workerId })
.populate("job");

res.json(applications);

}catch(error){

console.log(error);

res.status(500).json({
message:"Error loading history"
});

}

});


router.post("/update-location", async (req, res) => {

  try {

    const { workerId, lat, lng } = req.body;

    await Worker.findByIdAndUpdate(workerId, {
      currentLocation: { lat, lng }
    });

    res.json({ message: "Location updated" });

  } catch (err) {

    console.log(err);
    res.status(500).json({ message: "Failed to update location" });

  }

});

export default router; */



//-------------------------
import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";

const router = express.Router();

/* ==========================
   REGISTER WORKER
   POST /api/workers/register
========================== */
router.post("/register", async (req, res) => {
  try {
    const { name, skills, location, contact } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ message: "Name and contact are required" });
    }

    const worker = await Worker.create({
      name,
      skills,
      location,
      phone: contact,
    });

    res.json(worker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Worker registration failed" });
  }
});

/* ==========================
   GET WORKER PROFILE
   GET /api/workers/profile/:id
========================== */
router.get("/profile/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // ✅ FIXED: was using applicantContact (phone) to find reviews
    // Now uses worker ObjectId — consistent with accept-job flow
    const reviews = await Application.find({
      worker: worker._id,
      isCompleted: true,
    });

    let avgRating = 0;
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      avgRating = total / reviews.length;
    }

    res.json({
      ...worker._doc,
      rating: avgRating.toFixed(1),
      totalReviews: reviews.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================
   UPDATE WORKER PROFILE
   PUT /api/workers/update/:id
========================== */
router.put("/update/:id", async (req, res) => {
  try {
    const { location } = req.body;

    const updatedWorker = await Worker.findByIdAndUpdate(
      req.params.id,
      { location },
      { new: true }
    );

    if (!updatedWorker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.json(updatedWorker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

/* ==========================
   WORKER MY JOBS
   GET /api/workers/my-jobs/:phone
========================== */
router.get("/my-jobs/:phone", async (req, res) => {
  try {
    const applications = await Application.find({
      applicantContact: req.params.phone,
    }).populate("job");

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

/* ==========================
   JOB ALERTS BY GPS
   GET /api/workers/job-alerts?lat=XX&lng=XX
========================== */
router.get("/job-alerts", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    const workerLat = parseFloat(lat);
    const workerLng = parseFloat(lng);

    const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 });

    // ✅ FIXED: was returning ALL jobs, ignoring lat/lng completely
    // Now filters to jobs within 20km using Haversine formula
    const nearby = jobs.filter((job) => {
      if (!job.latitude || !job.longitude) return false;

      const R = 6371; // Earth radius in km
      const dLat = ((job.latitude - workerLat) * Math.PI) / 180;
      const dLon = ((job.longitude - workerLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((workerLat * Math.PI) / 180) *
          Math.cos((job.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= 20; // within 20 km
    });

    res.json(nearby);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});

/* ==========================
   ACCEPT JOB
   POST /api/workers/accept-job
========================== */
router.post("/accept-job", async (req, res) => {
  try {
    const { workerId, jobId } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // ✅ FIXED: was creating duplicate applications on every click
    const existing = await Application.findOne({ job: jobId, worker: workerId });
    if (existing) {
      return res.status(400).json({ message: "You already accepted this job" });
    }

    const application = new Application({
      job: jobId,
      employer: job.employer,
      worker: workerId,
      applicantName: "",
      applicantContact: "",
      message: "",
      isCompleted: false,
    });

    await application.save();

    // Return applicationId so the worker app can update status (on_the_way, arrived, completed)
    res.json({ message: "Job Accepted", applicationId: application._id });
  } catch (error) {
    console.error("Accept Job Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================
   JOB HISTORY
   GET /api/workers/job-history/:workerId
========================== */
router.get("/job-history/:workerId", async (req, res) => {
  try {
    const applications = await Application.find({
      worker: req.params.workerId,
    }).populate("job");

    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error loading history" });
  }
});

/* ==========================
   UPDATE WORKER LOCATION
   POST /api/workers/update-location
========================== */
router.post("/update-location", async (req, res) => {
  try {
    const { workerId, lat, lng } = req.body;

    // ✅ FIXED: schema now has correct lat/lng field names (was let/lan)
    await Worker.findByIdAndUpdate(workerId, {
      currentLocation: { lat, lng },
    });

    res.json({ message: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update location" });
  }
});

export default router;