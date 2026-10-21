"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import WorkerShell from "@/components/layout/WorkerShell";
import { useAuth } from "@/context/AuthContext";
import { isStandalonePath } from "@/config/routes";

// Full-screen worker pages that bring their own chrome.
const BARE_PATHS = ["/navigate", "/onboarding"];

// Signed-in workers get the sidebar + top bar; everyone else keeps the original header / bottom nav.
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role } = useAuth();

  const useWorkerShell =
    role === "worker" && !isStandalonePath(pathname) && !BARE_PATHS.some((p) => pathname.startsWith(p));

  if (useWorkerShell) return <WorkerShell>{children}</WorkerShell>;

  return (
    <>
      <Header />
      {children}
      <BottomNav />
    </>
  );
}