"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME, ROLE_LOGIN } from "@/config/routes";
import type { UserRole } from "@/types";

interface GuardOptions {
  /** Let signed-out visitors through (public browsing). The wrong ROLE is still sent away. */
  allowVisitors?: boolean;
}

/**
 * Client-side route guard. Returns true only when it is safe to render:
 *  - visitor            → login page of the required role (unless allowVisitors)
 *  - the OTHER role     → that role's own dashboard (never the page, never the data)
 *  - the required role  → allowed
 * The backend enforces the same rule on every API call; this only decides what to show.
 */
export function useRoleGuard(required: UserRole, { allowVisitors = false }: GuardOptions = {}): boolean {
  const { loading, role } = useAuth();
  const router = useRouter();

  const allowed = !loading && (role === required || (allowVisitors && role === null));

  useEffect(() => {
    if (loading || allowed) return;
    if (role === null) router.replace(ROLE_LOGIN[required]);
    else router.replace(ROLE_HOME[role]);
  }, [loading, allowed, role, required, router]);

  return allowed;
}

/** For sign-in / sign-up pages: an already signed-in user is sent to their own dashboard. */
export function useGuestGuard(): boolean {
  const { loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role) router.replace(ROLE_HOME[role]);
  }, [loading, role, router]);

  return !loading && role === null;
}
