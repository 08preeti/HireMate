"use client";

import { useEffect, useState } from "react";
import { useL } from "@/hooks/useL";
import { translateText } from "@/services/translate";
import type { Language } from "@/types";

// Remembers results for the session so the same review is never requested twice.
const memo = new Map<string, Promise<string>>();

function load(text: string, to: Language): Promise<string> {
  const key = `${to}:${text}`;
  let hit = memo.get(key);
  if (!hit) {
    hit = translateText(text, to).then((r) => r.text);
    hit.catch(() => memo.delete(key)); // allow a retry later if it failed
    memo.set(key, hit);
  }
  return hit;
}

/**
 * Shows user-written text (a review) in the active language.
 * Falls back to the original text while loading or if translation is unavailable,
 * and lets the reader switch back to what was actually written.
 */
export default function TranslatedText({ text }: { text: string }) {
  const { L, language } = useL();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    let alive = true;
    setTranslated(null);
    setShowOriginal(false);
    load(text, language)
      .then((out) => alive && setTranslated(out))
      .catch(() => alive && setTranslated(null));
    return () => {
      alive = false;
    };
  }, [text, language]);

  const changed = translated !== null && translated !== text;
  return (
    <>
      {changed && !showOriginal ? translated : text}
      {changed && (
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="ml-2 cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium not-italic text-[#1f6bff] underline-offset-2 hover:underline"
        >
          {showOriginal ? L("Show translation", "अनुवाद दिखाएं", "भाषांतर दाखवा") : L("Show original", "मूल देखें", "मूळ पहा")}
        </button>
      )}
    </>
  );
}