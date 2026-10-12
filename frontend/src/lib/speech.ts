/** Speak a short instruction aloud (no-op where speech synthesis is unavailable). */
export function speak(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
