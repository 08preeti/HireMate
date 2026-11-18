import { HttpError } from "../utils/httpError.js";

// Translates short user-written text (reviews) into the viewer's language.
// Uses MyMemory's free endpoint (no API key). To switch provider, only change fetchTranslation().
const ENDPOINT = "https://api.mymemory.translated.net/get";
const LANGS = new Set(["en", "hi", "mr"]);
const MAX_CHARS = 500;
const TIMEOUT_MS = 8000;
const CACHE_LIMIT = 1000;

const cache = new Map();
const DEVANAGARI = /[\u0900-\u097F]/;

function alreadyInTarget(text, to) {
  const hasDevanagari = DEVANAGARI.test(text);
  return to === "en" ? !hasDevanagari : hasDevanagari;
}

async function fetchTranslation(text, to) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`Autodetect|${to}`)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Translate provider ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (data?.responseStatus !== 200 || typeof out !== "string" || !out.trim()) throw new Error("Translate provider returned no text");
  return out.trim();
}

export async function translateText(rawText, to) {
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (!text) throw new HttpError(400, "Text is required");
  if (text.length > MAX_CHARS) throw new HttpError(400, `Text must be ${MAX_CHARS} characters or fewer`);
  if (!LANGS.has(to)) throw new HttpError(400, "Unsupported language");

  // Already written in the target script: nothing to translate.
  if (alreadyInTarget(text, to)) return { text, translated: false };

  const key = `${to}:${text}`;
  if (cache.has(key)) return { text: cache.get(key), translated: true };

  let out;
  try {
    out = await fetchTranslation(text, to);
  } catch (err) {
    console.error("translate failed", err?.message);
    throw new HttpError(502, "Translation is not available right now");
  }
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, out);
  return { text: out, translated: out !== text };
}