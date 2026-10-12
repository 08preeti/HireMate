"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface OnboardingSlide {
  emoji: string;
  dot: string;
  circle: string;
  button: string;
  titleEn: string; titleHi: string; titleMr: string;
  descEn: string; descHi: string; descMr: string;
}

// Full class names per screen (Tailwind cannot see dynamically built class names)
const SCREENS: OnboardingSlide[] = [
  {
    emoji: "🔍",
    dot: "bg-brand",
    circle: "bg-brand/[0.094] shadow-[0_0_0_20px_rgba(0,100,145,0.04)]",
    button: "bg-brand shadow-[0_6px_20px_rgba(0,100,145,0.25)]",
    titleEn: "Find Work Near You",
    titleHi: "पास में काम खोजें",
    titleMr: "जवळ काम शोधा",
    descEn: "See jobs within 2km of where you are right now. New jobs added every day.",
    descHi: "अभी आप जहाँ हैं उसके 2km के अंदर नौकरियां देखें। हर रोज़ नई नौकरियां।",
    descMr: "तुम्ही जिथे आहात त्याच्या 2km आत नोकऱ्या पहा. रोज नवीन नोकऱ्या.",
  },
  {
    emoji: "💵",
    dot: "bg-emerald-500",
    circle: "bg-emerald-500/[0.094] shadow-[0_0_0_20px_rgba(16,185,129,0.04)]",
    button: "bg-emerald-500 shadow-[0_6px_20px_rgba(16,185,129,0.25)]",
    titleEn: "Get Paid Same Day",
    titleHi: "उसी दिन पैसे मिलें",
    titleMr: "त्याच दिवशी पैसे मिळवा",
    descEn: "Many jobs pay cash on the same day. Know the salary before you apply.",
    descHi: "बहुत सी नौकरियों में उसी दिन नकद मिलता है। आवेदन से पहले वेतन जानें।",
    descMr: "अनेक नोकऱ्यांमध्ये त्याच दिवशी रोख मिळते. अर्ज करण्यापूर्वी पगार जाणा.",
  },
  {
    emoji: "⭐",
    dot: "bg-amber-500",
    circle: "bg-amber-500/[0.094] shadow-[0_0_0_20px_rgba(245,158,11,0.04)]",
    button: "bg-amber-500 shadow-[0_6px_20px_rgba(245,158,11,0.25)]",
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
  const router                = useRouter();
  const { language }          = useLanguage();

  const screen = SCREENS[current];
  const isLast = current === SCREENS.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem("onboardingDone", "true");
      router.push("/worker-login");
    } else {
      setCurrent(current + 1);
    }
  };

  const skip = () => {
    localStorage.setItem("onboardingDone", "true");
    router.push("/worker-login");
  };

  const title = language === "hi" ? screen.titleHi : language === "mr" ? screen.titleMr : screen.titleEn;
  const desc  = language === "hi" ? screen.descHi  : language === "mr" ? screen.descMr  : screen.descEn;

  const btnLabel = isLast
    ? (language === "hi" ? "शुरू करें 🚀" : language === "mr" ? "सुरू करा 🚀" : "Get Started 🚀")
    : (language === "hi" ? "आगे →" : language === "mr" ? "पुढे →" : "Next →");

  const skipLabel = language === "hi" ? "छोड़ें" : language === "mr" ? "वगळा" : "Skip";

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-white pt-10 px-6 pb-12 font-plain max-w-[480px] my-0 mx-auto">

      {/* Skip button */}
      <div className="w-full flex justify-end">
        <button onClick={skip} className="bg-transparent text-gray-400 text-[15px] cursor-pointer py-1 px-0">
          {skipLabel}
        </button>
      </div>

      {/* Big emoji illustration */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-7">

        {/* Circle with emoji */}
        <div className={`w-40 h-40 rounded-full flex items-center justify-center text-[80px] ${screen.circle}`}>
          {screen.emoji}
        </div>

        {/* Text */}
        <div>
          <h1 className="text-[28px] font-extrabold text-[#111111] mt-0 mx-0 mb-3.5 leading-[1.3]">
            {title}
          </h1>
          <p className="text-[16px] text-gray-500 leading-[1.7] m-0 max-w-[320px]">
            {desc}
          </p>
        </div>
      </div>

      {/* Dots + Button */}
      <div className="w-full flex flex-col items-center gap-7">

        {/* Progress dots */}
        <div className="flex gap-2">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === current ? `w-6 ${screen.dot}` : "w-2 bg-gray-200"}`}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={next}
          className={`w-full py-4 px-0 text-white rounded-2xl text-[18px] font-extrabold cursor-pointer transition-transform duration-100 active:scale-[0.98] ${screen.button}`}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}