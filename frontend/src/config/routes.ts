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

// The standalone role-selection screen (visitors only). Logout returns here.
export const ROLE_SELECT = "/";

// Standalone screens: role selection + every sign-in / sign-up screen. No header, nav or install prompt.
export const STANDALONE_PATHS: readonly string[] = [
  ROLE_SELECT,
  "/worker-login",
  "/worker-register",
  "/employer-login",
  "/employer-register",
];
export const isStandalonePath = (pathname: string): boolean =>
  STANDALONE_PATHS.includes(pathname);
// Routes where the worker app shell is displayed.
export const SHELL_PATHS: readonly string[] = ["/worker-dashboard"];
