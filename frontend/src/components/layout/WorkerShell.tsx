"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiBell, FiBriefcase, FiCheckCircle, FiCpu, FiGrid, FiHelpCircle, FiHome,
  FiLogOut, FiMapPin, FiMic, FiSearch, FiShield, FiUser,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_LOGIN } from "@/config/routes";
import { getJobs } from "@/services/jobs";
import type { Language } from "@/types";

type L3 = Record<Language, string>;
const pick = (l: L3, lang: Language) => l[lang] ?? l.en;

const NAV: { path: string; icon: ReactNode; label: L3; badge?: "jobs" | "new" }[] = [
  { path: "/", icon: <FiHome />, label: { en: "Home", hi: "होम", mr: "मुख्य" } },
  { path: "/jobs", icon: <FiBriefcase />, label: { en: "Jobs", hi: "नौकरियां", mr: "नोकऱ्या" }, badge: "jobs" },
  { path: "/my-jobs", icon: <FiGrid />, label: { en: "My Jobs", hi: "मेरी नौकरियां", mr: "माझ्या नोकऱ्या" } },
  { path: "/worker-dashboard", icon: <FiMapPin />, label: { en: "Nearby Jobs", hi: "पास की नौकरियां", mr: "जवळच्या नोकऱ्या" } },
  { path: "/worker-profile", icon: <FiUser />, label: { en: "Worker Profile", hi: "वर्कर प्रोफ़ाइल", mr: "कामगार प्रोफाइल" } },
  { path: "/ai-suggestions", icon: <FiCpu />, label: { en: "AI Matcher", hi: "AI मैचर", mr: "AI मॅचर" }, badge: "new" },
];

const TXT = {
  portal: { en: "WORKER PORTAL", hi: "वर्कर पोर्टल", mr: "कामगार पोर्टल" } as L3,
  live: { en: "Live", hi: "लाइव", mr: "लाइव्ह" } as L3,
  searchPh: { en: "Search jobs by trade (e.g. Cook, Driver, Electrician)", hi: "काम खोजें (जैसे: कुक, ड्राइवर)", mr: "काम शोधा (उदा: कुक, ड्रायव्हर)" } as L3,
  mic: { en: "Mic", hi: "माइक", mr: "माइक" } as L3,
  micOn: { en: "Mic On", hi: "सुन रहा है", mr: "ऐकत आहे" } as L3,
  worker: { en: "Worker", hi: "कामगार", mr: "कामगार" } as L3,
  active: { en: "Active", hi: "सक्रिय", mr: "सक्रिय" } as L3,
  profile: { en: "Profile", hi: "प्रोफ़ाइल", mr: "प्रोफाइल" } as L3,
  complete: { en: "Complete", hi: "पूरा", mr: "पूर्ण" } as L3,
  profileDone: { en: "Ready to accept high-rate contracts and receive direct calls!", hi: "बेहतर काम और सीधे कॉल के लिए आप तैयार हैं!", mr: "चांगले काम आणि थेट कॉलसाठी तुम्ही तयार आहात!" } as L3,
  profileMore: { en: "Complete your profile to get better job matches.", hi: "बेहतर नौकरियां पाने के लिए प्रोफ़ाइल पूरी करें।", mr: "चांगल्या नोकऱ्यांसाठी प्रोफाइल पूर्ण करा." } as L3,
  payouts: { en: "VERIFIED PAYOUTS", hi: "सुरक्षित भुगतान", mr: "सुरक्षित पेमेंट" } as L3,
  payoutsDesc: { en: "Every gig on HireMate is protected by fair wage escrow guarantee.", hi: "HireMate पर हर काम उचित मजदूरी की गारंटी से सुरक्षित है।", mr: "HireMate वरील प्रत्येक काम योग्य मजुरीच्या हमीने सुरक्षित आहे." } as L3,
  help: { en: "Help Center", hi: "सहायता केंद्र", mr: "मदत केंद्र" } as L3,
  whatsapp: { en: "WhatsApp Support", hi: "WhatsApp सहायता", mr: "WhatsApp मदत" } as L3,
  logout: { en: "Logout", hi: "लॉगआउट", mr: "लॉगआउट" } as L3,
  newTag: { en: "NEW", hi: "नया", mr: "नवीन" } as L3,
};

interface WorkerShellProps {
  children: ReactNode;
  /** City shown in the "Live" pill. */
  city?: string;
  /** Called when the top search is submitted. */
  onSearch?: (query: string) => void;
  /** Called when the top Mic button is pressed. */
  onMic?: () => void;
  micOn?: boolean;
}

