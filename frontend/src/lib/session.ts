// The browser session: ONE record in localStorage => one user, one role, one token.
// Everything else (AuthContext, the API client) reads it through these helpers.
import type { Employer, Session, UserRole, Worker } from "@/types";

const SESSION_KEY = "hm.session";

// Keys used by the old two-session format. They are migrated once, then removed.
const LEGACY = {
  employerToken: "employerToken",
  employerId: "employerId",
  worker: "worker",
  workerId: "workerId",
  workerToken: "workerToken",
} as const;

const isBrowser = (): boolean => typeof window !== "undefined";

function removeLegacyKeys(): void {
  Object.values(LEGACY).forEach((key) => localStorage.removeItem(key));
}

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<Session>;
  return (v.role === "worker" || v.role === "employer") && typeof v.token === "string" && !!v.token && !!v.user;
}

/**
 * Old versions stored a worker session and an employer session side by side, which
 * is how both roles ended up "active". Keep an old session only when exactly ONE
 * role has a usable token; if both (or neither) exist, drop them and ask for a login.
 */
function migrateLegacySession(): Session | null {
  const employerToken = localStorage.getItem(LEGACY.employerToken);
  const employerId = localStorage.getItem(LEGACY.employerId);
  const workerToken = localStorage.getItem(LEGACY.workerToken);
  const workerRaw = localStorage.getItem(LEGACY.worker);

  let migrated: Session | null = null;
  if (employerToken && !workerToken) {
    const user: Employer = { _id: employerId || "" };
    migrated = { role: "employer", token: employerToken, user };
  } else if (workerToken && workerRaw && !employerToken) {
    try {
      const user = JSON.parse(workerRaw) as Worker | null;
      if (user) migrated = { role: "worker", token: workerToken, user };
    } catch {
      migrated = null;
    }
  }

  removeLegacyKeys();
  if (migrated) localStorage.setItem(SESSION_KEY, JSON.stringify(migrated));
  return migrated;
}

export function readSession(): Session | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return migrateLegacySession();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSession(parsed)) return parsed;
  } catch {
    // fall through: corrupted value
  }
  localStorage.removeItem(SESSION_KEY);
  return null;
}

/** Replaces any existing session, so two roles can never be signed in together. */
export function writeSession(session: Session): void {
  if (!isBrowser()) return;
  removeLegacyKeys();
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (!isBrowser()) return;
  removeLegacyKeys();
  localStorage.removeItem(SESSION_KEY);
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

export function getRole(): UserRole | null {
  return readSession()?.role ?? null;
}

/** Refresh the cached worker profile without touching the token. */
export function updateSessionWorker(worker: Worker): Session | null {
  const current = readSession();
  if (!current || current.role !== "worker") return current;
  const next: Session = { ...current, user: worker };
  writeSession(next);
  return next;
}

/** Subscribe to session changes made in OTHER tabs (the `storage` event). */
export function onSessionChange(callback: () => void): () => void {
  if (!isBrowser()) return () => undefined;
  const handler = (event: StorageEvent) => {
    if (event.key === SESSION_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
