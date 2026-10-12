import { Router } from "express";
import employerAuthRoutes from "./employerAuthRoutes.js";
import employerDashboardRoutes from "./employerDashboardRoutes.js";
import jobRoutes from "./jobRoutes.js";
import applicationRoutes from "./applicationRoutes.js";
import workerRoutes from "./workerRoutes.js";
import aiRoutes from "./aiRoutes.js";
import sessionRoutes from "./sessionRoutes.js";

const router = Router();

// Same URL prefixes as before — the frontend does not need new endpoints.
router.use("/employer/dashboard", employerDashboardRoutes);
router.use("/employer", employerAuthRoutes);
router.use("/jobs", jobRoutes);
router.use("/applications", applicationRoutes);
router.use("/workers", workerRoutes);
router.use("/ai", aiRoutes);
router.use("/auth", sessionRoutes);

export default router;
