"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/types";

/** Picks the English / Hindi / Marathi text for the active language. */
export function useL(): { L: (en: string, hi: string, mr: string) => string; language: Language } {
  const { language } = useLanguage();
  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);
  return { L, language };
}
