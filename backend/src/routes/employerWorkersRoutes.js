import { Router } from "express";
import { workers } from "../controllers/employerWorkersController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

// Employer-only: browse every worker who has a work profile
router.get("/", authenticate, requireRole(ROLES.EMPLOYER), workers);

export default router;
