"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import {
  FiBell, FiBriefcase, FiCheckCircle, FiChevronDown, FiClock, FiFileText, FiGift, FiGlobe, FiHelpCircle, FiHome, FiLogOut, FiMenu, FiPlayCircle, FiSearch, FiSettings, FiShield, FiUser, FiX,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useFocusRecord } from "@/hooks/useFocusRecord";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_SELECT } from "@/config/routes";
import { groupOf } from "@/lib/workerApplications";
import { profileCompletion } from "@/lib/profileCompletion";
import { getMyJobs } from "@/services/workers";
import type { Language } from "@/types";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

type BadgeKey = "applications" | "offers" | "active" | "notifications";

interface NavItem {
  path: string;
  icon: IconType;
  en: string;
  hi: string;
  mr: string;
  badge?: BadgeKey;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/worker-dashboard",     icon: FiHome,       en: "Dashboard",        hi: "डैशबोर्ड",        mr: "डॅशबोर्ड" },
  { path: "/jobs",                 icon: FiBriefcase,  en: "Find Jobs",        hi: "नौकरियां खोजें",   mr: "नोकऱ्या शोधा" },
  { path: "/my-applications",      icon: FiFileText,   en: "My Applications",  hi: "मेरे आवेदन",       mr: "माझे अर्ज",          badge: "applications" },
  { path: "/job-offers",           icon: FiGift,       en: "Job Offers",       hi: "जॉब ऑफर",         mr: "जॉब ऑफर",           badge: "offers" },
  { path: "/active-work",          icon: FiPlayCircle, en: "Active Work",      hi: "सक्रिय काम",       mr: "सक्रिय कामे",        badge: "active" },
  { path: "/work-history",         icon: FiClock,      en: "Work History",     hi: "कार्य इतिहास",     mr: "कामाचा इतिहास" },
  { path: "/worker-notifications", icon: FiBell,       en: "Notifications",    hi: "सूचनाएं",          mr: "सूचना",             badge: "notifications" },
  { path: "/worker-profile",       icon: FiUser,       en: "My Profile",       hi: "मेरी प्रोफ़ाइल",    mr: "माझी प्रोफाइल" },
  { path: "/worker-settings",      icon: FiSettings,   en: "Settings",         hi: "सेटिंग्स",         mr: "सेटिंग्ज" },
  { path: "/worker-help",          icon: FiHelpCircle, en: "Help & Support",   hi: "सहायता",           mr: "मदत व सहाय्य" },
];

const TAB_PATHS = ["/worker-dashboard", "/jobs", "/my-applications", "/worker-notifications"];

