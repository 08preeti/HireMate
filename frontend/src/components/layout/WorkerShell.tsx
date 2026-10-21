"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Poppins } from "next/font/google";
import {
  FiArrowRight, FiBell, FiBriefcase, FiCheckCircle, FiChevronDown, FiCpu, FiGlobe, FiGrid, FiHelpCircle, FiHome, FiLogOut, FiMapPin, FiMessageCircle, FiSearch, FiUser,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_SELECT } from "@/config/routes";
import type { Language } from "@/types";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

interface NavItem {
  path: string;
  icon: IconType;
  en: string;
  hi: string;
  mr: string;
  badge?: string;
}

// Sidebar (desktop)
const SIDE_ITEMS: NavItem[] = [
  { path: "/worker-dashboard", icon: FiHome,      en: "Home",           hi: "होम",           mr: "मुख्य" },
  { path: "/jobs",             icon: FiBriefcase, en: "Jobs",           hi: "नौकरियां",      mr: "नोकऱ्या" },
  { path: "/my-jobs",          icon: FiGrid,      en: "My Jobs",        hi: "मेरे काम",      mr: "माझी कामे" },
  { path: "/worker-profile",   icon: FiUser,      en: "Worker Profile", hi: "मेरी प्रोफ़ाइल", mr: "माझी प्रोफाइल" },
  { path: "/ai-suggestions",   icon: FiCpu,       en: "AI Matcher",     hi: "AI मैचर",       mr: "AI मॅचर", badge: "New" },
];

// Bottom bar (mobile)
const TAB_ITEMS: NavItem[] = [
  { path: "/worker-dashboard", icon: FiHome,      en: "Home",    hi: "होम",       mr: "मुख्य" },
  { path: "/jobs",             icon: FiBriefcase, en: "Jobs",    hi: "नौकरी",     mr: "नोकरी" },
  { path: "/ai-suggestions",   icon: FiCpu,       en: "AI Bot",  hi: "AI बॉट",    mr: "AI बॉट" },
  { path: "/navigate",         icon: FiMapPin,    en: "Nearby",  hi: "पास में",   mr: "जवळ" },
  { path: "/worker-profile",   icon: FiUser,      en: "Profile", hi: "प्रोफ़ाइल", mr: "प्रोफाइल" },
];

