"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LOGIN } from "@/config/routes";

export default function Home() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];

  // `loading` = session not read yet, which avoids flashing the wrong screen.
  const { role, loading } = useAuth();

  useEffect(() => {
    // First-time visitors go through onboarding; signed-in users skip it
    if (!loading && role === null && !localStorage.getItem("onboardingDone")) {
      router.push("/onboarding");
    }
  }, [loading, role, router]);

  const handlePostJob = () => {
    router.push(role === "employer" ? "/post-job" : ROLE_LOGIN.employer);
  };

  if (loading) return <div className="min-h-[90vh]" />;

  // ── ROLE SELECTION SCREEN ──────────────────────────────
  if (role === null) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center py-6 px-5 font-plain bg-[linear-gradient(160deg,_#f0f9ff_0%,_#fff_60%)]">
        {/* Logo */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="bg-brand text-white font-black py-1.5 px-3 rounded-[10px] text-[20px]">HM</div>
            <span className="text-[28px] font-black text-brand">HireMate</span>
          </div>
          <div className="text-[14px] text-gray-500 mt-1">
            {language === "hi" ? "आप कौन हैं?" : language === "mr" ? "तुम्ही कोण आहात?" : "Who are you?"}
          </div>
        </div>

        {/* Role cards */}
        <div className="flex flex-col gap-4 w-full max-w-[380px]">

          {/* Worker card */}
          <button
            onClick={() => router.push("/worker-login")}
            className="bg-white border-2 border-gray-200 rounded-[20px] py-6 px-5 cursor-pointer text-left shadow-[0_4px_20px_rgba(0,0,0,.06)] transition-all duration-200 flex items-center gap-[18px] hover:border-brand hover:shadow-[0_8px_32px_rgba(0,100,145,.15)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-[linear-gradient(135deg,#006491,#004f73)] flex items-center justify-center text-[32px] shrink-0">
              👷
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-extrabold text-[#111111] mb-1">
                {language === "hi" ? "मैं कामगार हूं" : language === "mr" ? "मी कामगार आहे" : "I'm a Worker"}
              </div>
              <div className="text-[13px] text-gray-500 leading-normal">
                {language === "hi" ? "नौकरी खोजें, पैसे कमाएं" : language === "mr" ? "नोकरी शोधा, पैसे कमवा" : "Find jobs near you and earn daily"}
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {["📍 GPS Jobs", "🎤 Voice", "🤖 AI Match"].map(tag => (
                  <span key={tag} className="text-[11px] bg-brand-light text-brand rounded-[20px] py-0.5 px-2 font-semibold">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-[20px] text-brand shrink-0">→</div>
          </button>

          {/* Employer card */}
          <button
            onClick={() => router.push("/employer-login")}
            className="bg-white border-2 border-gray-200 rounded-[20px] py-6 px-5 cursor-pointer text-left shadow-[0_4px_20px_rgba(0,0,0,.06)] transition-all duration-200 flex items-center gap-[18px] hover:border-danger hover:shadow-[0_8px_32px_rgba(232,0,42,.12)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-[linear-gradient(135deg,#E8002A,#c0001f)] flex items-center justify-center text-[32px] shrink-0">
              🏢
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-extrabold text-[#111111] mb-1">
                {language === "hi" ? "मैं नियोक्ता हूं" : language === "mr" ? "मी नियोक्ता आहे" : "I'm an Employer"}
              </div>
              <div className="text-[13px] text-gray-500 leading-normal">
                {language === "hi" ? "कामगार खोजें, नौकरी पोस्ट करें" : language === "mr" ? "कामगार शोधा, नोकरी पोस्ट करा" : "Post jobs and find workers instantly"}
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {["🗺️ Map Pin", "📊 Dashboard", "⭐ Ratings"].map(tag => (
                  <span key={tag} className="text-[11px] bg-red-100 text-danger rounded-[20px] py-0.5 px-2 font-semibold">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-[20px] text-danger shrink-0">→</div>
          </button>
        </div>

        {/* Browse jobs without login */}
        <div className="mt-6 text-center">
          <Link href="/jobs" className="text-[14px] text-brand font-semibold no-underline">
            🔍 {language === "hi" ? "बिना लॉगिन नौकरियां देखें" : language === "mr" ? "लॉगिनशिवाय नोकऱ्या पहा" : "Browse jobs without login"} →
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex gap-4 flex-wrap justify-center">
          {[
            { emoji: "🔒", text: language === "hi" ? "100% सुरक्षित" : language === "mr" ? "100% सुरक्षित" : "100% Safe" },
            { emoji: "💸", text: language === "hi" ? "बिल्कुल मुफ्त" : language === "mr" ? "पूर्णपणे मोफत" : "Completely Free" },
            { emoji: "🌐", text: language === "hi" ? "हिंदी • मराठी" : language === "mr" ? "हिंदी • मराठी" : "Hindi • Marathi" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[12px] text-gray-500 font-semibold">
              <span>{b.emoji}</span><span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── LOGGED IN HOME (original layout) ──────────────────
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">

      <div className="bg-white rounded-2xl p-10 shadow-lg grid md:grid-cols-2 gap-10 items-center">

        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#006491] leading-tight">
            {t.heroTitle}
          </h1>
          <p className="mt-4 text-gray-600 max-w-xl">{t.heroSub}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            {role === "employer" ? (
              <>
                <button onClick={handlePostJob} className="bg-[#006491] text-white px-6 py-3 rounded-lg font-semibold shadow">
                  {t.postJob}
                </button>
                <Link href="/employer-dashboard" className="border border-[#006491] text-[#006491] px-6 py-3 rounded-lg font-semibold hover:bg-[#F0F7FA]">
                  {t.dashboard}
                </Link>
              </>
            ) : (
              <>
                <Link href="/jobs" className="border border-[#006491] text-[#006491] px-6 py-3 rounded-lg font-semibold hover:bg-[#F0F7FA]">
                  {t.viewJobs}
                </Link>
                <Link href="/ai-suggestions" className="bg-[#E8002A] text-white px-6 py-3 rounded-lg font-semibold">
                  {t.getAI}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#F3FAFF] rounded-2xl p-6 shadow-inner">
          <h3 className="text-xl font-bold text-[#006491] mb-2">{t.trending}</h3>
          <p className="text-sm text-gray-600 mb-4">{t.categories}</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { en: "Painter", hi: "पेंटर", mr: "रंगारी", city: "Nashik" },
              { en: "Driver",  hi: "ड्राइवर", mr: "चालक", city: "Pune" },
              { en: "Plumber", hi: "प्लंबर", mr: "प्लंबर", city: "Mumbai" },
              { en: "Electrician", hi: "इलेक्ट्रीशियन", mr: "इलेक्ट्रिशियन", city: "Nagpur" },
            ].map((job, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow text-sm">
                <div className="font-semibold">{language === "hi" ? job.hi : language === "mr" ? job.mr : job.en}</div>
                <div className="text-gray-500 text-xs">{job.city}</div>
              </div>
            ))}
          </div>
          {role === "worker" && (
            <div className="mt-4 text-right">
              <Link href="/jobs" className="text-sm text-[#006491] font-semibold hover:underline">{t.seeAll}</Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">{t.employer}</h4>
          <p className="text-gray-600 text-sm">{t.employerDesc}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">{t.worker}</h4>
          <p className="text-gray-600 text-sm">{t.workerDesc}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">{t.aiTitle}</h4>
          <p className="text-gray-600 text-sm">{t.aiDesc}</p>
        </div>
      </div>
    </div>
  );
}