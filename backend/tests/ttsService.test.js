import test from "node:test";
import assert from "node:assert/strict";
import {
  generateSpeech,
  getAudioBuffer,
  NEURAL_VOICES,
  ALISHA_VOICE_CONFIG,
  detectLanguage,
} from "../src/services/ttsService.js";

test("ttsService: validates empty or non-string input text", async () => {
  const r1 = await generateSpeech({ text: "" });
  assert.equal(r1.success, false);
  assert.equal(r1.code, "INVALID_TEXT");

  const r2 = await generateSpeech({ text: "   " });
  assert.equal(r2.success, false);
  assert.equal(r2.code, "INVALID_TEXT");
});

test("ttsService: accurately detects English, Hindi, and Marathi languages", () => {
  assert.equal(detectLanguage("Hello! How can I help you?"), "en");
  assert.equal(detectLanguage("नमस्ते! आप कैसे हैं?"), "hi");
  assert.equal(detectLanguage("नमस्कार! मला नोकरी हवी आहे."), "mr");
});

test("ttsService: exports configured Alisha voice identity", () => {
  assert.equal(ALISHA_VOICE_CONFIG.name, "Alisha");
  assert.equal(ALISHA_VOICE_CONFIG.provider, "edge-neural");
});

test("ttsService: generates speech and caches audio buffer", async () => {
  const res = await generateSpeech({
    text: "Welcome to HireMate.",
    language: "en",
  });
  assert.equal(res.success, true);
  assert.ok(res.audioId);
  assert.ok(res.audioUrl.includes("/api/assistant/tts/stream?id="));

  // Retrieve buffer from cache
  const buffer = getAudioBuffer(res.audioId);
  assert.ok(buffer);
  assert.ok(buffer.length > 1000);
});
