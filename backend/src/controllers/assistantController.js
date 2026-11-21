/**
 * Assistant Controller for HireMate JARVIS.
 * Handles chat messaging, greetings, briefings, weather, tool confirmations, and preferences.
 */

import AssistantConversation from "../models/AssistantConversation.js";
import { generateAssistantResponse } from "../services/llmProvider.js";
import { generatePersonalizedGreeting } from "../services/greetingService.js";
import { generateDailyBriefing } from "../services/briefingService.js";
import { getWeatherAndAirQuality } from "../services/weatherService.js";
import { executeTool } from "../services/toolRegistry.js";

/**
 * Handle incoming user chat/voice message
 */
export async function sendMessage(req, res, next) {
  try {
    const { message, context = {} } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "A valid message string is required." });
    }

    const auth = req.auth;
    const userDoc = req.user;

    let conv = await AssistantConversation.findOne({ userId: auth.id, userRole: auth.role });
    if (!conv) {
      conv = new AssistantConversation({ userId: auth.id, userRole: auth.role });
    }

    // Merge persistent conversation memory
    const fullContext = {
      ...context,
      pendingContext: conv.pendingContext || {},
      recentHistory: (conv.history || []).slice(-6),
    };

    // Generate assistant intelligence response & execute safe read tools
    const response = await generateAssistantResponse({
      message,
      context: fullContext,
      auth,
      userDoc,
    });

    // Update conversation record
    conv.addMessage({ role: "user", content: message, timestamp: new Date() });
    conv.addMessage({
      role: "assistant",
      content: response.reply,
      action: response.action,
      timestamp: new Date(),
    });

    // Manage pending conversational multi-turn state
    if (response.nextPendingContext !== undefined) {
      conv.pendingContext = response.nextPendingContext;
    } else if (response.action?.requiresConfirmation) {
      conv.pendingContext = { awaitingConfirmation: response.action };
    } else if (response.action?.type === "search_jobs" && response.action?.data?.jobs) {
      conv.pendingContext = { lastJobs: response.action.data.jobs };
    } else if (response.action?.type === "update_profile") {
      conv.pendingContext = {};
    }

    await conv.save().catch((err) => console.warn("Failed to persist assistant conversation:", err.message));

    return res.json(response);
  } catch (err) {
    return next(err);
  }
}

/**
 * Get personalized time-of-day greeting with weather snippet & notification counters
 */
export async function getGreeting(req, res, next) {
  try {
    const { latitude, longitude, timezoneOffset } = req.query;
    const greeting = await generatePersonalizedGreeting(req.auth, req.user, {
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      timezoneOffset: timezoneOffset ? Number(timezoneOffset) : undefined,
    });
    return res.json(greeting);
  } catch (err) {
    return next(err);
  }
}

/**
 * Get comprehensive daily briefing
 */
export async function getBriefing(req, res, next) {
  try {
    const { latitude, longitude } = req.query;
    const briefing = await generateDailyBriefing(req.auth, {
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    });
    return res.json(briefing);
  } catch (err) {
    return next(err);
  }
}

/**
 * Get current weather & AQI
 */
export async function getWeather(req, res, next) {
  try {
    const { latitude, longitude, cityName } = req.query;
    const weather = await getWeatherAndAirQuality({
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      cityName,
    });
    return res.json(weather);
  } catch (err) {
    return next(err);
  }
}

/**
 * Execute a sensitive action that required explicit confirmation (e.g. apply to job, post job, accept/reject candidate)
 */
export async function executeAction(req, res, next) {
  try {
    const { action, toolName, params, payload, details } = req.body;
    const targetTool = toolName || action;
    const targetParams = params || payload || details || {};

    if (!targetTool) {
      return res.status(400).json({ message: "Action / toolName is required" });
    }

    const result = await executeTool(targetTool, targetParams, req.auth, { isConfirmed: true });
    return res.json({ success: true, result });
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieve user assistant preferences and voice settings
 */
export async function getPreferences(req, res, next) {
  try {
    const conv = await AssistantConversation.findOne({ userId: req.auth.id, userRole: req.auth.role }).lean();
    return res.json({
      voiceSettings: conv?.voiceSettings || {
        enabled: true,
        autoSpeakGreeting: false,
        voiceName: "",
        speechRate: 1.0,
      },
      preferredLanguage: conv?.preferredLanguage || "en",
      preferredName: conv?.preferredName || "",
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update user assistant preferences and voice settings
 */
export async function updatePreferences(req, res, next) {
  try {
    const { voiceSettings, preferredLanguage, preferredName } = req.body;
    let conv = await AssistantConversation.findOne({ userId: req.auth.id, userRole: req.auth.role });
    if (!conv) {
      conv = new AssistantConversation({ userId: req.auth.id, userRole: req.auth.role });
    }

    if (voiceSettings) {
      conv.voiceSettings = { ...conv.voiceSettings.toObject(), ...voiceSettings };
    }
    if (preferredLanguage) {
      conv.preferredLanguage = preferredLanguage;
    }
    if (preferredName !== undefined) {
      conv.preferredName = preferredName;
    }

    await conv.save();
    return res.json({
      success: true,
      voiceSettings: conv.voiceSettings,
      preferredLanguage: conv.preferredLanguage,
      preferredName: conv.preferredName,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Clear assistant conversation history
 */
export async function clearHistory(req, res, next) {
  try {
    await AssistantConversation.findOneAndUpdate(
      { userId: req.auth.id, userRole: req.auth.role },
      { $set: { history: [] } },
    );
    return res.json({ success: true, message: "Conversation history cleared." });
  } catch (err) {
    return next(err);
  }
}
