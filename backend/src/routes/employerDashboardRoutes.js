import { Router } from "express";
import { dashboard } from "../controllers/employerDashboardController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

// Employer-only
router.get("/", authenticate, requireRole(ROLES.EMPLOYER), dashboard);

export default router;
