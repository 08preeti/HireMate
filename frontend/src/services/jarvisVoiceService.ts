/**
 * JARVIS Centralized Voice Service
 *
 * Provides a unified speech generation and audio playback engine across
 * both Worker and Employer dashboards using the Alisha voice identity.
 *
 * Guarantees:
 * - Single, consistent Alisha voice identity across all sessions and roles.
 * - Multi-language support (English, Hindi, Marathi) with preservation of original script.
 * - Prevents overlapping audio (cancels previous speech before starting new speech).
 * - Instant interruption support when user speaks or clicks mic.
 * - Audio URL caching to eliminate redundant backend/API requests.
 * - Full lifecycle events: loading, speaking, interruption, completion, and error states.
 */

import {
  JARVIS_VOICE_CONFIG,
  ALISHA_LANGUAGE_CAPABILITIES,
  detectVoiceLanguage,
  type JarvisVoiceIdentity,
  type SupportedLanguageCode,
} from "./jarvisVoiceConfig";
import { generateTtsAudio } from "./assistantApi";
import { API_URL } from "@/config/env";

export interface JarvisVoiceState {
  isSpeaking: boolean;
  isLoading: boolean;
  currentText: string | null;
  language: SupportedLanguageCode;
  error: string | null;
  voice: JarvisVoiceIdentity;
  isFallback: boolean;
  quotaExceeded: boolean;
}

export type VoiceStateListener = (state: JarvisVoiceState) => void;

class JarvisVoiceService {
  private static instance: JarvisVoiceService;

  private currentPlayId = 0;
  private audio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private audioCache = new Map<string, string>(); // hash -> audioUrl
  private listeners = new Set<VoiceStateListener>();

  private state: JarvisVoiceState = {
    isSpeaking: false,
    isLoading: false,
    currentText: null,
    language: "en",
    error: null,
    voice: JARVIS_VOICE_CONFIG,
    isFallback: false,
    quotaExceeded: false,
  };

  private constructor() {
    // Singleton
  }

  public static getInstance(): JarvisVoiceService {
    if (!JarvisVoiceService.instance) {
      JarvisVoiceService.instance = new JarvisVoiceService();
    }
    return JarvisVoiceService.instance;
  }

