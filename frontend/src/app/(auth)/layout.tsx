import type { ReactNode } from "react";
import GuestOnly from "@/components/layout/GuestOnly";

// Sign-in / sign-up screens: signed-in users are redirected to their own dashboard.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <GuestOnly>{children}</GuestOnly>;
}
