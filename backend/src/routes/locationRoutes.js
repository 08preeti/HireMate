import { Router } from "express";
import { reverse, routeToJob, search, shareLocation, trackWorker } from "../controllers/locationController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { perUserLimiter } from "../middleware/rateLimiter.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
const employerOnly = [authenticate, requireRole(ROLES.EMPLOYER)];
const workerOnly = [authenticate, requireRole(ROLES.WORKER)];

const shareLimit = perUserLimiter({ max: 30, message: "Too many location updates. Slow down." });
const routeLimit = perUserLimiter({ max: 12, message: "Too many route requests. Please wait a moment." });
const trackLimit = perUserLimiter({ max: 40, message: "Too many tracking requests. Please wait a moment." });
const searchLimit = perUserLimiter({ max: 30, message: "Too many address searches. Please wait a moment." });

// No route here is public: every one needs a signed-in user of the matching role.
router.put("/applications/:id", ...workerOnly, shareLimit, shareLocation);
router.get("/applications/:id/route", ...workerOnly, routeLimit, routeToJob);
router.get("/applications/:id", ...employerOnly, trackLimit, trackWorker);
router.get("/search", ...employerOnly, searchLimit, search);
router.get("/reverse", ...employerOnly, searchLimit, reverse);

export default router;