  /**
   * Subscribe to state changes (speaking, loading, errors).
   */
  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): JarvisVoiceState {
    return { ...this.state };
  }

  private updateState(partial: Partial<JarvisVoiceState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error("Error in voice state listener:", err);
      }
    }
  }

  private getCacheKey(text: string, lang: string): string {
    return `${lang}:${text.trim().toLowerCase()}`;
  }

  /**
   * Stop any current audio playback and cancel active generation requests immediately.
   */
  public stop(): void {
    // Invalidate any in-flight playback requests
    this.currentPlayId++;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.src = "";
      } catch (err) {
        // Ignore pause errors
      }
      this.audio = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.updateState({
      isSpeaking: false,
      isLoading: false,
      currentText: null,
      error: null,
      isFallback: false,
    });
  }

  /**
   * Speak a text response using the centralized Alisha voice.
   *
   * @param text The text response to speak.
   * @param options Language override and callbacks.
   */
  public async speak(
    text: string,
    options?: {
      language?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
    }
  ): Promise<void> {
    const trimmed = text?.trim();
    if (!trimmed) {
      return;
    }

    // 1. Immediately stop any active speech or in-flight requests (no overlapping audio)
    this.stop();
    const playId = this.currentPlayId;

    const lang = detectVoiceLanguage(trimmed, options?.language);
    this.updateState({
      isLoading: true,
      isSpeaking: false,
      currentText: trimmed,
      language: lang,
      error: null,
    });

    const cacheKey = this.getCacheKey(trimmed, lang);
    let audioUrl = this.audioCache.get(cacheKey);

    // 2. Fetch speech audio from backend if not cached
    if (!audioUrl) {
      this.abortController = new AbortController();

      try {
        const response = await generateTtsAudio({
          text: trimmed,
          language: lang,
          voiceId: JARVIS_VOICE_CONFIG.id,
        });

        // Abort if a newer speech request was started while fetching
        if (this.currentPlayId !== playId) {
          return;
        }

        if (!response.success || !response.audioUrl) {
          const errMsg = response.error || "Failed to generate speech with Alisha voice.";

          this.updateState({
            isLoading: false,
            isSpeaking: false,
            error: errMsg,
            quotaExceeded: false,
          });

          console.warn(`[JARVIS Alisha Voice] ${errMsg}`);
          options?.onError?.(new Error(errMsg));
          return;
        }

        const rawUrl = response.audioUrl;
        audioUrl = rawUrl.startsWith("http") ? rawUrl : `${API_URL}${rawUrl}`;
        this.audioCache.set(cacheKey, audioUrl);
      } catch (err: any) {
        if (this.currentPlayId !== playId || err?.name === "AbortError") {
          return;
        }

        const errMsg = err?.message || "Failed to generate audio.";
        this.updateState({
          isLoading: false,
          isSpeaking: false,
          error: errMsg,
        });

        console.warn("[JARVIS Alisha Voice] Request notice:", errMsg);
        options?.onError?.(new Error(errMsg));
        return;
      } finally {
        this.abortController = null;
      }
    }

    // 3. Play generated audio
    if (this.currentPlayId !== playId) {
      return;
    }

    try {
      // Ensure local synthesis is fully cancelled before playing neural audio
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }

      const audio = new Audio();
      this.audio = audio;

      audio.preload = "auto";
      audio.src = audioUrl;

      audio.onplay = () => {
        if (this.currentPlayId !== playId) {
          try {
            audio.pause();
          } catch {}
          return;
        }
        this.updateState({
          isLoading: false,
          isSpeaking: true,
          error: null,
          isFallback: false,
        });
        options?.onStart?.();
      };

      audio.onended = () => {
        if (this.currentPlayId === playId) {
          if (this.audio === audio) {
            this.audio = null;
          }
          this.updateState({
            isSpeaking: false,
            isLoading: false,
            currentText: null,
            isFallback: false,
          });
          options?.onEnd?.();
        }
      };

      audio.onerror = () => {
        if (this.currentPlayId !== playId) return;
        this.handlePlaybackFailure(new Error("Audio playback failed on media element"), options?.onError);
      };

      await audio.play();
    } catch (playErr: any) {
      if (this.currentPlayId !== playId || playErr?.name === "AbortError") {
        return;
      }

      if (playErr?.name === "NotAllowedError") {
        // Autoplay blocked by browser policy waiting for user interaction:
        // Do NOT speak with browser fallback to avoid double voice collision.
        this.updateState({
          isSpeaking: false,
          isLoading: false,
        });
        options?.onError?.(playErr);
        return;
      }

      this.handlePlaybackFailure(playErr, options?.onError);
    }
  }

  /**
   * Transparent browser speech synthesis fallback when external provider quota is exhausted.
   * Clearly flags isFallback: true in voice state so UI reflects fallback status.
   */
  private speakWithBrowserFallback(
    text: string,
    lang: SupportedLanguageCode,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
    }
  ): void {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      options?.onError?.(new Error("Speech synthesis not supported in this environment"));
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = lang === "hi" ? "hi" : lang === "mr" ? "mr" : "en";
      const bestVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix) && !/desktop/i.test(v.name)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onstart = () => {
        this.updateState({
          isLoading: false,
          isSpeaking: true,
          isFallback: true,
        });
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.updateState({
          isSpeaking: false,
          isLoading: false,
          currentText: null,
          isFallback: false,
        });
        options?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.updateState({
          isSpeaking: false,
          isLoading: false,
          isFallback: false,
        });
        options?.onError?.(new Error("Local voice playback error"));
      };

      window.speechSynthesis.speak(utterance);
    } catch (err: any) {
      options?.onError?.(err);
    }
  }

  private handlePlaybackFailure(err: any, onError?: (err: Error) => void): void {
    const message = err?.message || "Audio playback error";
    this.updateState({
      isSpeaking: false,
      isLoading: false,
      error: message,
    });
    console.error("[JARVIS Alisha Voice] Playback failure:", err);
    onError?.(new Error(message));
  }

  /**
   * Get active voice details
   */
  public getVoiceConfig(): JarvisVoiceIdentity {
    return JARVIS_VOICE_CONFIG;
  }

  /**
   * Get language capability info
   */
  public getLanguageCapability(lang: SupportedLanguageCode) {
    return ALISHA_LANGUAGE_CAPABILITIES[lang] || ALISHA_LANGUAGE_CAPABILITIES.en;
  }
}

export const jarvisVoiceService = JarvisVoiceService.getInstance();
