import { Router } from "express";
import { list, unreadCount, read, readAll, remove } from "../controllers/notificationController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
router.use(authenticate, requireRole(ROLES.WORKER, ROLES.EMPLOYER));

// Static paths before "/:id".
router.get("/", list);
router.get("/unread-count", unreadCount);
router.patch("/read-all", readAll);
router.patch("/:id/read", read);
router.delete("/:id", remove);

export default router;
