"use client";

import { useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/types";

/** Picks the English / Hindi / Marathi text for the active language. */
export function useL(): {
  L: (en: string, hi?: string, mr?: string) => string;
  language: Language;
} {
  const { language } = useLanguage();
  const L = useCallback(
    (en: string, hi?: string, mr?: string) => {
      if (language === "hi") return hi?.trim() ? hi : en;
      if (language === "mr") return mr?.trim() ? mr : en;
      return en;
    },
    [language],
  );
  return { L, language };
}