export default function WorkerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { worker, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/jobs?q=${encodeURIComponent(query.trim())}` : "/jobs");
  };

  // Profile completeness (name, skill, area, phone)
  const profileFields = [worker?.name, worker?.skills, worker?.location, worker?.phone || worker?.contact];
  const profileDone = profileFields.every(Boolean);

  const label = (i: NavItem) => (language === "hi" ? i.hi : language === "mr" ? i.mr : i.en);
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    logout();
    router.push(ROLE_SELECT);
  };

  const helpLabel = language === "hi" ? "सहायता केंद्र" : language === "mr" ? "मदत केंद्र" : "Help Center";
  const logoutLabel = language === "hi" ? "लॉगआउट" : language === "mr" ? "लॉगआउट" : "Logout";
  const initial = (worker?.name || "W").trim().charAt(0).toUpperCase();

  return (
    <div className={`${poppins.className} min-h-screen bg-[#f4f7fc] text-[#0d2250]`}>
      {/* ───────── Top bar ───────── */}
      <header className="sticky top-0 z-[900] flex h-14 items-center justify-between bg-[#0c2a5c] px-4 text-white shadow-[0_2px_10px_rgba(8,24,60,0.25)] sm:px-5">
        <div className="flex items-center gap-3">
          <Link href="/worker-dashboard" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-8 w-9 items-center justify-center rounded-lg bg-white text-[14px] font-extrabold text-[#0c2a5c]">HM</span>
            <span className="text-[19px] font-extrabold text-white">HireMate</span>
          </Link>
          <span className="hidden rounded-full border border-[#4a78c9] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#cfe0ff] lg:inline">
            {L("Worker Portal", "कामगार पोर्टल", "कामगार पोर्टल")}
          </span>
        </div>

        {/* Search */}
        <form onSubmit={submitSearch} className="mx-4 hidden max-w-[560px] flex-1 md:block">
          <label className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2.5 ring-1 ring-white/15 focus-within:bg-white/15 focus-within:ring-white/40">
            <FiSearch size={17} className="shrink-0 text-[#cfe0ff]" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L("Search jobs by trade (e.g. Cook, Driver, Electrician), area or skill…", "काम, इलाके या हुनर से नौकरी खोजें…", "काम, परिसर किंवा कौशल्याने नोकरी शोधा…")}
              aria-label={L("Search jobs", "नौकरी खोजें", "नोकरी शोधा")}
              className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#a9bfe6]"
            />
          </label>
        </form>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Language */}
          <label className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-white/25 px-3 py-1.5 text-[13px]">
            <FiGlobe size={15} aria-hidden="true" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language"
              className="cursor-pointer appearance-none bg-transparent pr-4 text-[13px] text-white outline-none"
            >
              <option value="en" className="text-black">English</option>
              <option value="hi" className="text-black">हिंदी</option>
              <option value="mr" className="text-black">मराठी</option>
            </select>
            <FiChevronDown size={14} className="pointer-events-none absolute right-2.5" aria-hidden="true" />
          </label>

          <Link href="/worker-dashboard" aria-label="Notifications" className="hidden rounded-full p-2 text-white no-underline hover:bg-white/10 sm:block">
            <FiBell size={19} />
          </Link>

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-white/10"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#0c2a5c]">{initial}</span>
              <span className="hidden max-w-[140px] text-left leading-tight sm:block">
                <span className="block truncate text-[13px] font-semibold">{worker?.name}</span>
                {worker?.skills && <span className="block truncate text-[11px] text-[#7fe0a6]">{worker.skills}</span>}
              </span>
              <FiChevronDown size={15} aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[950]" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 z-[960] mt-2 w-48 overflow-hidden rounded-xl border border-[#e6ecf5] bg-white py-1 text-[#0d2250] shadow-[0_12px_32px_rgba(20,50,110,0.18)]">
                  <Link href="/worker-profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-[#0d2250] no-underline hover:bg-[#f2f7ff]">
                    <FiUser size={16} /> {SIDE_ITEMS[3][language === "hi" ? "hi" : language === "mr" ? "mr" : "en"]}
                  </Link>
                  <button onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-[#d6203a] hover:bg-red-50">
                    <FiLogOut size={16} /> {logoutLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="lg:flex">
        {/* ───────── Sidebar (desktop) ───────── */}
        <aside className="hidden w-[220px] shrink-0 lg:block">
          <nav className="sticky top-14 flex h-[calc(100vh-56px)] flex-col bg-[linear-gradient(180deg,#0e2f6a_0%,#0a2150_100%)] px-3 py-4 text-white">
            <ul className="space-y-1.5">
              {SIDE_ITEMS.map(({ path, icon: Icon, badge, ...rest }) => {
                const active = isActive(path);
                return (
                  <li key={path}>
                    <Link
                      href={path}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] no-underline transition ${active ? "bg-[#1a6cf0] font-semibold text-white shadow-[0_6px_16px_rgba(26,108,240,0.35)]" : "text-[#d3e0f7] hover:bg-white/10"}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label({ path, icon: Icon, ...rest })}
                      {badge && <span className="rounded-full bg-[#7cc4ff] px-2 py-0.5 text-[10px] font-bold text-[#0a2150]">{badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Profile status */}
            <Link
              href="/worker-profile"
              className={`mt-6 block rounded-xl border p-3.5 no-underline ${profileDone ? "border-[#2f8f63] bg-[#0f3b4a]/60" : "border-[#4a78c9] bg-white/5"}`}
            >
              <div className="flex items-start gap-3">
                {profileDone
                  ? <FiCheckCircle size={26} className="mt-0.5 shrink-0 text-[#4be08f]" aria-hidden="true" />
                  : <FiUser size={26} className="mt-0.5 shrink-0 text-[#9dc0ff]" aria-hidden="true" />}
                <div>
                  <div className={`text-[14px] font-bold ${profileDone ? "text-[#4be08f]" : "text-white"}`}>
                    {profileDone ? L("Profile Complete", "प्रोफ़ाइल पूरी", "प्रोफाइल पूर्ण") : L("Complete your profile", "प्रोफ़ाइल पूरी करें", "प्रोफाइल पूर्ण करा")}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-snug text-[#c9d9f3]">
                    {profileDone
                      ? L("You're ready to work and get more jobs!", "आप काम के लिए तैयार हैं!", "तुम्ही कामासाठी तयार आहात!")
                      : L("Add your skill and area to get better job matches.", "बेहतर नौकरी के लिए हुनर और इलाका जोड़ें।", "चांगल्या नोकऱ्यांसाठी कौशल्य आणि परिसर जोडा.")}
                  </div>
                </div>
              </div>
            </Link>

            <div className="mt-auto">
              <ul className="space-y-1.5">
                <li>
                  <Link href="/ai-suggestions" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] text-[#d3e0f7] no-underline hover:bg-white/10">
                    <FiHelpCircle size={18} aria-hidden="true" /> {helpLabel}
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[14px] text-[#d3e0f7] hover:bg-white/10">
                    <FiLogOut size={18} aria-hidden="true" /> {logoutLabel}
                  </button>
                </li>
              </ul>

              <Link href="/ai-suggestions" className="mt-3 flex items-center gap-3 rounded-xl border border-[#2a4a86] bg-white/5 p-3.5 no-underline hover:bg-white/10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a6cf0] text-white"><FiMessageCircle size={19} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-white">{L("Need Help?", "मदद चाहिए?", "मदत हवी?")}</span>
                  <span className="block text-[11.5px] leading-snug text-[#c9d9f3]">{L("Ask the HireMate assistant", "हायरमेट असिस्टेंट से पूछें", "हायरमेट असिस्टंटला विचारा")}</span>
                </span>
                <FiArrowRight size={16} className="shrink-0 text-[#c9d9f3]" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </aside>

        {/* ───────── Page content ───────── */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* ───────── Bottom tabs (mobile) ───────── */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] flex border-t border-[#e6ecf5] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(20,50,110,0.08)] lg:hidden">
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-1 pb-2 pt-2.5 ${active ? "text-[#1a6cf0]" : "text-[#7d889e]"}`}
            >
              <Icon size={21} aria-hidden="true" />
              <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{label(tab)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}