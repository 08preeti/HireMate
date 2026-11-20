import { Router } from "express";
import { message, status, confirm, cancel } from "../controllers/assistantController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { perUserLimiter } from "../middleware/rateLimiter.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
router.use(authenticate, requireRole(ROLES.WORKER, ROLES.EMPLOYER));

router.get("/status", status);
// Each message can trigger several paid model calls, so it gets its own per-user ceiling.
router.post("/message", perUserLimiter({ max: 20, message: "You're sending messages too quickly. Please wait a moment." }), message);

// Confirm / cancel are deterministic (no model call) but they change data, so they are limited too.
const actionLimit = perUserLimiter({ max: 30, message: "Too many requests. Please wait a moment." });
router.post("/confirm", actionLimit, confirm);
router.post("/cancel", actionLimit, cancel);

export default router;
