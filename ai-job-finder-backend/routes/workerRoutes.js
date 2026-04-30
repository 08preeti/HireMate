/*
import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";

const router = express.Router();

// In-memory OTP store { phone: { otp, expires } }
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10)
      return res.status(400).json({ message: "Valid phone number required" });

    const otp = generateOTP();
    otpStore.set(phone, { otp, expires: Date.now() + 15 * 60 * 1000 }); // 15 minutes

    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      success: true,
      message: "OTP sent",
      otp: otp, // Always return for demo — in real production use SMS service
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name, skills, location } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    const stored = otpStore.get(phone);
    if (!stored || Date.now() > stored.expires) {
      otpStore.delete(phone);
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }
    if (stored.otp !== otp)
      return res.status(400).json({ message: "Wrong OTP. Try again." });

    otpStore.delete(phone);

    let worker = await Worker.findOne({ phone });
    if (!worker) {
      if (!name) return res.status(400).json({ message: "Name required for new registration" });
      worker = await Worker.create({ name, phone, skills: skills || "", location: location || "" });
    }

    res.json({ success: true, worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});


router.post("/register", async (req, res) => {
  try {
    const { name, skills, location, contact } = req.body;
    if (!name || !contact)
      return res.status(400).json({ message: "Name and contact are required" });
    const worker = await Worker.create({ name, skills, location, phone: contact });
    res.json(worker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Worker registration failed" });
  }
});


router.get("/profile/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    const reviews = await Application.find({ worker: worker._id, isCompleted: true });
    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    }
    res.json({ ...worker._doc, rating: avgRating.toFixed(1), totalReviews: reviews.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/update/:id", async (req, res) => {
  try {
    const { location, name, skills } = req.body;
    const updated = await Worker.findByIdAndUpdate(
      req.params.id,
      { ...(location && { location }), ...(name && { name }), ...(skills && { skills }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Worker not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});


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


router.get("/job-alerts", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
    const wLat = parseFloat(lat);
    const wLng = parseFloat(lng);
    const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 });
    const nearby = jobs.filter((job) => {
      if (!job.latitude || !job.longitude) return false;
      const R = 6371;
      const dLat = ((job.latitude - wLat) * Math.PI) / 180;
      const dLon = ((job.longitude - wLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((wLat * Math.PI) / 180) * Math.cos((job.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 20;
    });
    res.json(nearby);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});


router.post("/accept-job", async (req, res) => {
  try {
    const { workerId, jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const existing = await Application.findOne({ job: jobId, worker: workerId });
    if (existing) return res.status(400).json({ message: "Already accepted" });
    const app = await Application.create({
      job: jobId, employer: job.employer, worker: workerId,
      applicantName: "", applicantContact: "", message: "", isCompleted: false,
    });
    res.json({ message: "Job Accepted", applicationId: app._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/job-history/:workerId", async (req, res) => {
  try {
    const apps = await Application.find({ worker: req.params.workerId }).populate("job");
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
});


router.post("/update-location", async (req, res) => {
  try {
    const { workerId, lat, lng } = req.body;
    await Worker.findByIdAndUpdate(workerId, { currentLocation: { lat, lng } });
    res.json({ message: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed" });
  }
});

export default router;  */




