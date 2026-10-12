"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

// Not in the standard DOM typings yet (Chromium-only "install app" event).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const { language }           = useLanguage();
  const [prompt, setPrompt]    = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]  = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Listen for the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setVisible(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setInstalled(true);
    }
    setPrompt(null);
  };

  const L = (en: string, hi: string, mr: string): string => language === "hi" ? hi : language === "mr" ? mr : en;

  if (!visible || installed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,.18)] py-4 px-[18px] flex items-center gap-3.5 z-[9999] border-[1.5px] border-brand animate-slide-up">

      <div className="text-[36px] shrink-0">📲</div>

      <div className="flex-1">
        <div className="text-[14px] font-extrabold text-[#111111] mb-0.5">
          {L("Install HireMate App", "HireMate ऐप इंस्टॉल करें", "HireMate ॲप इन्स्टॉल करा")}
        </div>
        <div className="text-[12px] text-gray-500">
          {L("Add to home screen — works offline!", "होम स्क्रीन पर जोड़ें — बिना इंटरनेट भी!", "होम स्क्रीनवर जोडा — ऑफलाइनही!")}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button onClick={install}
          className="py-2 px-3.5 bg-brand text-white rounded-[10px] font-bold text-[13px] cursor-pointer">
          {L("Install", "इंस्टॉल", "इन्स्टॉल")}
        </button>
        <button onClick={() => setVisible(false)}
          className="py-[5px] px-3.5 bg-transparent text-gray-400 text-[12px] cursor-pointer">
          {L("Later", "बाद में", "नंतर")}
        </button>
      </div>
    </div>
  );
}