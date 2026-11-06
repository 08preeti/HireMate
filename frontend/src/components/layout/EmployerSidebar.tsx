"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FiActivity,
  FiBell,
  FiBriefcase,
  FiCheckCircle,
  FiFileText,
  FiHome,
  FiPlusCircle,
  FiSearch,
  FiSettings,
  FiUserCheck,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { useEmployerData } from "@/context/EmployerDataContext";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { parseTab, type TabKey } from "@/features/employer/applications/helpers";

type BadgeKey = "pending" | "active" | "notifications";

interface NavItem {
  href: string;
  icon: IconType;
  label: EmployerKey;
  badge?: BadgeKey;
  isActive: (pathname: string, tab: TabKey) => boolean;
}

const onPath = (path: string) => (pathname: string) => pathname === path || pathname.startsWith(`${path}/`);
const onApplications = (tabs: readonly TabKey[]) => (pathname: string, tab: TabKey) =>
  pathname === "/applications" && tabs.includes(tab);

const GROUPS: NavItem[][] = [
  [
    { href: "/employer-dashboard", icon: FiHome, label: "nav_dashboard", isActive: (p) => p === "/employer-dashboard" },
    { href: "/employer-jobs", icon: FiBriefcase, label: "nav_myJobs", isActive: onPath("/employer-jobs") },
    { href: "/post-job", icon: FiPlusCircle, label: "nav_postJob", isActive: onPath("/post-job") },
  ],
  [
    {
      href: "/applications",
      icon: FiFileText,
      label: "nav_applications",
      badge: "pending",
      isActive: onApplications(["all", "new", "review", "declined"]),
    },
    { href: "/applications?tab=offers", icon: FiUserCheck, label: "nav_accepted", isActive: onApplications(["offers", "confirmed"]) },
    { href: "/employer-active-work", icon: FiActivity, label: "nav_active", badge: "active", isActive: onPath("/employer-active-work") },
    { href: "/employer-completed-work", icon: FiCheckCircle, label: "nav_completed", isActive: onPath("/employer-completed-work") },
  ],
  [
    { href: "/workers", icon: FiSearch, label: "nav_findWorkers", isActive: onPath("/workers") },
    { href: "/employer-notifications", icon: FiBell, label: "nav_notifications", badge: "notifications", isActive: onPath("/employer-notifications") },
    { href: "/employer-profile", icon: FiSettings, label: "nav_profile", isActive: onPath("/employer-profile") },
  ],
];

interface EmployerSidebarProps {
  onNavigate?: () => void;
}

export default function EmployerSidebar({ onNavigate }: EmployerSidebarProps) {
  const pathname = usePathname();
  const tab = parseTab(useSearchParams().get("tab"));
  const { tr } = useEmployerT();
  const { pendingCount, stageCounts, unreadNotifications } = useEmployerData();

  const badges: Record<BadgeKey, { count: number; tone: string }> = {
    pending: { count: pendingCount, tone: "bg-red-500" },
    active: { count: stageCounts.active + stageCounts.confirmed, tone: "bg-violet-500" },
    notifications: { count: unreadNotifications, tone: "bg-red-500" },
  };

  return (
    <nav aria-label={tr("nav_main")} className="flex flex-col gap-3">
      {GROUPS.map((group, i) => (
        <div key={i} className={`flex flex-col gap-1 ${i > 0 ? "border-t border-slate-100 pt-3" : ""}`}>
          {group.map((item) => {
            const active = item.isActive(pathname, tab);
            const badge = item.badge ? badges[item.badge] : null;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold no-underline ${active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="text-[18px] shrink-0" />
                <span className="truncate">{tr(item.label)}</span>
                {badge && badge.count > 0 && (
                  <span className={`ml-auto text-[10px] font-bold rounded-full ${badge.tone} text-white px-1.5 py-0.5 min-w-[20px] text-center`}>
                    {badge.count > 99 ? "99+" : badge.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
