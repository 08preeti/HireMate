"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import Loader from "@/components/ui/Loader";
import { HERO_PEOPLE, ICON_WORKER, ICON_EMPLOYER } from "./homeAssets";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

type Lang = "en" | "hi" | "mr";

const T = (en: string, hi: string, mr: string) => ({ en, hi, mr });

const COPY = {
  eyebrow: T("BUILDING A BETTER TOMORROW", "बेहतर कल का निर्माण", "चांगला उद्या घडवूया"),
  title1: T("Find the Right", "सही अवसर या", "योग्य संधी किंवा"),
  title2: T("Opportunity or Talent", "सही प्रतिभा खोजें", "योग्य कामगार शोधा"),
  sub: T(
    "HireMate connects skilled workers with the right jobs and helps employers find the best talent — quickly, safely and easily.",
    "HireMate कुशल कामगारों को सही नौकरी से जोड़ता है और नियोक्ताओं को सबसे अच्छी प्रतिभा खोजने में मदद करता है — जल्दी, सुरक्षित और आसानी से।",
    "HireMate कुशल कामगारांना योग्य नोकरीशी जोडते आणि नियोक्त्यांना सर्वोत्तम कामगार शोधण्यात मदत करते — जलद, सुरक्षित आणि सोप्या पद्धतीने."
  ),
  workerTitle: T("I'm a Worker", "मैं कामगार हूं", "मी कामगार आहे"),
  workerDesc: T("Find jobs near you and earn daily.", "नौकरी खोजें, पैसे कमाएं।", "नोकरी शोधा, पैसे कमवा."),
  workerBtn: T("Find Jobs", "नौकरी खोजें", "नोकरी शोधा"),
  employerTitle: T("I'm an Employer", "मैं नियोक्ता हूं", "मी नियोक्ता आहे"),
  employerDesc: T("Post jobs and find workers instantly.", "कामगार खोजें, नौकरी पोस्ट करें।", "कामगार शोधा, नोकरी पोस्ट करा."),
  employerBtn: T("Post a Job", "नौकरी पोस्ट करें", "नोकरी पोस्ट करा"),
};

const WorkerTags = [
  { label: "GPS Jobs", icon: "pin" },
  { label: "Voice", icon: "mic" },
  { label: "AI Match", icon: "ai" },
];
const EmployerTags = [
  { label: "Map Pin", icon: "pin" },
  { label: "Dashboard", icon: "chart" },
  { label: "Ratings", icon: "star" },
];