export default function WorkerShell({ children, city, onSearch, onMic, micOn }: WorkerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { worker, logout } = useAuth();
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    getJobs().then((jobs) => { if (alive && Array.isArray(jobs)) setJobCount(jobs.length); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleLogout = () => { logout(); router.push(ROLE_LOGIN.worker); };

  const firstName = worker?.name?.trim() || pick(TXT.worker, language);
  const initial = firstName.charAt(0).toUpperCase();

  // Profile completeness from the fields the worker actually has.
  const fields = [worker?.name, worker?.phone || worker?.contact, worker?.skills, worker?.location];
  const pct = Math.round((fields.filter((f) => !!f && String(f).trim()).length / fields.length) * 100);

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  const badgeFor = (b?: "jobs" | "new") => {
    if (b === "new") return <span className="ml-auto text-[10px] font-bold tracking-wide rounded-md px-2 py-0.5 bg-white/20 text-blue-100">{pick(TXT.newTag, language)}</span>;
    if (b === "jobs" && jobCount !== null) return <span className="ml-auto text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white/10 text-slate-300">{jobCount}</span>;
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] font-app">
      {/* ───── Top bar ───── */}
      <header className="sticky top-0 z-40 h-[60px] bg-[#0C1A33] border-b border-white/10 flex items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
          <span className="bg-blue-600 text-white font-extrabold text-[14px] rounded-lg w-8 h-8 flex items-center justify-center">HM</span>
          <span className="text-white text-[18px] font-extrabold">HireMate</span>
        </Link>
        <span className="hidden md:inline-block text-[10px] font-bold tracking-wider text-blue-200 border border-blue-300/30 bg-blue-400/10 rounded-md px-2.5 py-1.5 shrink-0">
          {pick(TXT.portal, language)}
        </span>
        <span className="hidden xl:flex items-center gap-1.5 text-[12px] font-medium text-slate-200 border border-white/10 bg-white/5 rounded-md px-2.5 py-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {(city?.trim() || "Nashik").split(",")[0]} {pick(TXT.live, language)}
        </span>

        {/* Search + mic */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (query.trim()) onSearch?.(query.trim()); }}
          className="hidden md:flex flex-1 max-w-[420px] items-center gap-2 h-9 rounded-lg border border-white/10 bg-white/5 px-3"
        >
          <FiSearch className="text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(TXT.searchPh, language)}
            className="flex-1 min-w-0 bg-transparent text-[12px] text-white placeholder:text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={onMic}
            className={`flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-1 cursor-pointer shrink-0 ${micOn ? "bg-red-500 text-white" : "bg-amber-400 text-slate-900"}`}
          >
            <FiMic /> {pick(micOn ? TXT.micOn : TXT.mic, language)}
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3">
          {/* Language */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-[11px] font-bold">
            {([["hi", "हिंदी"], ["mr", "मराठी"], ["en", "ENG"]] as [Language, string][]).map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${language === code ? "bg-blue-600 text-white" : "text-slate-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="relative text-slate-300 text-[18px] cursor-pointer hidden sm:block" aria-label="Notifications">
            <FiBell />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          {/* User */}
          <Link href="/worker-profile" className="flex items-center gap-2.5 no-underline">
            <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[14px] flex items-center justify-center">{initial}</span>
            <span className="hidden sm:block leading-tight">
              <span className="block text-[13px] font-bold text-white">{firstName}</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                {worker?.skills || pick(TXT.worker, language)} <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-semibold">{pick(TXT.active, language)}</span>
              </span>
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile / tablet nav (the sidebar is desktop-only) */}
      <nav className="lg:hidden flex gap-1.5 overflow-x-auto bg-[#0C1A33] px-3 pb-2.5 border-b border-white/10">
        {NAV.map((n) => (
          <Link
            key={n.path}
            href={n.path}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold no-underline ${isActive(n.path) ? "bg-blue-600 text-white" : "text-slate-300 bg-white/5"}`}
          >
            {n.icon} {pick(n.label, language)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-1">
        {/* ───── Sidebar ───── */}
        <aside className="hidden lg:flex flex-col w-[256px] shrink-0 bg-[#0C1A33] border-r border-slate-800/80 sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto">
          <nav className="flex flex-col gap-1.5 p-3 pt-5">
            {NAV.map((n) => (
              <Link
                key={n.path}
                href={n.path}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold no-underline ${isActive(n.path) ? "bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,.35)]" : "text-slate-300 hover:bg-white/5"}`}
              >
                <span className="text-[17px] shrink-0">{n.icon}</span>
                {pick(n.label, language)}
                {badgeFor(n.badge)}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-3 flex flex-col gap-2.5">
            <Link href="/worker-profile" className="block no-underline rounded-xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center justify-between text-[12px] font-bold text-emerald-400 mb-2">
                <span className="flex items-center gap-1.5"><FiCheckCircle /> {pick(TXT.profile, language)} {pct}% {pick(TXT.complete, language)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
              </div>
              <p className="m-0 text-[11px] text-slate-400 leading-snug">{pick(pct === 100 ? TXT.profileDone : TXT.profileMore, language)}</p>
            </Link>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-400 mb-1.5"><FiShield /> {pick(TXT.payouts, language)}</div>
              <p className="m-0 text-[11px] text-slate-300 leading-snug">{pick(TXT.payoutsDesc, language)}</p>
            </div>

            <div className="border-t border-white/10 pt-3 flex flex-col gap-1">
              {/* TODO: point these at real support destinations */}
              <a href="#" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-slate-400 no-underline"><FiHelpCircle /> {pick(TXT.help, language)}</a>
              <a href="#" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-slate-400 no-underline"><FaWhatsapp className="text-emerald-400" /> {pick(TXT.whatsapp, language)}</a>
              <button onClick={handleLogout} className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] text-slate-400 cursor-pointer text-left"><FiLogOut /> {pick(TXT.logout, language)}</button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}