import type { ReactNode } from "react";
import RequireRole from "@/components/layout/RequireRole";

// Everything under (worker) is for signed-in WORKERS only.
export default function WorkerLayout({ children }: { children: ReactNode }) {
  return <RequireRole role="worker">{children}</RequireRole>;
}
