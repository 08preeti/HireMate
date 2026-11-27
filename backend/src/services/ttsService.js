import crypto from "crypto";
import fs from "fs";
import path from "path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { env } from "../config/env.js";

/**
 * JARVIS Centralized Voice Engine: Alisha (Soft, Engaging & Natural)
 * Powered by high-fidelity Microsoft Edge Neural TTS (100% Free & Unlimited):
 * - English (Indian): en-IN-NeerjaNeural (Alisha English)
 * - Hindi: hi-IN-SwaraNeural (Alisha Hindi)
 * - Marathi: mr-IN-AarohiNeural (Alisha Marathi)
 */
export const ALISHA_VOICE_CONFIG = {
  id: "en-IN-NeerjaNeural",
  name: "Alisha",
  provider: "edge-neural",
  accent: "Indian",
  gender: "Female",
};

export const NEURAL_VOICES = {
  en: {
    voiceId: "en-IN-NeerjaNeural",
    name: "Alisha (Neerja Neural)",
    language: "English",
    accent: "Indian",
    gender: "Female",
  },
  hi: {
    voiceId: "hi-IN-SwaraNeural",
    name: "Alisha (Swara Neural)",
    language: "Hindi",
    accent: "Indian",
    gender: "Female",
  },
  mr: {
    voiceId: "mr-IN-AarohiNeural",
    name: "Alisha (Aarohi Neural)",
    language: "Marathi",
    accent: "Indian",
    gender: "Female",
  },
};

// Persistent disk cache directory for audio files
const CACHE_DIR = path.resolve(process.cwd(), ".cache", "tts");
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  // Non-fatal
}

// In-memory audio buffer cache: hash -> { buffer, voiceId, language, timestamp }
const audioCache = new Map();
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(voiceOrLang, text) {
  return crypto.createHash("sha256").update(`${voiceOrLang}:${text.trim()}`).digest("hex");
}

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of audioCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      audioCache.delete(key);
    }
  }
}

/**
 * Detect language code from text content or override
 */
export function detectLanguage(text, langOverride) {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  if (devanagariCount > 2) {
    if (langOverride === "mr") return "mr";
    if (langOverride === "hi") return "hi";
    if (/(?:^|\s|[.,!?])(आहे|नाही|करा|करावं|मला|तुम्ही|आपण|होय|नमस्कार|धन्यवाद|मध्ये|का|कसे|कशी)(?:$|\s|[.,!?])/.test(text)) {
      return "mr";
    }
    return "hi";
  }
  return langOverride === "mr" || langOverride === "hi" ? langOverride : "en";
}

/**
 * Generate speech using ElevenLabs API (Alisha voice ID: ftDdhfYtmfGP0tFlBYA1).
 *
 * @param {string} text - Text to synthesize.
 * @param {string} [voiceId] - ElevenLabs voice ID (default: ftDdhfYtmfGP0tFlBYA1).
 * @returns {Promise<{ success: boolean, buffer?: Buffer, error?: string, code?: string }>}
 */
async function generateSpeechElevenLabs(text, voiceId = ALISHA_VOICE_CONFIG.id) {
  const apiKey = env.elevenLabs?.apiKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      code: "NO_ELEVENLABS_API_KEY",
      error: "ELEVENLABS_API_KEY is not configured.",
    };
  }

  try {
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ALISHA_VOICE_CONFIG.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const message = errJson.detail?.message || errJson.message || `ElevenLabs error (${response.status})`;
      console.warn(`[ElevenLabs Alisha] API response error (${response.status}):`, message);
      return {
        success: false,
        code: response.status === 401 ? "INVALID_API_KEY" : "ELEVENLABS_ERROR",
        error: message,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer || buffer.length === 0) {
      throw new Error("ElevenLabs generated an empty audio buffer.");
    }

    return {
      success: true,
      buffer,
    };
  } catch (err) {
    console.warn("[ElevenLabs Alisha] Request error:", err.message);
    return {
      success: false,
      code: "ELEVENLABS_REQUEST_FAILED",
      error: err.message,
    };
  }
}

/**
 * Generate high-fidelity neural speech using Microsoft Edge Neural TTS (Free & Unlimited).
 * Produces natural, human-like Indian female neural speech for Alisha across English, Hindi, and Marathi.
 *
 * @param {Object} options
 * @param {string} options.text - Text to convert to speech.
 * @param {string} [options.language="en"] - Target language ('en', 'hi', 'mr').
 * @param {string} [options.voiceId] - Optional voice ID.
 * @returns {Promise<{ success: boolean, audioUrl?: string, audioId?: string, voiceId?: string, voiceName?: string, language?: string, provider?: string, cached?: boolean, error?: string, code?: string }>}
 */
