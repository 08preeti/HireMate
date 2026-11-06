"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FiX } from "react-icons/fi";
import EmployerSidebar from "@/components/layout/EmployerSidebar";
import EmployerTopNav from "@/components/layout/EmployerTopNav";
import { useEmployerT } from "@/i18n/employerText";

interface EmployerShellProps {
  children: ReactNode;
  /** No longer used: the sidebar reads live counts from the shared employer data. Kept so existing callers still compile. */
  search?: string;
  onSearch?: (value: string) => void;
  applicationBadge?: number;
  hasUnread?: boolean;
}

const SidebarFallback = () => <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-hidden />;

export default function EmployerShell({ children, hasUnread }: EmployerShellProps) {
  const pathname = usePathname();
  const { tr } = useEmployerT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FC] font-app">
      <EmployerTopNav hasUnread={hasUnread} onMenuClick={() => setDrawerOpen(true)} menuOpen={drawerOpen} />

      <div className="flex flex-1">
        <aside className="hidden lg:block w-[230px] shrink-0 bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto p-3 pt-5">
          <Suspense fallback={<SidebarFallback />}>
            <EmployerSidebar />
          </Suspense>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <div className={`lg:hidden fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={tr("nav_main")}
          className={`absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl p-3 overflow-y-auto transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-1.5 pb-3 mb-1 border-b border-slate-100">
            <span className="flex items-center gap-2 text-[17px] font-extrabold text-slate-900">
              <span className="bg-red-600 text-white text-[12px] rounded-lg w-8 h-8 flex items-center justify-center">HM</span>
              HireMate
            </span>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label={tr("nav_close")}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <FiX size={20} />
            </button>
          </div>
          {drawerOpen && (
            <Suspense fallback={<SidebarFallback />}>
              <EmployerSidebar onNavigate={closeDrawer} />
            </Suspense>
          )}
        </aside>
      </div>
    </div>
  );
}
