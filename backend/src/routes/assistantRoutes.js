import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  sendMessage,
  getGreeting,
  getBriefing,
  getWeather,
  executeAction,
  getPreferences,
  updatePreferences,
  clearHistory,
} from "../controllers/assistantController.js";

const router = Router();

// All assistant routes require authenticated session
router.use(authenticate);

router.post("/message", sendMessage);
router.get("/greeting", getGreeting);
router.get("/briefing", getBriefing);
router.get("/weather", getWeather);
router.post("/execute-action", executeAction);
router.post("/action", executeAction);
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);
router.post("/clear-history", clearHistory);

export default router;
