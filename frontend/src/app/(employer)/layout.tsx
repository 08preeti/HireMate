import type { ReactNode } from "react";
import RequireRole from "@/components/layout/RequireRole";

// Everything under (employer) is for signed-in EMPLOYERS only.
export default function EmployerLayout({ children }: { children: ReactNode }) {
  return <RequireRole role="employer">{children}</RequireRole>;
}
