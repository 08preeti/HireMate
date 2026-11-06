"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheck, FiChevronDown, FiGlobe, FiLogOut, FiMenu } from "react-icons/fi";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { useEmployerData } from "@/context/EmployerDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_LOGIN } from "@/config/routes";
import type { Language } from "@/types";

const LANGUAGES: { code: Language; short: string; label: string }[] = [
  { code: "en", short: "EN", label: "English" },
  { code: "hi", short: "हिं", label: "हिंदी" },
  { code: "mr", short: "मरा", label: "मराठी" },
];

interface EmployerTopNavProps {
  /** Unused: the bell now shows the real unread count. Kept so existing callers compile. */
  hasUnread?: boolean;
  /** Shows the hamburger button (below the desktop breakpoint) that opens the sidebar drawer. */
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

/** The one header used on every employer page (Dashboard, Post a Job, Applications). */
export default function EmployerTopNav({ onMenuClick, menuOpen }: EmployerTopNavProps) {
  const router = useRouter();
  const { setUnreadNotifications } = useEmployerData();
  const { employer, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [menu, setMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close either dropdown when clicking anywhere else.
  useEffect(() => {
    if (!menu && !langMenu) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenu(false);
      if (langRef.current && !langRef.current.contains(target)) setLangMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu, langMenu]);

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const company = employer?.companyName?.trim() || L("Employer", "नियोक्ता", "नियोक्ता");
  const initials = company.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "E";
  const handleLogout = () => {
    logout();
    router.push(ROLE_LOGIN.employer);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1228] text-white border-b border-white/10">
      <div className="h-16 px-4 lg:px-8 flex items-center gap-3 lg:gap-6">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={L("Open menu", "मेनू खोलें", "मेनू उघडा")}
            aria-expanded={menuOpen}
            className="lg:hidden -ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[20px] text-white hover:bg-white/10"
          >
            <FiMenu />
          </button>
        )}

        {/* Brand */}
        <Link href="/employer-dashboard" className="flex items-center gap-2.5 no-underline shrink-0">
          <span className="bg-red-600 text-white font-extrabold text-[13px] rounded-lg w-9 h-9 flex items-center justify-center">HM</span>
          <span className="text-[20px] font-extrabold text-white leading-none tracking-tight">HireMate</span>
        </Link>

        <div className="flex-1" />

        {/* Language */}
        <div ref={langRef} className="relative shrink-0">
          <button
            onClick={() => { setLangMenu((v) => !v); setMenu(false); }}
            className="flex items-center gap-1.5 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 text-[13px] font-semibold text-slate-100 cursor-pointer"
            aria-haspopup="menu"
            aria-expanded={langMenu}
            aria-label={L("Change language", "भाषा बदलें", "भाषा बदला")}
          >
            <FiGlobe className="text-[15px]" /> {currentLang.short} <FiChevronDown className="text-slate-400" />
          </button>
          {langMenu && (
            <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-40 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,.25)] p-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  role="menuitemradio"
                  aria-checked={language === l.code}
                  onClick={() => { setLanguage(l.code); setLangMenu(false); }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-[13.5px] font-semibold cursor-pointer ${language === l.code ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  {l.label}
                  {language === l.code && <FiCheck />}
                </button>
              ))}
            </div>
          )}
        </div>

        <NotificationBell role="employer" onUnreadChange={setUnreadNotifications} />

        {/* Account */}
        <div ref={menuRef} className="relative shrink-0 sm:border-l sm:border-white/10 sm:pl-4">
          <button onClick={() => { setMenu((v) => !v); setLangMenu(false); }} className="flex items-center gap-2.5 cursor-pointer" aria-haspopup="menu" aria-expanded={menu}>
            <span className="w-9 h-9 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center">{initials}</span>
            <span className="hidden md:block text-left leading-tight">
              <span className="block text-[13px] font-bold max-w-[150px] truncate">{company}</span>
              <span className="block text-[11px] text-slate-400 max-w-[150px] truncate">{employer?.email || L("Employer account", "नियोक्ता खाता", "नियोक्ता खाते")}</span>
            </span>
            <FiChevronDown className="hidden md:block text-slate-400" />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-52 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,.25)] p-1.5">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="text-[13px] font-bold truncate">{company}</div>
                <div className="text-[11.5px] text-slate-500 truncate">{employer?.email || L("Employer account", "नियोक्ता खाता", "नियोक्ता खाते")}</div>
              </div>
              <button onClick={handleLogout} role="menuitem" className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <FiLogOut /> {L("Logout", "लॉगआउट", "लॉगआउट")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}