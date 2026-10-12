import { Router } from "express";
import { me } from "../controllers/sessionController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Any signed-in role: confirms the stored session on page load/refresh.
router.get("/me", authenticate, me);

export default router;
