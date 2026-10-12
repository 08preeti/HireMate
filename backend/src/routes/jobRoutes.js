import { Router } from "express";
import { postJob, listJobs, getJobById, report } from "../controllers/jobController.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { requireRole, allowVisitorOr } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

// Employer-only: post a job
router.post("/", authenticate, requireRole(ROLES.EMPLOYER), postJob);

// Worker-only: report a job
router.post("/report/:id", authenticate, requireRole(ROLES.WORKER), report);

// Browsing: visitors ("Browse jobs without login") and workers. Employers are blocked.
router.get("/", optionalAuthenticate, allowVisitorOr(ROLES.WORKER), listJobs);
router.get("/:id", optionalAuthenticate, allowVisitorOr(ROLES.WORKER), getJobById);

export default router;
