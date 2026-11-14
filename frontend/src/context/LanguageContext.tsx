"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "@/types";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const STORAGE_KEY = "hm_language";
const DEFAULT_LANGUAGE: Language = "en";
const SUPPORTED_LANGUAGES: readonly Language[] = ["en", "hi", "mr"];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function isLanguage(value: string | null): value is Language {
  return value !== null && SUPPORTED_LANGUAGES.includes(value as Language);
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Read browser storage after mount to keep server and client markup consistent.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguage(saved)) setLanguageState(saved);
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }

    // Keep multiple HireMate tabs in sync when the language changes elsewhere.
    const syncLanguage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !isLanguage(event.newValue)) return;
      setLanguageState(event.newValue);
    };

    window.addEventListener("storage", syncLanguage);
    return () => window.removeEventListener("storage", syncLanguage);
  }, []);

  // Keep the document language accurate for accessibility and browser tooling.
  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current tab still updates even if persistence is blocked.
    }
  }, []);

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
