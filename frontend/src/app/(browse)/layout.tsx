import type { ReactNode } from "react";
import RequireRole from "@/components/layout/RequireRole";

// Job browsing: signed-out visitors ("Browse jobs without login") and workers. Employers are sent to their dashboard.
export default function BrowseLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="worker" allowVisitors>
      {children}
    </RequireRole>
  );
}
