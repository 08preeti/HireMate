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

    // Manage pending conversational multi-turn state cleanly
    if (response.nextPendingContext !== undefined) {
      conv.pendingContext = response.nextPendingContext;
    } else if (response.action?.requiresConfirmation) {
      conv.pendingContext = { awaitingConfirmation: response.action };
    } else if (response.action?.type === "search_jobs" && response.action?.data?.jobs) {
      conv.pendingContext = { lastJobs: response.action.data.jobs };
    } else {
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

/**
 * Backward compatibility factory for legacy tests & action token verification
 */
export function createAssistantHandlers({ getRegistry, getProvider, tokens, configured = () => true }) {
  const assertOwner = (req, p) => {
    if (p.sub !== req.auth.id || p.role !== req.auth.role) {
      const err = new Error("This confirmation belongs to a different account");
      err.status = 403;
      throw err;
    }
  };

  const readToken = (body) => {
    const raw = body?.token;
    if (typeof raw !== "string" || !raw || raw.length > 4000) {
      const err = new Error("Invalid confirmation");
      err.status = 400;
      throw err;
    }
    try {
      return tokens.verify(raw);
    } catch (e) {
      const err = new Error(e?.name === "TokenExpiredError" ? "This confirmation has expired. Please ask me again." : "Invalid confirmation");
      err.status = 410;
      throw err;
    }
  };

  return {
    status(req, res) {
      res.json({ available: configured() });
    },

    async message(req, res) {
      try {
        const { validateAssistantMessage } = await import("../validators/assistantValidators.js");
        const { runAgent } = await import("../services/assistant/agentOrchestrator.js");
        if (!configured()) return res.status(503).json({ message: "The assistant is not available right now.", code: "AI_UNAVAILABLE" });
        const input = validateAssistantMessage(req.body);
        const out = await runAgent({
          provider: await getProvider(),
          registry: await getRegistry(),
          ctx: { auth: req.auth, user: req.user, displayName: req.auth.role === "employer" ? req.user?.companyName : req.user?.name },
          history: input.history,
          message: input.message,
          context: input.context,
        });
        const pending = out.pendingActions.map(({ tool, args, card }) => {
          const { token, expiresAt } = tokens.sign({ sub: req.auth.id, role: req.auth.role, tool, args, card });
          return { token, expiresAt, ...card };
        });
        res.json({ reply: out.reply, actions: out.clientActions, shown: out.shown, pending });
      } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
      }
    },

    async confirm(req, res) {
      try {
        const payload = readToken(req.body);
        assertOwner(req, payload);
        if (!tokens.consume(payload)) {
          return res.status(409).json({ message: "This action was already handled" });
        }
        const reg = await getRegistry();
        const result = await reg.commit({ auth: req.auth, user: req.user }, payload.tool, payload.args);
        if (!result.ok) return res.status(409).json({ ok: false, message: result.error });
        res.json({ ok: true, message: result.message, ...(result.affects && { affects: result.affects }) });
      } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
      }
    },

    async cancel(req, res) {
      try {
        const payload = readToken(req.body);
        assertOwner(req, payload);
        tokens.consume(payload);
        res.json({ ok: true });
      } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
      }
    },
  };
}
