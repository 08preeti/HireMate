import type { UserRole } from "@/types";

// Where each role signs in, and where it lands after signing in.
export const ROLE_LOGIN: Record<UserRole, string> = {
  worker: "/worker-login",
  employer: "/employer-login",
};

export const ROLE_HOME: Record<UserRole, string> = {
  worker: "/worker-dashboard",
  employer: "/employer-dashboard",
};
