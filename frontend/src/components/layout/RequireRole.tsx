"use client";

import type { ReactNode } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import Loader from "@/components/ui/Loader";
import type { UserRole } from "@/types";

interface RequireRoleProps {
  role: UserRole;
  /** Public pages (e.g. job browsing) also let signed-out visitors in. */
  allowVisitors?: boolean;
  children: ReactNode;
}

/** Renders children only for the required role; everyone else is redirected (no content flash). */
export default function RequireRole({ role, allowVisitors = false, children }: RequireRoleProps) {
  const allowed = useRoleGuard(role, { allowVisitors });
  if (!allowed) return <Loader />;
  return <>{children}</>;
}
