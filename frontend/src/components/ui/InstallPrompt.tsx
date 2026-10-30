"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { isStandalonePath } from "@/config/routes";
import { useLanguage } from "@/context/LanguageContext";

// Not in the standard DOM typings yet (Chromium-only "install app" event).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// "Later" / install-dismissal is remembered so the banner doesn't come back on every page load.
const DISMISS_KEY = "hm_install_dismissed_at";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // ask again after 7 days

const recentlyDismissed = (): boolean => {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

const rememberDismissal = () => {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — ignore */
  }
};

export default function InstallPrompt() {
  const pathname = usePathname();
  const { language }           = useLanguage();
  const [prompt, setPrompt]    = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]  = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed, or the user tapped "Later" recently — never show the banner.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    const snoozed = recentlyDismissed();

    let timer: ReturnType<typeof setTimeout> | undefined;

    // Listen for the install prompt event (keep it so the Install button still works)
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      if (!snoozed) timer = setTimeout(() => setVisible(true), 3000);
    };

    // Listen for successful install
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setInstalled(true);
    } else {
      dismiss();
    }
    setPrompt(null);
  };

  const L = (en: string, hi: string, mr: string): string => language === "hi" ? hi : language === "mr" ? mr : en;

  if (!visible || installed || isStandalonePath(pathname)) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-[420px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,.18)] py-4 px-[18px] flex items-center gap-3.5 z-[9999] border-[1.5px] border-brand animate-slide-up">

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
        <button onClick={dismiss}
          className="py-[5px] px-3.5 bg-transparent text-gray-400 text-[12px] cursor-pointer">
          {L("Later", "बाद में", "नंतर")}
        </button>
      </div>
    </div>
  );
}