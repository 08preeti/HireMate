"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { getViewedIds, markApplicationViewed } from "@/lib/seenApplications";
import { getEmployerApplications } from "@/services/applications";
import { STAGES, isPending, stageOf, type Stage } from "@/features/employer/applications/helpers";
import type { Application } from "@/types";

interface RefreshOptions {
  /** Skip the request when the data is newer than this many milliseconds. */
  maxAgeMs?: number;
  /** Fetch again even if a request is already running (used after a change, so the result is never older than the change). */
  force?: boolean;
}

interface EmployerDataValue {
  applications: Application[];
  loading: boolean;
  error: boolean;
  refresh: (options?: RefreshOptions) => Promise<void>;
  viewedIds: ReadonlySet<string>;
  markViewed: (id: string) => void;
  stageCounts: Record<Stage, number>;
  pendingCount: number;
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
}

const EmployerDataContext = createContext<EmployerDataValue | null>(null);

const BACKGROUND_REFRESH_MS = 30_000;

/** One shared copy of the employer's applications, so the sidebar badges and the Applications page never fetch twice. */
export function EmployerDataProvider({ children }: { children: ReactNode }) {
  const { employer } = useAuth();
  const employerId = employer?._id;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewed, setViewed] = useState<ReadonlySet<string>>(() => new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const inFlight = useRef<Promise<void> | null>(null);
  const lastLoaded = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setViewed(new Set(getViewedIds(employerId)));
  }, [employerId]);

  const refresh = useCallback(({ maxAgeMs, force }: RefreshOptions = {}) => {
    if (inFlight.current && !force) return inFlight.current;
    if (!force && maxAgeMs && Date.now() - lastLoaded.current < maxAgeMs) return Promise.resolve();
    const start = () => {
      const request = getEmployerApplications()
        .then((data) => {
          if (!mounted.current) return;
          setApplications(data.applications || []);
          setError(false);
          lastLoaded.current = Date.now();
        })
        .catch((err: unknown) => {
          console.error(err);
          if (mounted.current) setError(true);
        })
        .finally(() => {
          inFlight.current = null;
          if (mounted.current) setLoading(false);
        });
      inFlight.current = request;
      return request;
    };
    return inFlight.current ? inFlight.current.then(start) : start();
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (!document.hidden) void refresh({ maxAgeMs: BACKGROUND_REFRESH_MS });
    };
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, BACKGROUND_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  const markViewed = useCallback(
    (id: string) => {
      setViewed((prev) => (prev.has(id) ? prev : new Set(markApplicationViewed(employerId, id))));
    },
    [employerId],
  );
    
  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
    applications.forEach((a) => {
      counts[stageOf(a, viewed)] += 1;
    });
    return counts;
  }, [applications, viewed]);

  const pendingCount = useMemo(() => applications.filter(isPending).length, [applications]);

  const value = useMemo<EmployerDataValue>(
    () => ({
      applications,
      loading,
      error,
      refresh,
      viewedIds: viewed,
      markViewed,
      stageCounts,
      pendingCount,
      unreadNotifications,
      setUnreadNotifications,
    }),
    [applications, loading, error, refresh, viewed, markViewed, stageCounts, pendingCount, unreadNotifications],
  );

  return <EmployerDataContext.Provider value={value}>{children}</EmployerDataContext.Provider>;
}

export function useEmployerData(): EmployerDataValue {
  const ctx = useContext(EmployerDataContext);
  if (!ctx) throw new Error("useEmployerData must be used inside EmployerDataProvider");
  return ctx;
}