export default function WorkerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useFocusRecord();
  const router = useRouter();
  const { worker, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [query, setQuery] = useState("");
  const [counts, setCounts] = useState<Record<BadgeKey, number>>({ applications: 0, offers: 0, active: 0, notifications: 0 });

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);
  const phone = worker?.phone;

  // Badge counts come from the same applications API the pages use. Failures leave the badges hidden.
  useEffect(() => {
    if (!phone) return;
    getMyJobs(phone)
      .then((apps) => {
        const groups = apps.map(groupOf);
        setCounts((c) => ({
          ...c,
          applications: groups.filter((g) => g === "pending").length,
          offers: groups.filter((g) => g === "offers").length,
          active: groups.filter((g) => g === "confirmed").length,
        }));
      })
      .catch(() => {});
  }, [phone, pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/jobs?q=${encodeURIComponent(query.trim())}` : "/jobs");
  };

  const { percent: profilePct } = profileCompletion(worker);
  const profileDone = profilePct === 100;

  const label = (i: NavItem) => (language === "hi" ? i.hi : language === "mr" ? i.mr : i.en);
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const initial = (worker?.name || "W").trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    setConfirmLogout(false);
    logout();
    router.push(ROLE_SELECT);
  };

  const renderBadge = (item: NavItem, active: boolean) => {
    const n = item.badge ? counts[item.badge] : 0;
    if (!n) return null;
    const urgent = item.badge === "offers" || item.badge === "notifications";
    return (
      <span className={`ml-auto min-w-[24px] rounded-full px-2 py-0.5 text-center text-[12px] font-semibold ${urgent ? "bg-[#ff4757] text-white" : active ? "bg-[#0d3fa8] text-white" : "bg-white/10 text-[#e4ecfb]"}`}>
        {n > 99 ? "99+" : n}
      </span>
    );
  };

  const navList = (
    <ul className="m-0 list-none space-y-1 p-0">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <li key={item.path}>
            <Link
              href={item.path}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[15px] no-underline transition ${active ? "bg-[#1f6bff] font-semibold text-white" : "text-[#d6e1f7] hover:bg-white/10"}`}
            >
              <Icon size={19} aria-hidden="true" />
              {label(item)}
              {renderBadge(item, active)}
            </Link>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={() => setConfirmLogout(true)} className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-4 py-2.5 text-left text-[15px] text-[#d6e1f7] hover:bg-white/10">
          <FiLogOut size={19} aria-hidden="true" /> {L("Logout", "लॉगआउट", "लॉगआउट")}
        </button>
      </li>
    </ul>
  );

  const profileCard = (
    <Link href="/worker-profile" className={`mt-5 block rounded-xl border p-4 no-underline ${profileDone ? "border-[#1f7a55] bg-[#0c3340]" : "border-[#3d5fa8] bg-white/5"}`}>
      <div className={`flex items-center gap-2 text-[14px] font-semibold ${profileDone ? "text-[#34d399]" : "text-white"}`}>
        {profileDone ? <FiCheckCircle size={16} aria-hidden="true" /> : <FiUser size={16} aria-hidden="true" />}
        {profileDone ? L("Profile Complete", "प्रोफ़ाइल पूरी", "प्रोफाइल पूर्ण") : `${L("Profile", "प्रोफ़ाइल", "प्रोफाइल")} ${profilePct}%`}
      </div>
      {!profileDone && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#22c5f0]" style={{ width: `${profilePct}%` }} />
        </div>
      )}
      <div className="mt-1.5 text-[12.5px] leading-snug text-[#d6e1f7]">
        {profileDone ? L("Ready to get better job matches!", "बेहतर नौकरी मैच के लिए तैयार!", "चांगल्या नोकरी जुळवणीसाठी तयार!") : L("Complete your profile to get better job matches.", "बेहतर नौकरी के लिए प्रोफ़ाइल पूरी करें।", "चांगल्या नोकऱ्यांसाठी प्रोफाइल पूर्ण करा.")}
      </div>
    </Link>
  );

  const tabs = TAB_PATHS.map((p) => NAV_ITEMS.find((i) => i.path === p)!);

  return (
    <div className={`${inter.className} min-h-screen bg-[#f6f8fc] text-[#0b1b3d]`}>
      <header className="sticky top-0 z-[900] flex h-[68px] items-center justify-between border-b border-white/10 bg-[#0b1f47] px-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label={L("Open menu", "मेनू खोलें", "मेनू उघडा")} aria-expanded={drawerOpen} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden">
            <FiMenu size={22} aria-hidden="true" />
          </button>
          <Link href="/worker-dashboard" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#1f6bff] text-[14px] font-extrabold tracking-tight text-white">HM</span>
            <span className="hidden text-[22px] font-bold tracking-tight text-white min-[420px]:inline">HireMate</span>
          </Link>
          <span className="ml-1 hidden rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#d6e1f7] xl:inline">
            {L("Worker Portal", "कामगार पोर्टल", "कामगार पोर्टल")}
          </span>
        </div>

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
          </label>
        </form>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <label className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[14px]">
            <FiGlobe size={16} aria-hidden="true" />
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} aria-label="Language" className="cursor-pointer appearance-none bg-transparent pr-5 text-[14px] text-white outline-none">
              <option value="en" className="text-black">English</option>
              <option value="hi" className="text-black">हिंदी</option>
              <option value="mr" className="text-black">मराठी</option>
            </select>
            <FiChevronDown size={14} className="pointer-events-none absolute right-2.5" aria-hidden="true" />
          </label>

          <NotificationBell role="worker" onUnreadChange={(n) => setCounts((c) => (c.notifications === n ? c : { ...c, notifications: n }))} />

          <span className="hidden h-8 w-px bg-white/15 sm:block" />

          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-white/10" aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#fbbf24] text-[16px] font-bold text-[#3b2a00]">
                {initial}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0b1f47] bg-[#22c55e]" />
              </span>
              <span className="hidden max-w-[170px] text-left leading-tight sm:block">
                <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
                  {worker?.name}
                  <FiChevronDown size={14} aria-hidden="true" />
                </span>
                <span className="block truncate text-[12px] font-medium text-[#4be08f]">{worker?.skills ? `${worker.skills} • ` : ""}{L("Verified Active", "सत्यापित सक्रिय", "सत्यापित सक्रिय")}</span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[950]" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 z-[960] mt-2 w-52 overflow-hidden rounded-xl border border-[#e6ecf5] bg-white py-1 text-[#0b1b3d] shadow-[0_12px_32px_rgba(20,50,110,0.18)]">
                  <Link href="/worker-profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-[#0b1b3d] no-underline hover:bg-[#f2f7ff]">
                    <FiUser size={16} /> {L("My Profile", "मेरी प्रोफ़ाइल", "माझी प्रोफाइल")}
                  </Link>
                  <Link href="/worker-settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-[#0b1b3d] no-underline hover:bg-[#f2f7ff]">
                    <FiSettings size={16} /> {L("Settings", "सेटिंग्स", "सेटिंग्ज")}
                  </Link>
                  <button onClick={() => { setMenuOpen(false); setConfirmLogout(true); }} className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-[#d6203a] hover:bg-red-50">
                    <FiLogOut size={16} /> {L("Logout", "लॉगआउट", "लॉगआउट")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="lg:flex">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <nav aria-label={L("Worker navigation", "कामगार नेविगेशन", "कामगार नेव्हिगेशन")} className="sticky top-[68px] flex h-[calc(100vh-68px)] flex-col overflow-y-auto bg-[#0b1f47] px-4 py-5 text-white">
            {navList}
            {profileCard}
            <div className="mt-auto pt-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
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

        <main className="min-w-0 flex-1 pb-28 lg:pb-12">{children}</main>
      </div>

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

      {drawerOpen && (
        <div className="fixed inset-0 z-[1100] lg:hidden" role="dialog" aria-modal="true" aria-label={L("Menu", "मेनू", "मेनू")}>
          <div className="absolute inset-0 bg-[rgba(6,16,40,0.6)]" onClick={() => setDrawerOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-[290px] max-w-[85vw] flex-col overflow-y-auto bg-[#0b1f47] px-4 py-5 text-white shadow-[8px_0_30px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[18px] font-bold">HireMate</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={L("Close menu", "मेनू बंद करें", "मेनू बंद करा")} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-white/10">
                <FiX size={20} aria-hidden="true" />
              </button>
            </div>
            {navList}
            {profileCard}
          </nav>
        </div>
      )}

      <nav aria-label={L("Quick navigation", "त्वरित नेविगेशन", "जलद नेव्हिगेशन")} className="fixed inset-x-0 bottom-0 z-[900] flex border-t border-[#e6ecf5] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(20,50,110,0.08)] lg:hidden">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          const n = tab.badge ? counts[tab.badge] : 0;
          return (
            <Link key={tab.path} href={tab.path} aria-current={active ? "page" : undefined} className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 no-underline ${active ? "text-[#1f6bff]" : "text-[#7d889e]"}`}>
              <span className="relative">
                <Icon size={21} aria-hidden="true" />
                {n > 0 && <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-[#ff4757] px-1 text-center text-[10px] font-bold leading-4 text-white">{n > 99 ? "99+" : n}</span>}
              </span>
              <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{label(tab)}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawerOpen(true)} className="flex flex-1 cursor-pointer flex-col items-center gap-1 pb-2 pt-2.5 text-[#7d889e]">
          <FiMenu size={21} aria-hidden="true" />
          <span className="text-[11px]">{L("More", "और", "आणखी")}</span>
        </button>
      </nav>

      <ConfirmDialog
        open={confirmLogout}
        danger
        title={L("Log out?", "लॉगआउट करें?", "लॉगआउट करायचे?")}
        message={L("Do you want to sign out of HireMate?", "क्या आप हायरमेट से साइन आउट करना चाहते हैं?", "तुम्हाला हायरमेटमधून साइन आउट करायचे आहे का?")}
        confirmLabel={L("Logout", "लॉगआउट", "लॉगआउट")}
        cancelLabel={L("Cancel", "रद्द करें", "रद्द करा")}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
