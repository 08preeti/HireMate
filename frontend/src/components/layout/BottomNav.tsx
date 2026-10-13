"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { isStandalonePath } from "@/config/routes";

interface NavTab {
  path: string;
  icon: string;
  labelEn: string;
  labelHi: string;
  labelMr: string;
}

const WORKER_TABS: NavTab[] = [
  { path: "/",                 icon: "🏠", labelEn: "Home",    labelHi: "होम",       labelMr: "मुख्य" },
  { path: "/jobs",             icon: "💼", labelEn: "Jobs",    labelHi: "नौकरी",     labelMr: "नोकरी" },
  { path: "/ai-suggestions",   icon: "🤖", labelEn: "AI",      labelHi: "AI",        labelMr: "AI" },
  { path: "/worker-dashboard", icon: "📍", labelEn: "Nearby",  labelHi: "पास में",   labelMr: "जवळ" },
  { path: "/worker-profile",   icon: "👷", labelEn: "Profile", labelHi: "प्रोफ़ाइल", labelMr: "प्रोफाइल" },
];

const EMPLOYER_TABS: NavTab[] = [
  { path: "/",                   icon: "🏠", labelEn: "Home",       labelHi: "होम",          labelMr: "मुख्य" },
  { path: "/post-job",           icon: "➕", labelEn: "Post Job",   labelHi: "नौकरी पोस्ट", labelMr: "नोकरी पोस्ट" },
  { path: "/employer-dashboard", icon: "📊", labelEn: "Dashboard",  labelHi: "डैशबोर्ड",    labelMr: "डॅशबोर्ड" },
  { path: "/applications",       icon: "📋", labelEn: "Applicants", labelHi: "आवेदक",       labelMr: "अर्जदार" },
];

// Pages where bottom nav should NOT show
const HIDE_ON = ["/onboarding", "/worker-login", "/navigate"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  const { role } = useAuth();

  // Hide on certain pages
  if (isStandalonePath(pathname)) return null;
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  // Hide if nobody is logged in (or the session has not been read yet)
  if (!role) return null;

  // One active role => exactly that role's tabs
  const tabs = role === "worker" ? WORKER_TABS : EMPLOYER_TABS;
  const getLabel = (tab: NavTab): string =>
    language === "hi" ? tab.labelHi : language === "mr" ? tab.labelMr : tab.labelEn;

  const isActive = (path: string): boolean => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Spacer so content doesn't hide behind nav */}
      <div className="h-[70px]" />

      <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-white border-t border-[#f0f0f0] shadow-[0_-4px_20px_rgba(0,0,0,.08)] flex pb-[env(safe-area-inset-bottom)] font-plain">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex-1 pt-2.5 px-1 pb-2 bg-transparent cursor-pointer flex flex-col items-center gap-[3px] relative"
            >
              {/* Active indicator dot */}
              {active && <div className="absolute top-1.5 w-1 h-1 rounded-full bg-brand" />}
              <span
                className={`text-[22px] transition-all duration-200 ${
                  active ? "scale-[1.15]" : "scale-100 grayscale opacity-50"
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] transition-all duration-200 ${
                  active ? "font-bold text-brand" : "font-normal text-gray-400"
                }`}
              >
                {getLabel(tab)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
