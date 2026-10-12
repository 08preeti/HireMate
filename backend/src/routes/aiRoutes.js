import { Router } from "express";
import { suggestions, careerTips } from "../controllers/aiController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

// Worker-only (AI suggestions are a worker feature)
router.post("/suggestions", authenticate, requireRole(ROLES.WORKER), suggestions);
router.post("/career-tips", authenticate, requireRole(ROLES.WORKER), careerTips);

export default router;