export async function generateSpeech({ text, language = "en", voiceId = ALISHA_VOICE_CONFIG.id }) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return {
      success: false,
      error: "Text is required to generate speech.",
      code: "INVALID_TEXT",
    };
  }

  const trimmedText = text.trim();
  const langKey = detectLanguage(trimmedText, language);
  const voiceConfig = NEURAL_VOICES[langKey] || NEURAL_VOICES.en;
  const cacheKey = getCacheKey(`alisha:${langKey}`, trimmedText);

  // 1. Check in-memory cache
  const cached = audioCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      audioUrl: `/api/assistant/tts/stream?id=${cacheKey}`,
      audioId: cacheKey,
      cached: true,
      voiceId: voiceConfig.voiceId,
      voiceName: voiceConfig.name,
      provider: "edge-neural",
      language: langKey,
    };
  }

  // 2. Check persistent disk cache
  const cachedFile = path.join(CACHE_DIR, `${cacheKey}.mp3`);
  try {
    if (fs.existsSync(cachedFile)) {
      const diskBuf = fs.readFileSync(cachedFile);
      if (diskBuf && diskBuf.length > 0) {
        audioCache.set(cacheKey, {
          buffer: diskBuf,
          voiceId: voiceConfig.voiceId,
          voiceName: voiceConfig.name,
          provider: "edge-neural",
          language: langKey,
          timestamp: Date.now(),
        });
        return {
          success: true,
          audioUrl: `/api/assistant/tts/stream?id=${cacheKey}`,
          audioId: cacheKey,
          cached: true,
          voiceId: voiceConfig.voiceId,
          voiceName: voiceConfig.name,
          provider: "edge-neural",
          language: langKey,
        };
      }
    }
  } catch (e) {
    // Non-fatal disk read failure
  }

  // 3. Optional: ElevenLabs synthesis only if explicitly enabled with paid subscription
  if (process.env.USE_ELEVENLABS === "true" && process.env.ELEVENLABS_API_KEY) {
    const elResult = await generateSpeechElevenLabs(trimmedText, voiceId);
    if (elResult.success && elResult.buffer) {
      const buffer = elResult.buffer;
      audioCache.set(cacheKey, {
        buffer,
        voiceId,
        voiceName: "Alisha (ElevenLabs)",
        provider: "elevenlabs",
        language: langKey,
        timestamp: Date.now(),
      });
      try {
        fs.writeFileSync(cachedFile, buffer);
      } catch (e) {}

      return {
        success: true,
        audioUrl: `/api/assistant/tts/stream?id=${cacheKey}`,
        audioId: cacheKey,
        cached: false,
        voiceId,
        voiceName: "Alisha (ElevenLabs)",
        provider: "elevenlabs",
        language: langKey,
      };
    }
  }

  // 4. Primary: Microsoft Edge Neural TTS (100% Free, Unlimited, High Fidelity)
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceConfig.voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(trimmedText);

    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on("data", (chunk) => chunks.push(chunk));
      audioStream.on("end", resolve);
      audioStream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);
    if (!buffer || buffer.length === 0) {
      throw new Error("TTS generated an empty audio buffer.");
    }

    // Cache in memory
    if (audioCache.size >= MAX_CACHE_ENTRIES) {
      cleanExpiredCache();
      if (audioCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
    }

    audioCache.set(cacheKey, {
      buffer,
      voiceId: voiceConfig.voiceId,
      voiceName: voiceConfig.name,
      provider: "edge-neural",
      language: langKey,
      timestamp: Date.now(),
    });

    // Cache on disk
    try {
      fs.writeFileSync(cachedFile, buffer);
    } catch (e) {
      // Non-fatal disk write error
    }

    return {
      success: true,
      audioUrl: `/api/assistant/tts/stream?id=${cacheKey}`,
      audioId: cacheKey,
      cached: false,
      voiceId: voiceConfig.voiceId,
      voiceName: voiceConfig.name,
      provider: "edge-neural",
      language: langKey,
    };
  } catch (err) {
    console.error("❌ Neural TTS error:", err);
    return {
      success: false,
      error: err.message || "Failed to generate speech.",
      code: "TTS_GENERATION_FAILED",
      voiceId: voiceConfig.voiceId,
      voiceName: voiceConfig.name,
    };
  }
}

/**
 * Retrieve cached audio buffer by hash id (checks in-memory cache then disk cache).
 *
 * @param {string} audioId
 * @returns {Buffer | null}
 */
export function getAudioBuffer(audioId) {
  if (!audioId || typeof audioId !== "string" || !/^[a-f0-9]{64}$/i.test(audioId)) return null;
  const entry = audioCache.get(audioId);
  if (entry && entry.buffer) return entry.buffer;

  // Fallback to disk cache if available
  const filePath = path.join(CACHE_DIR, `${audioId}.mp3`);
  try {
    if (fs.existsSync(filePath)) {
      const diskBuf = fs.readFileSync(filePath);
      if (diskBuf && diskBuf.length > 0) {
        audioCache.set(audioId, {
          buffer: diskBuf,
          timestamp: Date.now(),
        });
        return diskBuf;
      }
    }
  } catch (e) {
    // Non-fatal
  }
  return null;
}

/**
 * Proxy helper for remote audio URLs (legacy compatibility)
 */
export async function fetchAudioStream(audioUrl) {
  if (!audioUrl) throw new Error("Audio URL is required");
  return fetch(audioUrl);
}
