import { Router } from "express";
import { translate } from "../controllers/translateController.js";
import { authenticate } from "../middleware/authenticate.js";
import { perUserLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Any signed-in user (worker or employer) may translate review text.
router.post("/", authenticate, perUserLimiter({ max: 60, message: "Too many translation requests. Please wait a moment." }), translate);

export default router;