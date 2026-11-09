import { Router } from "express";
import { list, unreadCount, read, readAll, remove, stream, preferences, updatePreferences } from "../controllers/notificationController.js";
import { perUserLimiter } from "../middleware/rateLimiter.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
router.use(authenticate, requireRole(ROLES.WORKER, ROLES.EMPLOYER));

// Static paths before "/:id".
router.get("/", list);
router.get("/unread-count", unreadCount);
router.get("/stream", perUserLimiter({ max: 20, message: "Too many connection attempts. Please wait a moment." }), stream);
router.get("/preferences", requireRole(ROLES.WORKER), preferences);
router.patch("/preferences", requireRole(ROLES.WORKER), updatePreferences);
router.patch("/read-all", readAll);
router.patch("/:id/read", read);
router.delete("/:id", remove);

export default router;
