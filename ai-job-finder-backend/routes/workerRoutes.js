/*  import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json([]);
});

export default router;  */


import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";

const router = express.Router();


/* ==========================
   REGISTER WORKER
   POST /api/workers/register
========================== */

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



/* ==========================
   GET WORKER PROFILE
   GET /api/workers/profile/:id
========================== */

router.get("/profile/:id", async (req, res) => {

  try {

    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found"
      });
    }


    // ⭐ Get Reviews

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



/* ==========================
   WORKER MY JOBS
   GET /api/workers/my-jobs/:phone
========================== */

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



/* ==========================
   JOB ALERTS
   GET /api/workers/job-alerts/:location
========================== */

/*  import Job from "../models/Job.js";

router.get("/job-alerts/:location", async (req,res)=>{

try{

const jobs = await Job.find({
  location:{
    $regex:req.params.location,
    $options:"i"
  },
  status:"active"
})
.sort({createdAt:-1})
.limit(5);

res.json(jobs);

}catch(err){

console.log(err);

res.status(500).json({
message:"Failed to fetch alerts"
});

}

});  */


import Job from "../models/Job.js";

/* ==========================
   JOB ALERTS BY GPS
   GET /api/workers/job-alerts
========================== */

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

export default router;