"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { getTracking } from "@/services/location";
import type { TrackingResponse } from "@/types";

export type TrackingProblem = "network" | "forbidden" | "failed" | null;

const ACTIVE_MS = 5_000;
const IDLE_MS = 15_000;
const MAX_BACKOFF_MS = 30_000;

type TimerRef = { current: ReturnType<typeof setTimeout> | null };
function stopTimer(ref: TimerRef) {
  if (ref.current) clearTimeout(ref.current);
  ref.current = null;
}

/**
 * Employer-side polling of ONE application's shared location. Polls only while the tab is visible,
 * waits longer when nothing is being shared, backs off after failures, and refetches on reconnect.
 */
export function useWorkerTracking(applicationId: string | null) {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [problem, setProblem] = useState<TrackingProblem>(null);
  const [loading, setLoading] = useState(false);
  const [receivedAt, setReceivedAt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);
  const run = useRef(0);

  const poll = useCallback(
    async (id: string, token: number) => {
      stopTimer(timer);
      if (token !== run.current) return;
      let nextMs = ACTIVE_MS;
      try {
        const res = await getTracking(id);
        if (token !== run.current) return;
        failures.current = 0;
        setData(res);
        setReceivedAt(Date.now());
        setProblem(null);
        nextMs = res.sharing === "active" ? ACTIVE_MS : IDLE_MS;
        if (res.sharing === "ended") nextMs = 0;
      } catch (err) {
        if (token !== run.current) return;
        failures.current += 1;
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setProblem("forbidden");
          setData(null);
          nextMs = 0;
        } else {
          setProblem(err instanceof ApiError ? "failed" : "network");
          nextMs = Math.min(MAX_BACKOFF_MS, ACTIVE_MS * 2 ** Math.min(failures.current, 3));
        }
      } finally {
        if (token === run.current) setLoading(false);
      }
      if (nextMs > 0 && token === run.current && document.visibilityState === "visible") {
        timer.current = setTimeout(() => void poll(id, token), nextMs);
      }
    },
    [],
  );

  useEffect(() => {
    run.current += 1;
    const token = run.current;
    failures.current = 0;
    setData(null);
    setProblem(null);
    if (!applicationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void poll(applicationId, token);

    const resume = () => {
      if (document.visibilityState === "visible") void poll(applicationId, token);
      else stopTimer(timer);
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      run.current += 1;
      stopTimer(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [applicationId, poll]);

  return { data, problem, loading, receivedAt };
}
