"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import {
  FiBell, FiBriefcase, FiCheckCircle, FiChevronDown, FiCpu, FiGlobe, FiGrid, FiHelpCircle, FiHome, FiLogOut, FiMapPin, FiSearch, FiShield, FiUser,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_SELECT } from "@/config/routes";
import { getJobs } from "@/services/jobs";
import { getMyJobs } from "@/services/workers";
import type { Language } from "@/types";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

interface NavItem {
  path: string;
  icon: IconType;
  en: string;
  hi: string;
  mr: string;
  badge?: "new" | "jobs" | "myJobs";
}

// Sidebar (desktop)
const SIDE_ITEMS: NavItem[] = [
  { path: "/worker-dashboard", icon: FiHome,      en: "Home",           hi: "होम",           mr: "मुख्य" },
  { path: "/jobs",             icon: FiBriefcase, en: "Jobs",           hi: "नौकरियां",      mr: "नोकऱ्या",     badge: "jobs" },
  { path: "/my-jobs",          icon: FiGrid,      en: "My Jobs",        hi: "मेरे काम",      mr: "माझी कामे",   badge: "myJobs" },
  { path: "/worker-profile",   icon: FiUser,      en: "Worker Profile", hi: "मेरी प्रोफ़ाइल", mr: "माझी प्रोफाइल" },
  { path: "/ai-suggestions",   icon: FiCpu,       en: "AI Matcher",     hi: "AI मैचर",       mr: "AI मॅचर",     badge: "new" },
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
  const [counts, setCounts] = useState<{ jobs?: number; myJobs?: number }>({});

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);
  const phone = worker?.phone;

  // Sidebar counters (Jobs / My Jobs). Failures are silent: the badge just stays hidden.
  useEffect(() => {
    getJobs().then((d) => setCounts((c) => ({ ...c, jobs: d.length }))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!phone) return;
    getMyJobs(phone).then((d) => setCounts((c) => ({ ...c, myJobs: d.length }))).catch(() => {});
  }, [phone, pathname]);

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

  const helpLabel = L("Help Center", "सहायता केंद्र", "मदत केंद्र");
  const logoutLabel = L("Logout", "लॉगआउट", "लॉगआउट");
  const initial = (worker?.name || "W").trim().charAt(0).toUpperCase();

  const badgeFor = (item: NavItem, active: boolean) => {
    if (item.badge === "new")
      return <span className="ml-auto rounded-full bg-[#22c5f0] px-2.5 py-0.5 text-[10.5px] font-extrabold tracking-wide text-[#062a44]">{L("NEW", "नया", "नवीन")}</span>;
    const n = item.badge === "jobs" ? counts.jobs : item.badge === "myJobs" ? counts.myJobs : undefined;
    if (n === undefined) return null;
    const text = item.badge === "myJobs" ? `${n} ${L("Total", "कुल", "एकूण")}` : String(n);
    return (
      <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${active ? "bg-[#0d3fa8] text-white" : "bg-white/10 text-[#e4ecfb]"}`}>
        {text}
      </span>
    );
  };

  return (
    <div className={`${inter.className} min-h-screen bg-[#f6f8fc] text-[#0b1b3d]`}>
      {/* ───────── Top bar ───────── */}
      <header className="sticky top-0 z-[900] flex h-[68px] items-center justify-between border-b border-white/10 bg-[#0b1f47] px-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/worker-dashboard" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#1f6bff] text-[14px] font-extrabold tracking-tight text-white">HM</span>
            <span className="text-[22px] font-bold tracking-tight text-white">HireMate</span>
          </Link>
          <span className="ml-1 hidden rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#d6e1f7] xl:inline">
            {L("Worker Portal", "कामगार पोर्टल", "कामगार पोर्टल")}
          </span>
        </div>

        {/* Search */}
        <form onSubmit={submitSearch} className="mx-6 hidden max-w-[640px] flex-1 md:block">
          <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 focus-within:border-white/40 focus-within:bg-white/10">
            <FiSearch size={18} className="shrink-0 text-[#b9c8e6]" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L("Search jobs by trade (e.g. Cook, Driver, Electrician), area or skill...", "काम, इलाके या हुनर से नौकरी खोजें…", "काम, परिसर किंवा कौशल्याने नोकरी शोधा…")}
              aria-label={L("Search jobs", "नौकरी खोजें", "नोकरी शोधा")}
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[#9db0d3]"
            />
            <kbd className="hidden shrink-0 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[#b9c8e6] lg:block">⌘K</kbd>
          </label>
        </form>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Language */}
          <label className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[14px]">
            <FiGlobe size={16} aria-hidden="true" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language"
              className="cursor-pointer appearance-none bg-transparent pr-5 text-[14px] text-white outline-none"
            >
              <option value="en" className="text-black">English</option>
              <option value="hi" className="text-black">हिंदी</option>
              <option value="mr" className="text-black">मराठी</option>
            </select>
            <FiChevronDown size={14} className="pointer-events-none absolute right-2.5" aria-hidden="true" />
          </label>

          <Link href="/worker-dashboard" aria-label="Notifications" className="relative hidden rounded-full p-2 text-white no-underline hover:bg-white/10 sm:block">
            <FiBell size={20} />
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b1f47] bg-[#ff4757]" />
          </Link>

          <span className="hidden h-8 w-px bg-white/15 sm:block" />

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-white/10"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#fbbf24] text-[16px] font-bold text-[#3b2a00]">
                {initial}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0b1f47] bg-[#22c55e]" />
              </span>
              <span className="hidden max-w-[170px] text-left leading-tight sm:block">
                <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
                  {worker?.name}
                  <FiChevronDown size={14} aria-hidden="true" />
                </span>
                <span className="block truncate text-[12px] font-medium text-[#4be08f]">
                  {worker?.skills ? `${worker.skills} • ` : ""}{L("Verified Active", "सत्यापित सक्रिय", "सत्यापित सक्रिय")}
                </span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[950]" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 z-[960] mt-2 w-52 overflow-hidden rounded-xl border border-[#e6ecf5] bg-white py-1 text-[#0b1b3d] shadow-[0_12px_32px_rgba(20,50,110,0.18)]">
                  <Link href="/worker-profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-[#0b1b3d] no-underline hover:bg-[#f2f7ff]">
                    <FiUser size={16} /> {L("Worker Profile", "मेरी प्रोफ़ाइल", "माझी प्रोफाइल")}
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
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <nav className="sticky top-[68px] flex h-[calc(100vh-68px)] flex-col bg-[#0b1f47] px-4 py-5 text-white">
            <ul className="space-y-1.5">
              {SIDE_ITEMS.map((item) => {
                const { path, icon: Icon } = item;
                const active = isActive(path);
                return (
                  <li key={path}>
                    <Link
                      href={path}
                      className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15.5px] no-underline transition ${active ? "bg-[#1f6bff] font-semibold text-white" : "text-[#d6e1f7] hover:bg-white/10"}`}
                    >
                      <Icon size={20} aria-hidden="true" />
                      {label(item)}
                      {badgeFor(item, active)}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Profile status */}
            <Link
              href="/worker-profile"
              className={`mt-7 block rounded-xl border p-4 no-underline ${profileDone ? "border-[#1f7a55] bg-[#0c3340]" : "border-[#3d5fa8] bg-white/5"}`}
            >
              <div className={`flex items-center gap-2 text-[14.5px] font-semibold ${profileDone ? "text-[#34d399]" : "text-white"}`}>
                {profileDone ? <FiCheckCircle size={17} aria-hidden="true" /> : <FiUser size={17} aria-hidden="true" />}
                {profileDone ? L("Profile Complete", "प्रोफ़ाइल पूरी", "प्रोफाइल पूर्ण") : L("Complete your profile", "प्रोफ़ाइल पूरी करें", "प्रोफाइल पूर्ण करा")}
              </div>
              <div className="mt-1.5 text-[12.5px] leading-snug text-[#d6e1f7]">
                {profileDone
                  ? L("Ready to accept high-rate contracts and receive direct calls!", "ऊँची दर के काम लेने और सीधे कॉल पाने के लिए तैयार!", "जास्त दराची कामे घेण्यासाठी आणि थेट कॉल मिळवण्यासाठी तयार!")
                  : L("Add your skill and area to get better job matches.", "बेहतर नौकरी के लिए हुनर और इलाका जोड़ें।", "चांगल्या नोकऱ्यांसाठी कौशल्य आणि परिसर जोडा.")}
              </div>
            </Link>

            <div className="mt-auto">
              <ul className="space-y-1 border-t border-white/10 pt-4">
                <li>
                  <Link href="/ai-suggestions" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[#d6e1f7] no-underline hover:bg-white/10">
                    <FiHelpCircle size={18} aria-hidden="true" /> {helpLabel}
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[#d6e1f7] hover:bg-white/10">
                    <FiLogOut size={18} aria-hidden="true" /> {logoutLabel}
                  </button>
                </li>
              </ul>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#34d399]">
                  <FiShield size={15} aria-hidden="true" /> {L("Verified Payouts", "सत्यापित भुगतान", "सत्यापित पेमेंट")}
                </div>
                <div className="mt-1.5 text-[12.5px] leading-snug text-[#aebcd8]">
                  {L("Every gig on HireMate is protected by fair wage escrow guarantee.", "हायरमेट पर हर काम उचित मज़दूरी एस्क्रो गारंटी से सुरक्षित है।", "हायरमेटवरील प्रत्येक काम योग्य मजुरी एस्क्रो हमीने सुरक्षित आहे.")}
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* ───────── Page content ───────── */}
        <main className="min-w-0 flex-1 pb-28 lg:pb-12">{children}</main>
      </div>

      {/* ───────── Floating assistant pill ───────── */}
      <Link
        href="/ai-suggestions"
        className="fixed bottom-20 right-4 z-[880] flex items-center gap-3 rounded-full bg-[#1f6bff] py-2.5 pl-3 pr-4 text-white no-underline shadow-[0_10px_28px_rgba(31,107,255,0.45)] transition hover:bg-[#1859d6] sm:right-6 lg:bottom-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-[#1f6bff]">?</span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-[14px] font-bold">{L("Need Help?", "मदद चाहिए?", "मदत हवी?")}</span>
          <span className="block text-[12px] text-[#dbe7ff]">{L("Ask HireMate Assistant", "हायरमेट असिस्टेंट से पूछें", "हायरमेट असिस्टंटला विचारा")}</span>
        </span>
      </Link>

      {/* ───────── Bottom tabs (mobile) ───────── */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] flex border-t border-[#e6ecf5] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(20,50,110,0.08)] lg:hidden">
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-1 pb-2 pt-2.5 ${active ? "text-[#1f6bff]" : "text-[#7d889e]"}`}
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