//-------------------
/*
import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";

const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10)
      return res.status(400).json({ message: "Valid phone number required" });

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    
    await Worker.findOneAndUpdate(
      { phone },
      { otp, otpExpires: expires },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      success: true,
      message: "OTP sent",
      otp: otp, // Always return for demo
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name, skills, location } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

   
    const worker = await Worker.findOne({ phone });

    if (!worker || !worker.otp) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }

    if (new Date() > new Date(worker.otpExpires)) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (worker.otp !== otp) {
      return res.status(400).json({ message: "Wrong OTP. Please try again." });
    }

   
    await Worker.findByIdAndUpdate(worker._id, { otp: null, otpExpires: null });

    
    if (!worker.name) {
      if (!name) {
        return res.status(400).json({ message: "Name required for new registration" });
      }
      const updated = await Worker.findByIdAndUpdate(
        worker._id,
        { name, skills: skills || "", location: location || "" },
        { new: true }
      );
      return res.json({ success: true, worker: updated });
    }

   
    res.json({ success: true, worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});


router.post("/register", async (req, res) => {
  try {
    const { name, skills, location, contact } = req.body;
    if (!name || !contact)
      return res.status(400).json({ message: "Name and contact are required" });

    let worker = await Worker.findOne({ phone: contact });
    if (worker) {
      worker = await Worker.findByIdAndUpdate(
        worker._id,
        { name, skills, location },
        { new: true }
      );
    } else {
      worker = await Worker.create({ name, skills, location, phone: contact });
    }
    res.json(worker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Worker registration failed" });
  }
});


router.get("/profile/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    const reviews = await Application.find({ worker: worker._id, isCompleted: true });
    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    }
    res.json({ ...worker._doc, rating: avgRating.toFixed(1), totalReviews: reviews.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/update/:id", async (req, res) => {
  try {
    const { location, name, skills } = req.body;
    const updated = await Worker.findByIdAndUpdate(
      req.params.id,
      { ...(location && { location }), ...(name && { name }), ...(skills && { skills }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Worker not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});


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


router.get("/job-alerts", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
    const wLat = parseFloat(lat);
    const wLng = parseFloat(lng);
    const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 });
    const nearby = jobs.filter((job) => {
      if (!job.latitude || !job.longitude) return false;
      const R = 6371;
      const dLat = ((job.latitude - wLat) * Math.PI) / 180;
      const dLon = ((job.longitude - wLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((wLat * Math.PI) / 180) * Math.cos((job.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 20;
    });
    res.json(nearby);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});


router.post("/accept-job", async (req, res) => {
  try {
    const { workerId, jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const existing = await Application.findOne({ job: jobId, worker: workerId });
    if (existing) return res.status(400).json({ message: "Already accepted" });
    const app = await Application.create({
      job: jobId, employer: job.employer, worker: workerId,
      applicantName: "", applicantContact: "", message: "", isCompleted: false,
    });
    res.json({ message: "Job Accepted", applicationId: app._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/job-history/:workerId", async (req, res) => {
  try {
    const apps = await Application.find({ worker: req.params.workerId }).populate("job");
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
});


router.post("/update-location", async (req, res) => {
  try {
    const { workerId, lat, lng } = req.body;
    await Worker.findByIdAndUpdate(workerId, { currentLocation: { lat, lng } });
    res.json({ message: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed" });
  }
});

export default router;  */




