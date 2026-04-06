import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const SCREENS = [
  {
    emoji: "🔍",
    color: "#006491",
    titleEn: "Find Work Near You",
    titleHi: "पास में काम खोजें",
    titleMr: "जवळ काम शोधा",
    descEn: "See jobs within 2km of where you are right now. New jobs added every day.",
    descHi: "अभी आप जहाँ हैं उसके 2km के अंदर नौकरियां देखें। हर रोज़ नई नौकरियां।",
    descMr: "तुम्ही जिथे आहात त्याच्या 2km आत नोकऱ्या पहा. रोज नवीन नोकऱ्या.",
  },
  {
    emoji: "💵",
    color: "#10b981",
    titleEn: "Get Paid Same Day",
    titleHi: "उसी दिन पैसे मिलें",
    titleMr: "त्याच दिवशी पैसे मिळवा",
    descEn: "Many jobs pay cash on the same day. Know the salary before you apply.",
    descHi: "बहुत सी नौकरियों में उसी दिन नकद मिलता है। आवेदन से पहले वेतन जानें।",
    descMr: "अनेक नोकऱ्यांमध्ये त्याच दिवशी रोख मिळते. अर्ज करण्यापूर्वी पगार जाणा.",
  },
  {
    emoji: "⭐",
    color: "#f59e0b",
    titleEn: "Build Your Reputation",
    titleHi: "अपनी पहचान बनाएं",
    titleMr: "तुमची ओळख तयार करा",
    descEn: "Good work earns you 5-star ratings. Higher rating = more job offers.",
    descHi: "अच्छे काम पर 5-स्टार रेटिंग मिलती है। ज़्यादा रेटिंग = ज़्यादा नौकरी।",
    descMr: "चांगल्या कामावर 5-स्टार रेटिंग मिळते. जास्त रेटिंग = जास्त नोकऱ्या.",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate              = useNavigate();
  const { language }          = useLanguage();

  const screen = SCREENS[current];
  const isLast = current === SCREENS.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem("onboardingDone", "true");
      navigate("/worker-login");
    } else {
      setCurrent(current + 1);
    }
  };

  const skip = () => {
    localStorage.setItem("onboardingDone", "true");
    navigate("/worker-login");
  };

  const title = language === "hi" ? screen.titleHi : language === "mr" ? screen.titleMr : screen.titleEn;
  const desc  = language === "hi" ? screen.descHi  : language === "mr" ? screen.descMr  : screen.descEn;

  const btnLabel = isLast
    ? (language === "hi" ? "शुरू करें 🚀" : language === "mr" ? "सुरू करा 🚀" : "Get Started 🚀")
    : (language === "hi" ? "आगे →" : language === "mr" ? "पुढे →" : "Next →");

  const skipLabel = language === "hi" ? "छोड़ें" : language === "mr" ? "वगळा" : "Skip";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      background: "#fff", padding: "40px 24px 48px", fontFamily: "sans-serif",
      maxWidth: 480, margin: "0 auto",
    }}>

      {/* Skip button */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={skip} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 15, cursor: "pointer", padding: "4px 0" }}>
          {skipLabel}
        </button>
      </div>

      {/* Big emoji illustration */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 28 }}>

        {/* Circle with emoji */}
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: screen.color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 80,
          boxShadow: `0 0 0 20px ${screen.color}0a`,
        }}>
          {screen.emoji}
        </div>

        {/* Text */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 14px", lineHeight: 1.3 }}>
            {title}
          </h1>
          <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, margin: 0, maxWidth: 320 }}>
            {desc}
          </p>
        </div>
      </div>

      {/* Dots + Button */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {SCREENS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 99,
                background: i === current ? screen.color : "#e5e7eb",
                transition: "all .3s",
              }}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={next}
          style={{
            width: "100%", padding: "16px 0",
            background: screen.color, color: "#fff",
            border: "none", borderRadius: 16,
            fontSize: 18, fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 6px 20px ${screen.color}40`,
            transition: "transform .1s",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}