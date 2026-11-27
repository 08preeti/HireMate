/**
 * JARVIS Centralized Voice Identity & Configuration
 *
 * Single, unified voice identity: Alisha (Soft and Engaging)
 * Powered by high-fidelity Microsoft Edge Neural TTS:
 * - English (Indian): en-IN-NeerjaNeural (Alisha English)
 * - Hindi: hi-IN-SwaraNeural (Alisha Hindi)
 * - Marathi: mr-IN-AarohiNeural (Alisha Marathi)
 *
 * 100% Free & Unlimited AI Voice across both Worker and Employer dashboards.
 */

export interface JarvisVoiceIdentity {
  readonly id: string;
  readonly name: string;
  readonly provider: "edge-neural" | "elevenlabs" | "easy-peasy.ai";
  readonly gender: "female";
  readonly age: "young";
  readonly nativeLanguage: string;
  readonly nativeAccent: string;
  readonly tone: string;
  readonly useCase: string;
  readonly description: string;
  readonly voiceUrl?: string;
  readonly avatarUrl?: string;
}

export const JARVIS_VOICE_CONFIG: JarvisVoiceIdentity = {
  id: "en-IN-NeerjaNeural",
  name: "Alisha",
  provider: "edge-neural",
  gender: "female",
  age: "young",
  nativeLanguage: "English (Indian) / Hindi / Marathi",
  nativeAccent: "Indian",
  tone: "soft, engaging, conversational",
  useCase: "conversational assistant",
  description:
    "A gentle, soothing, and engaging Indian female voice identity (Alisha) delivering high-fidelity speech across English, Hindi, and Marathi with 100% free, unlimited neural synthesis.",
  avatarUrl: "https://media.easy-peasy.ai/voices/indian_female_26.webp",
} as const;

export type SupportedLanguageCode = "en" | "hi" | "mr";

export interface LanguageVoiceCapability {
  readonly code: SupportedLanguageCode;
  readonly label: string;
  readonly nativeSupported: boolean;
  readonly voiceModel: string;
  readonly note: string;
}

/**
 * Language capabilities for Alisha:
 * - English (en): Alisha Neural English (Indian accent, natural & expressive).
 * - Hindi (hi): Alisha Neural Hindi (Native Swara neural voice, fluent & warm).
 * - Marathi (mr): Alisha Neural Marathi (Native Aarohi neural voice, authentic & articulate).
 *
 * CRITICAL RULE: A unified female Indian voice identity (Alisha) across all 3 languages.
 */
export const ALISHA_LANGUAGE_CAPABILITIES: Record<SupportedLanguageCode, LanguageVoiceCapability> = {
  en: {
    code: "en",
    label: "English",
    nativeSupported: true,
    voiceModel: "en-IN-NeerjaNeural",
    note: "Alisha Neural English (Indian accent, natural & conversational).",
  },
  hi: {
    code: "hi",
    label: "Hindi",
    nativeSupported: true,
    voiceModel: "hi-IN-SwaraNeural",
    note: "Alisha Neural Hindi (Native Swara neural voice, clear & fluent).",
  },
  mr: {
    code: "mr",
    label: "Marathi",
    nativeSupported: true,
    voiceModel: "mr-IN-AarohiNeural",
    note: "Alisha Neural Marathi (Native Aarohi neural voice, authentic & articulate).",
  },
};

// Backward-compatible alias
export const AISHA_LANGUAGE_CAPABILITIES = ALISHA_LANGUAGE_CAPABILITIES;

/**
 * Detect language code from text content or locale string
 */
export function detectVoiceLanguage(text: string, currentLocale?: string): SupportedLanguageCode {
  // Devanagari script detection: Unicode range \u0900-\u097F
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  if (devanagariCount > 2) {
    if (currentLocale === "mr") return "mr";
    if (currentLocale === "hi") return "hi";
    // Check characteristic Marathi words using Unicode-safe boundaries
    if (/(?:^|\s|[.,!?])(आहे|नाही|करा|करावं|मला|तुम्ही|आपण|होय|नमस्कार|धन्यवाद|मध्ये|का|कसे|कशी)(?:$|\s|[.,!?])/.test(text)) {
      return "mr";
    }
    return "hi";
  }

  return currentLocale === "hi" || currentLocale === "mr" ? currentLocale : "en";
}