//---------------------------------------
/*
import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";

const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10)
      return res.status(400).json({ message: "Valid phone number required" });

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in MongoDB — survives server restarts and spin-downs
    await Worker.findOneAndUpdate(
      { phone },
      { otp, otpExpires: expires },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${phone}: ${otp}`);

    // Try Fast2SMS if API key is set
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    let smsSent = false;

    if (fast2smsKey) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "otp",
            variables_values: otp,
            numbers: phone,
          }),
        });
        const smsData = await smsRes.json();
        if (smsData.return === true) {
          smsSent = true;
          console.log(`✅ SMS sent to ${phone}`);
        } else {
          console.log("Fast2SMS error:", smsData.message);
        }
      } catch (smsErr) {
        console.log("Fast2SMS failed:", smsErr.message);
      }
    }

    res.json({
      success: true,
      message: smsSent ? "OTP sent to your phone" : "OTP sent",
      // Always return OTP for demo — remove in production
      otp: otp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name, skills, location } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    // Find worker and check OTP from DB
    const worker = await Worker.findOne({ phone });

    if (!worker || !worker.otp) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }

    if (new Date() > new Date(worker.otpExpires)) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (worker.otp !== otp) {
      return res.status(400).json({ message: "Wrong OTP. Please try again." });
    }

    
    await Worker.findByIdAndUpdate(worker._id, { otp: null, otpExpires: null });

    
    if (!worker.name) {
      if (!name) {
        return res.status(400).json({ message: "Name required for new registration" });
      }
      const updated = await Worker.findByIdAndUpdate(
        worker._id,
        { name, skills: skills || "", location: location || "" },
        { new: true }
      );
      return res.json({ success: true, worker: updated });
    }

   
    res.json({ success: true, worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});


router.post("/register", async (req, res) => {
  try {
    const { name, skills, location, contact } = req.body;
    if (!name || !contact)
      return res.status(400).json({ message: "Name and contact are required" });

    let worker = await Worker.findOne({ phone: contact });
    if (worker) {
      worker = await Worker.findByIdAndUpdate(
        worker._id,
        { name, skills, location },
        { new: true }
      );
    } else {
      worker = await Worker.create({ name, skills, location, phone: contact });
    }
    res.json(worker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Worker registration failed" });
  }
});

router.get("/profile/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    const reviews = await Application.find({ worker: worker._id, isCompleted: true });
    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    }
    res.json({ ...worker._doc, rating: avgRating.toFixed(1), totalReviews: reviews.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/update/:id", async (req, res) => {
  try {
    const { location, name, skills } = req.body;
    const updated = await Worker.findByIdAndUpdate(
      req.params.id,
      { ...(location && { location }), ...(name && { name }), ...(skills && { skills }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Worker not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

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


router.get("/job-alerts", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
    const wLat = parseFloat(lat);
    const wLng = parseFloat(lng);
    const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 });
    const nearby = jobs.filter((job) => {
      if (!job.latitude || !job.longitude) return false;
      const R = 6371;
      const dLat = ((job.latitude - wLat) * Math.PI) / 180;
      const dLon = ((job.longitude - wLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((wLat * Math.PI) / 180) * Math.cos((job.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 20;
    });
    res.json(nearby);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});


router.post("/accept-job", async (req, res) => {
  try {
    const { workerId, jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const existing = await Application.findOne({ job: jobId, worker: workerId });
    if (existing) return res.status(400).json({ message: "Already accepted" });
    const app = await Application.create({
      job: jobId, employer: job.employer, worker: workerId,
      applicantName: "", applicantContact: "", message: "", isCompleted: false,
    });
    res.json({ message: "Job Accepted", applicationId: app._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/job-history/:workerId", async (req, res) => {
  try {
    const apps = await Application.find({ worker: req.params.workerId }).populate("job");
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
});


router.post("/update-location", async (req, res) => {
  try {
    const { workerId, lat, lng } = req.body;
    await Worker.findByIdAndUpdate(workerId, { currentLocation: { lat, lng } });
    res.json({ message: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed" });
  }
});

export default router; */



import express from "express";
import Worker from "../models/Worker.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";

