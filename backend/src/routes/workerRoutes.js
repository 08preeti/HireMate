import { Router } from "express";
import { sendOtp, verifyOtp, register } from "../controllers/workerAuthController.js";
import {
  profile,
  update,
  myJobs,
  jobAlerts,
  accept,
  jobHistory,
  location,
} from "../controllers/workerController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { otpLimiter } from "../middleware/rateLimiter.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
const workerOnly = [authenticate, requireRole(ROLES.WORKER)];

// Public: worker signup / login (OTP)
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/register", otpLimiter, register);

// Worker-only
router.get("/profile/:id", ...workerOnly, profile);
router.put("/update/:id", ...workerOnly, update);
router.get("/my-jobs/:phone", ...workerOnly, myJobs);
router.get("/job-alerts", ...workerOnly, jobAlerts);
router.post("/accept-job", ...workerOnly, accept);
router.get("/job-history/:workerId", ...workerOnly, jobHistory);
router.post("/update-location", ...workerOnly, location);

export default router;
