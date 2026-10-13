"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import Loader from "@/components/ui/Loader";

// "/" is the standalone role-selection screen for visitors (Header and BottomNav are hidden here).
// Signed-in users never see it: they are sent to their own dashboard.
export default function Home() {
  const router = useRouter();
  const { language } = useLanguage();

  // `loading` = session not read yet, which avoids flashing the wrong screen.
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading && role) router.replace(ROLE_HOME[role]);
  }, [loading, role, router]);

  if (loading) return <div className="min-h-[90vh]" />;
  if (role) return <Loader />;

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
      </div>
    );
}
