"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiFileText, FiHome, FiUsers } from "react-icons/fi";
import EmployerTopNav from "@/components/layout/EmployerTopNav";
import { useLanguage } from "@/context/LanguageContext";

interface EmployerShellProps {
  children: ReactNode;
  /** No longer shown in the header (kept so existing callers still compile). */
  search?: string;
  onSearch?: (value: string) => void;
  /** Red count on the Applications link. */
  applicationBadge?: number;
  /** Shows the red dot on the bell. */
  hasUnread?: boolean;
}

const NAV = [
  { href: "/employer-dashboard", icon: <FiHome />, label: ["Dashboard", "डैशबोर्ड", "डॅशबोर्ड"] },
  { href: "/employer-dashboard#workers", icon: <FiUsers />, label: ["Workers", "कामगार", "कामगार"] },
  { href: "/applications", icon: <FiFileText />, label: ["Applications", "आवेदन", "अर्ज"], badge: true },
];

export default function EmployerShell({ children, applicationBadge = 0, hasUnread }: EmployerShellProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const labelOf = (label: string[]) => (language === "hi" ? label[1] : language === "mr" ? label[2] : label[0]);

  const active = (href: string) => (href === "/employer-dashboard" ? pathname === href : href.startsWith("/applications") && pathname.startsWith("/applications"));

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FC] font-app">
      <EmployerTopNav hasUnread={hasUnread} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:block w-[220px] shrink-0 bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-64px)] p-3 pt-5">
          <nav className="flex flex-col gap-1.5">
            {NAV.map((n) => (
              <Link
                key={n.label[0]}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold no-underline ${active(n.href) ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span className="text-[18px] shrink-0">{n.icon}</span>
                {labelOf(n.label)}
                {n.badge && applicationBadge > 0 && (
                  <span className="ml-auto text-[10px] font-bold rounded-full bg-red-500 text-white px-1.5 py-0.5 min-w-[20px] text-center">{applicationBadge}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}