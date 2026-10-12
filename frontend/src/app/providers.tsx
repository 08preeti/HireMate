"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/components/ui/Toast";
import { API_URL } from "@/config/env";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Wake up the (Render) backend on app load to reduce cold start delay
    fetch(`${API_URL}/`).catch(() => {});

    // Register the service worker for PWA support (production only, so it
    // never caches dev-server chunks and breaks hot reloading).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = (): Promise<void> =>
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("✅ SW registered:", reg.scope))
          .catch((err) => console.log("SW registration failed:", err));

      if (document.readyState === "complete") register();
      else {
        window.addEventListener("load", register);
        return () => window.removeEventListener("load", register);
      }
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