const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* SEND OTP — POST /api/workers/send-otp */
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10)
      return res.status(400).json({ message: "Valid phone number required" });

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in MongoDB — survives server restarts and spin-downs
    await Worker.findOneAndUpdate(
      { phone },
      { otp, otpExpires: expires },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${phone}: ${otp}`);

    // Try Fast2SMS if API key is set
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    let smsSent = false;

    if (fast2smsKey) {
      try {
        // Clean phone number - remove +91 or 0 prefix
        const cleanPhone = phone.replace(/^(\+91|91|0)/, "").slice(-10);

        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",  // Quick SMS - no DLT registration needed
            message: `Your HireMate OTP is ${otp}. Valid for 15 minutes. Do not share with anyone.`,
            language: "english",
            flash: 0,
            numbers: cleanPhone,
          }),
        });
        const smsData = await smsRes.json();
        console.log("Fast2SMS response:", JSON.stringify(smsData));
        if (smsData.return === true) {
          smsSent = true;
          console.log(`✅ SMS sent to ${cleanPhone}`);
        } else {
          console.log("Fast2SMS error:", smsData.message || JSON.stringify(smsData));
        }
      } catch (smsErr) {
        console.log("Fast2SMS failed:", smsErr.message);
      }
    }

    res.json({
      success: true,
      message: smsSent ? "OTP sent to your phone" : "OTP sent",
      // Always return OTP for demo — remove in production
      otp: otp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* VERIFY OTP — POST /api/workers/verify-otp */
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name, skills, location } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    // Find worker and check OTP from DB
    const worker = await Worker.findOne({ phone });

    if (!worker || !worker.otp) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }

    if (new Date() > new Date(worker.otpExpires)) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (worker.otp !== otp) {
      return res.status(400).json({ message: "Wrong OTP. Please try again." });
    }

    // Clear OTP after use
    await Worker.findByIdAndUpdate(worker._id, { otp: null, otpExpires: null });

    // New worker — no name yet
    if (!worker.name) {
      if (!name) {
        return res.status(400).json({ message: "Name required for new registration" });
      }
      const updated = await Worker.findByIdAndUpdate(
        worker._id,
        { name, skills: skills || "", location: location || "" },
        { new: true }
      );
      return res.json({ success: true, worker: updated });
    }

    // Existing worker
    res.json({ success: true, worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});

/* REGISTER — POST /api/workers/register */
router.post("/register", async (req, res) => {
  try {
    const { name, skills, location, contact } = req.body;
    if (!name || !contact)
      return res.status(400).json({ message: "Name and contact are required" });

    let worker = await Worker.findOne({ phone: contact });
    if (worker) {
      worker = await Worker.findByIdAndUpdate(
        worker._id,
        { name, skills, location },
        { new: true }
      );
    } else {
      worker = await Worker.create({ name, skills, location, phone: contact });
    }
    res.json(worker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Worker registration failed" });
  }
});

/* GET PROFILE — GET /api/workers/profile/:id */
router.get("/profile/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    const reviews = await Application.find({ worker: worker._id, isCompleted: true });
    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    }
    res.json({ ...worker._doc, rating: avgRating.toFixed(1), totalReviews: reviews.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* UPDATE PROFILE — PUT /api/workers/update/:id */
router.put("/update/:id", async (req, res) => {
  try {
    const { location, name, skills } = req.body;
    const updated = await Worker.findByIdAndUpdate(
      req.params.id,
      { ...(location && { location }), ...(name && { name }), ...(skills && { skills }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Worker not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

/* MY JOBS — GET /api/workers/my-jobs/:phone */
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

/* JOB ALERTS — GET /api/workers/job-alerts?lat=&lng= */
router.get("/job-alerts", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
    const wLat = parseFloat(lat);
    const wLng = parseFloat(lng);
    const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 });
    const nearby = jobs.filter((job) => {
      if (!job.latitude || !job.longitude) return false;
      const R = 6371;
      const dLat = ((job.latitude - wLat) * Math.PI) / 180;
      const dLon = ((job.longitude - wLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((wLat * Math.PI) / 180) * Math.cos((job.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 20;
    });
    res.json(nearby);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});

/* ACCEPT JOB — POST /api/workers/accept-job */
router.post("/accept-job", async (req, res) => {
  try {
    const { workerId, jobId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const existing = await Application.findOne({ job: jobId, worker: workerId });
    if (existing) return res.status(400).json({ message: "Already accepted" });
    const app = await Application.create({
      job: jobId, employer: job.employer, worker: workerId,
      applicantName: "", applicantContact: "", message: "", isCompleted: false,
    });
    res.json({ message: "Job Accepted", applicationId: app._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* JOB HISTORY — GET /api/workers/job-history/:workerId */
router.get("/job-history/:workerId", async (req, res) => {
  try {
    const apps = await Application.find({ worker: req.params.workerId }).populate("job");
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
});

/* UPDATE LOCATION — POST /api/workers/update-location */
router.post("/update-location", async (req, res) => {
  try {
    const { workerId, lat, lng } = req.body;
    await Worker.findByIdAndUpdate(workerId, { currentLocation: { lat, lng } });
    res.json({ message: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed" });
  }
});

export default router;