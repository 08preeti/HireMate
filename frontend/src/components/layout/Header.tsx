"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_SELECT, isStandalonePath } from "@/config/routes";
import { translations } from "@/i18n/translations";
import type { Language } from "@/types";
import { SHELL_PATHS } from "@/config/routes";

const NAV_ACTIVE = "bg-amber-400 text-black rounded-md py-1 px-2.5 font-bold text-[14px] no-underline";
const NAV_IDLE = "text-white py-1 px-1.5 text-[14px] no-underline";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  // ONE active role (or none) comes from AuthContext; the nav below shows only that role's links.
  const { role, loading, logout } = useAuth();

  const navClass = (path: string): string => (pathname === path ? NAV_ACTIVE : NAV_IDLE);

  const handleLogout = () => {
    if (!role) return;
    logout();
    router.push(ROLE_SELECT);
  };

  // Role selection and sign-in/sign-up screens are standalone: no header there.
  if (isStandalonePath(pathname)) return null;

  const L = (en: string, hi: string, mr: string): string => (language === "hi" ? hi : language === "mr" ? mr : en);

  if (SHELL_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="bg-brand py-3 px-5 flex items-center justify-between flex-wrap gap-2.5 font-plain">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <div className="bg-white text-brand font-extrabold py-1 px-2 rounded-md text-[14px]">HM</div>
        <span className="text-white text-[20px] font-extrabold">HireMate</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link className={navClass("/")} href="/">{t.home}</Link>

        {/* Jobs: visitors and workers only (employers manage jobs from their dashboard) */}
        {role !== "employer" && <Link className={navClass("/jobs")} href="/jobs">{t.jobs}</Link>}

        {/* Worker links */}
        {role === "worker" && (
          <>
            <Link className={navClass("/worker-dashboard")} href="/worker-dashboard">{t.workerDashboard}</Link>
            <Link className={navClass("/worker-profile")} href="/worker-profile">{t.workerProfile}</Link>
            <Link className={navClass("/ai-suggestions")} href="/ai-suggestions">🤖 AI</Link>
          </>
        )}

        {/* Employer links */}
        {role === "employer" && (
          <>
            <Link className={navClass("/applications")} href="/applications">{t.applications}</Link>
            <Link className={navClass("/employer-dashboard")} href="/employer-dashboard">{t.dashboard}</Link>
          </>
        )}

        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="py-1 px-2 rounded-md text-[13px] cursor-pointer"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>

        {/* Sign-in area: nothing until the session has been read (no flashing of the wrong buttons) */}
        {!loading && role === "worker" && (
          <button
            onClick={handleLogout}
            className="bg-amber-500 text-black rounded-md py-[5px] px-3 font-bold text-[13px] cursor-pointer"
          >
            👷 {L("Worker Logout", "लॉगआउट", "लॉगआउट")}
          </button>
        )}

        {!loading && role === "employer" && (
          <button
            onClick={handleLogout}
            className="bg-danger text-white rounded-md py-[5px] px-3 font-bold text-[13px] cursor-pointer"
          >
            {t.logout}
          </button>
        )}

        {!loading && role === null && (
          <>
            <Link
              href="/worker-login"
              className="bg-amber-400 text-black rounded-md py-[5px] px-3 font-bold text-[13px] no-underline"
            >
              👷 {L("Worker Login", "कामगार लॉगिन", "कामगार लॉगिन")}
            </Link>
            <div className="flex items-center space-x-2">
              <Link
                href="/employer-register"
                className="bg-transparent border-[1.5px] border-white text-white rounded-md py-1 px-2.5 font-semibold text-[12px] no-underline"
              >
                {L("Register", "रजिस्टर", "नोंदणी")}
              </Link>
              <Link
                href="/employer-login"
                className="bg-danger text-white rounded-md py-[5px] px-3 font-bold text-[13px] no-underline"
              >
                {L("Employer Login", "नियोक्ता लॉगिन", "नियोक्ता लॉगिन")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}