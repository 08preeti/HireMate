import { Router } from "express";
import { register, login } from "../controllers/employerAuthController.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Public: employer signup / login
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

export default router;
