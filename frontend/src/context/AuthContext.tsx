"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearSession, onSessionChange, readSession, updateSessionWorker, writeSession } from "@/lib/session";
import { setUnauthorizedHandler } from "@/services/api";
import { fetchVerifiedSession } from "@/services/auth";
import type { AuthStatus, Employer, Session, User, UserRole, Worker } from "@/types";

interface AuthContextValue {
  /** `loading` until the browser session has been read (prevents wrong-screen flashes). */
  status: AuthStatus;
  loading: boolean;
  authenticated: boolean;
  /** The ONE active role, or null for visitors. */
  role: UserRole | null;
  user: User | null;
  token: string | null;
  /** Typed shortcuts: non-null only when the current role matches. */
  worker: Worker | null;
  employer: Employer | null;
  /** Store a freshly authenticated session (replaces any previous one). */
  login: (session: Session) => void;
  logout: () => void;
  /** Re-read the stored session (e.g. after another tab changed it). */
  refresh: () => void;
  /** Update the cached worker profile after an edit. */
  setWorker: (worker: Worker) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // The role kept in localStorage is only a cache. Ask the server who the token belongs to: if the
  // stored role/user was edited or is out of date, the server's answer replaces it. A 401 signs the
  // user out (API client); other failures (offline, sleeping backend) keep the cached session.
  const verifyStored = useCallback((stored: Session) => {
    fetchVerifiedSession(stored.token)
      .then((verified) => {
        const current = readSession();
        if (!current || current.token !== stored.token) return; // signed out or replaced meanwhile
        if (current.role === verified.role && current.user._id === verified.user._id) return;
        writeSession(verified);
        setSession(verified);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    const stored = readSession();
    setSession(stored);
    setLoading(false);
    if (stored) verifyStored(stored);
  }, [verifyStored]);

  // Read the session after mount (localStorage is browser-only) and follow changes from other tabs.
  useEffect(() => {
    refresh();
    return onSessionChange(refresh);
  }, [refresh]);

  const login = useCallback((next: Session) => {
    writeSession(next);
    setSession(next);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const setWorker = useCallback((worker: Worker) => {
    setSession(updateSessionWorker(worker));
  }, []);

  // An expired/invalid token on a protected request signs the user out in one place.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: loading ? "loading" : session ? "authenticated" : "unauthenticated",
      loading,
      authenticated: !!session,
      role: session?.role ?? null,
      user: session?.user ?? null,
      token: session?.token ?? null,
      worker: session?.role === "worker" ? session.user : null,
      employer: session?.role === "employer" ? session.user : null,
      login,
      logout,
      refresh,
      setWorker,
    }),
    [session, loading, login, logout, refresh, setWorker]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
