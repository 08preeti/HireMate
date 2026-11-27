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
  textToSpeech,
  streamAudio,
} from "../controllers/assistantController.js";

const router = Router();

// Streaming proxy for media.easy-peasy.ai (validates host domain)
router.get("/tts/stream", streamAudio);

// All other assistant routes require authenticated session
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
router.post("/tts", textToSpeech);

export default router;
