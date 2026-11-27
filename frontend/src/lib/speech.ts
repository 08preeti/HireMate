/**
 * Unified speech utility powered by JARVIS Aisha voice (Easy-Peasy.AI).
 * Consistent across Worker and Employer dashboards, job descriptions, and navigation.
 */
import { jarvisVoiceService } from "@/services/jarvisVoiceService";

/** Speak text aloud using Aisha voice. */
export function speak(text: string, lang = "en-IN"): void {
  if (!text) return;
  jarvisVoiceService.speak(text, {
    language: lang.startsWith("hi") ? "hi" : lang.startsWith("mr") ? "mr" : "en",
  });
}

/** Speak and report when speech ends (or fails), so UI buttons can reflect playback state. */
export function speakWithEnd(text: string, lang: string, onEnd: () => void): boolean {
  if (!text) return false;
  jarvisVoiceService.speak(text, {
    language: lang.startsWith("hi") ? "hi" : lang.startsWith("mr") ? "mr" : "en",
    onEnd,
    onError: () => onEnd(),
  });
  return true;
}

export function stopSpeaking(): void {
  jarvisVoiceService.stop();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
