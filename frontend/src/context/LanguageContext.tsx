"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "@/types";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const STORAGE_KEY = "hm_language";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en"); // default English

  // Restore the language the user picked last time (read after mount so server and browser HTML match).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "hi" || saved === "mr") setLanguageState(saved);
    } catch {
      /* storage unavailable — stay on English */
    }
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}