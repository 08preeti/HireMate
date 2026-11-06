import { Router } from "express";
import {
  postJob,
  listJobs,
  getJobById,
  report,
  myJobs,
  myJob,
  editJob,
  closeJob,
  reopenJob,
  fillJob,
  completeJob,
  removeJob,
} from "../controllers/jobController.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { requireRole, allowVisitorOr } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
const employerOnly = [authenticate, requireRole(ROLES.EMPLOYER)];

// Employer-only: post a job
router.post("/", ...employerOnly, postJob);

// Employer-only management (static paths first so they are not captured by "/:id")
router.get("/mine", ...employerOnly, myJobs);
router.get("/mine/:id", ...employerOnly, myJob);
router.put("/:id/close", ...employerOnly, closeJob);
router.put("/:id/reopen", ...employerOnly, reopenJob);
router.put("/:id/fill", ...employerOnly, fillJob);
router.put("/:id/complete", ...employerOnly, completeJob);
router.put("/:id", ...employerOnly, editJob);
router.delete("/:id", ...employerOnly, removeJob);

// Worker-only: report a job
router.post("/report/:id", authenticate, requireRole(ROLES.WORKER), report);

// Browsing: visitors ("Browse jobs without login") and workers. Employers are blocked.
router.get("/", optionalAuthenticate, allowVisitorOr(ROLES.WORKER), listJobs);
router.get("/:id", optionalAuthenticate, allowVisitorOr(ROLES.WORKER), getJobById);

export default router;
