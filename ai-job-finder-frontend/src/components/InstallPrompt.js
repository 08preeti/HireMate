import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function InstallPrompt() {
  const { language }           = useLanguage();
  const [prompt, setPrompt]    = useState(null);
  const [visible, setVisible]  = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Listen for the install prompt event
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
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

  const L = (en, hi, mr) => language === "hi" ? hi : language === "mr" ? mr : en;

  if (!visible || installed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: 16, right: 16,
      background: "#fff", borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,.18)",
      padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14,
      zIndex: 9999,
      border: "1.5px solid #006491",
      animation: "slideUp .4s ease",
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ fontSize: 36, flexShrink: 0 }}>📲</div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 2 }}>
          {L("Install HireMate App", "HireMate ऐप इंस्टॉल करें", "HireMate ॲप इन्स्टॉल करा")}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {L("Add to home screen — works offline!", "होम स्क्रीन पर जोड़ें — बिना इंटरनेट भी!", "होम स्क्रीनवर जोडा — ऑफलाइनही!")}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button onClick={install}
          style={{ padding: "8px 14px", background: "#006491", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {L("Install", "इंस्टॉल", "इन्स्टॉल")}
        </button>
        <button onClick={() => setVisible(false)}
          style={{ padding: "5px 14px", background: "none", color: "#9ca3af", border: "none", fontSize: 12, cursor: "pointer" }}>
          {L("Later", "बाद में", "नंतर")}
        </button>
      </div>
    </div>
  );
}