function TagIcon({ kind, color }: { kind: string; color: string }) {
  const paths: Record<string, ReactNode> = {
    pin: <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z" />,
    mic: <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15Zm-6-3.5a1 1 0 1 1 2 0 4 4 0 0 0 8 0 1 1 0 1 1 2 0 6 6 0 0 1-5 5.9V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.6a6 6 0 0 1-5-5.9Z" />,
    ai: <path d="M12 3a1 1 0 0 1 1 1v1.5h3.5A2.5 2.5 0 0 1 19 8v8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16V8a2.5 2.5 0 0 1 2.5-2.5H11V4a1 1 0 0 1 1-1Zm-2.5 7.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm5 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" />,
    chart: <path d="M4 4h2v14h14v2H4V4Zm4 8h3v5H8v-5Zm5-4h3v9h-3V8Zm5 2h2v7h-2v-7Z" />,
    star: <path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1l-5.6 2.9 1.1-6.2L3 9.4l6.2-.9L12 2.8Z" />,
  };
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill={color} aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

// "/" is the standalone role-selection screen for visitors (Header and BottomNav are hidden here).
// Signed-in users never see it: they are sent to their own dashboard.
export default function Home() {
  const router = useRouter();
  const { language } = useLanguage();
  const lang = (language as Lang) in { en: 1, hi: 1, mr: 1 } ? (language as Lang) : "en";
  const tr = (o: { en: string; hi: string; mr: string }) => o[lang];

  // `loading` = session not read yet, which avoids flashing the wrong screen.
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading && role) router.replace(ROLE_HOME[role]);
  }, [loading, role, router]);

  if (loading) return <div className="min-h-[90vh]" />;
  if (role) return <Loader />;

  return (
    <div
      className={`${poppins.className} relative min-h-screen overflow-hidden flex flex-col bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_55%,#f6f9ff_100%)]`}
    >
      {/* Soft blurred "city" backdrop on the right */}
      <div className="pointer-events-none absolute right-0 top-0 h-[300px] w-[60%] bg-[radial-gradient(ellipse_at_70%_30%,rgba(190,215,245,0.45),transparent_70%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1160px] flex-1 px-5 pb-32 pt-10 sm:px-8 lg:pt-14">
        {/* ───────── Hero ───────── */}
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_520px] lg:gap-12">
          <div className="py-2">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d4a63]">
              {tr(COPY.eyebrow)}
            </div>
            <h1 className="text-[34px] font-extrabold leading-[1.15] text-[#0d2250] sm:text-[42px] lg:text-[46px]">
              {tr(COPY.title1)}
              <br />
              {tr(COPY.title2)}
            </h1>
            <p className="mt-5 max-w-[460px] text-[15px] leading-[1.7] text-[#5b6578]">{tr(COPY.sub)}</p>
          </div>

          {/* People photo */}
          <div className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:ml-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_PEOPLE}
              alt="Four smiling workers on a rooftop at sunset"
              className="block w-full select-none rounded-[28px] shadow-[0_18px_44px_rgba(30,60,120,0.20)] ring-4 ring-white"
              draggable={false}
            />
          </div>
        </div>

        {/* ───────── Role cards ───────── */}
        <div className="relative z-20 mt-10 grid gap-6 md:grid-cols-2">
          {/* Worker */}
          <div className="rounded-[20px] border border-[#8fc1f5] bg-[linear-gradient(135deg,#f3f9ff_0%,#e8f2ff_100%)] p-5 shadow-[0_10px_30px_rgba(47,128,237,0.10)] sm:p-6">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ICON_WORKER} alt="" className="h-[68px] w-[68px] shrink-0 rounded-[18px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[22px] font-bold text-[#0d2250]">{tr(COPY.workerTitle)}</h2>
                  <span className="mt-1 text-[18px] text-[#2f80ed]">→</span>
                </div>
                <p className="mt-0.5 text-[13px] text-[#5b6578]">{tr(COPY.workerDesc)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WorkerTags.map((t) => (
                    <span key={t.label} className="inline-flex items-center gap-1.5 rounded-full bg-[#dcebff] px-3 py-1 text-[11px] font-semibold text-[#1f5fbf]">
                      <TagIcon kind={t.icon} color="#2f80ed" />
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/worker-login")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0b57c8] py-3 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(11,87,200,0.25)] transition hover:bg-[#0a4cae] active:scale-[0.99]"
            >
              {tr(COPY.workerBtn)} <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Employer */}
          <div className="rounded-[20px] border border-[#f5b5bf] bg-[linear-gradient(135deg,#fff6f7_0%,#ffeef0_100%)] p-5 shadow-[0_10px_30px_rgba(232,0,42,0.08)] sm:p-6">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ICON_EMPLOYER} alt="" className="h-[68px] w-[68px] shrink-0 rounded-[18px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[22px] font-bold text-[#0d2250]">{tr(COPY.employerTitle)}</h2>
                  <span className="mt-1 text-[18px] text-[#e8334f]">→</span>
                </div>
                <p className="mt-0.5 text-[13px] text-[#5b6578]">{tr(COPY.employerDesc)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EmployerTags.map((t) => (
                    <span key={t.label} className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdfe4] px-3 py-1 text-[11px] font-semibold text-[#c8203b]">
                      <TagIcon kind={t.icon} color={t.icon === "star" ? "#f5a623" : "#e8334f"} />
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/employer-login")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#e8334f] py-3 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(232,51,79,0.25)] transition hover:bg-[#d02843] active:scale-[0.99]"
            >
              {tr(COPY.employerBtn)} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom navy wave */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70px] w-full"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 40 C 220 90, 520 0, 820 28 C 1080 52, 1280 70, 1440 30 L1440 80 L0 80 Z" fill="#1d3f78" />
        <path d="M0 62 C 260 24, 560 84, 900 52 C 1120 32, 1300 40, 1440 58 L1440 80 L0 80 Z" fill="#0f2c5c" />
      </svg>
    </div>
  );
}