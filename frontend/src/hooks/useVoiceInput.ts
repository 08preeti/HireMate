"use client";

import { useCallback, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { matchSkill } from "@/components/ui/VoiceSearch";

// The Web Speech API is not in TypeScript's DOM typings, so describe the parts we use.
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((e: { results: ArrayLike<{ length: number; [i: number]: { transcript: string } }> }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => RecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };

/** One-shot voice input in the worker's language. onResult gets the matched skill (or null) and the transcript. */
export function useVoiceInput(onResult: (skill: string | null, transcript: string) => void) {
  const { language } = useLanguage();
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recogRef = useRef<RecognitionLike | null>(null);

  const stop = useCallback(() => recogRef.current?.stop(), []);

  const start = useCallback(() => {
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setUnsupported(true); return; }
    setUnsupported(false);

    const recog = new Ctor();
    recog.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    recog.interimResults = false;
    recog.maxAlternatives = 3;
    recog.onstart = () => setListening(true);
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    recog.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      onResult(matchSkill(transcript), transcript);
    };
    recogRef.current = recog;
    recog.start();
  }, [language, onResult]);

  return { listening, unsupported, start, stop };
}