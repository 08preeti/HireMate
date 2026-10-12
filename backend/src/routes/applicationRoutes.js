import { Router } from "express";
import {
  rate,
  employerLive,
  employerList,
  apply,
  updateStatus,
  ratingByName,
} from "../controllers/applicationController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
const employerOnly = [authenticate, requireRole(ROLES.EMPLOYER)];
const workerOnly = [authenticate, requireRole(ROLES.WORKER)];

// Employer-only (static paths first so they are not captured by "/:jobId/apply")
router.post("/rate/:id", ...employerOnly, rate);
router.get("/employer/live", ...employerOnly, employerLive);
router.get("/employer", ...employerOnly, employerList);
router.get("/rating/:name", ...employerOnly, ratingByName);

// Worker-only
router.put("/status/:id", ...workerOnly, updateStatus);
router.post("/:jobId/apply", ...workerOnly, apply);

export default router;
