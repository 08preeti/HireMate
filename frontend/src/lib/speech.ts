/** Speak text aloud (no-op where speech synthesis is unavailable). `lang` is a BCP-47 tag, default en-IN. */
export function speak(text: string, lang = "en-IN"): void {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/** Speak and report when speech ends (or fails), so a button can flip back from "Stop". */
export function speakWithEnd(text: string, lang: string, onEnd: () => void): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}