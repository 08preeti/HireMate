import type { ReactNode } from "react";
import RequireRole from "@/components/layout/RequireRole";
import { EmployerDataProvider } from "@/context/EmployerDataContext";

// Everything under (employer) is for signed-in EMPLOYERS only.
export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="employer">
      <EmployerDataProvider>{children}</EmployerDataProvider>
    </RequireRole>
  );
}
