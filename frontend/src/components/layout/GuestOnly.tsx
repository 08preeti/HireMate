"use client";

import type { ReactNode } from "react";
import { useGuestGuard } from "@/hooks/useRoleGuard";
import Loader from "@/components/ui/Loader";

/** Sign-in / sign-up pages: signed-in users go straight to their own dashboard. */
export default function GuestOnly({ children }: { children: ReactNode }) {
  const isGuest = useGuestGuard();
  if (!isGuest) return <Loader />;
  return <>{children}</>;
}
