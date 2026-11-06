import { Router } from "express";
import {
  rate,
  decide,
  employerLive,
  employerList,
  apply,
  respondOffer,
  updateStatus,
  locationConsent,
  withdraw,
  cancel,
  review,
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
router.put("/decision/:id", ...employerOnly, decide);
router.put("/cancel/:id", ...employerOnly, cancel);
router.put("/review/:id", ...employerOnly, review);
router.get("/employer/live", ...employerOnly, employerLive);
router.get("/employer", ...employerOnly, employerList);
router.get("/rating/:name", ...employerOnly, ratingByName);

// Worker-only
router.put("/offer/:id", ...workerOnly, respondOffer);
router.put("/status/:id", ...workerOnly, updateStatus);
router.put("/location-consent/:id", ...workerOnly, locationConsent);
router.put("/withdraw/:id", ...workerOnly, withdraw);
router.post("/:jobId/apply", ...workerOnly, apply);

export default router;
