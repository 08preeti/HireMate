"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { getTracking } from "@/services/location";
import { useTrackingChannel, type LocationPush } from "./useTrackingChannel";
import type { TrackingResponse } from "@/types";

export type TrackingProblem = "network" | "forbidden" | "failed" | null;

const ACTIVE_MS = 5_000;
const IDLE_MS = 15_000;
const MAX_BACKOFF_MS = 30_000;
// While the socket is live, pushes carry the location; this slow poll only backstops anything that was missed.
const SOCKET_BACKSTOP_MS = 30_000;

type TimerRef = { current: ReturnType<typeof setTimeout> | null };
function stopTimer(ref: TimerRef) {
  if (ref.current) clearTimeout(ref.current);
  ref.current = null;
}

const updatedAtOf = (r: TrackingResponse | null) =>
  r?.location?.updatedAt ? Date.parse(r.location.updatedAt) : 0;

/**
 * Employer-side live view of ONE application's shared location. Location updates are pushed over the socket;
 * HTTP polling (visible tab only) loads the first state, backstops the socket, and takes over at full speed
 * whenever the socket is down. It backs off after failures and refetches on reconnect.
 */
export function useWorkerTracking(applicationId: string | null) {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [problem, setProblem] = useState<TrackingProblem>(null);
  const [loading, setLoading] = useState(false);
  const [receivedAt, setReceivedAt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);
  const run = useRef(0);
  const socketLive = useRef(false);
  const pollRef = useRef<(id: string, token: number) => Promise<void>>(
    async () => {},
  );

  const poll = useCallback(async (id: string, token: number) => {
    stopTimer(timer);
    if (token !== run.current) return;
    let nextMs = ACTIVE_MS;
    try {
      const res = await getTracking(id);
      if (token !== run.current) return;
      failures.current = 0;
      // A pushed update can be newer than this response: never go back in time.
      setData((prev) =>
        prev && updatedAtOf(prev) > updatedAtOf(res)
          ? { ...res, location: prev.location, stale: prev.stale }
          : res,
      );
      setReceivedAt(Date.now());
      setProblem(null);
      nextMs =
        res.sharing === "active"
          ? socketLive.current
            ? SOCKET_BACKSTOP_MS
            : ACTIVE_MS
          : IDLE_MS;
      if (res.sharing === "ended") nextMs = 0;
    } catch (err) {
      if (token !== run.current) return;
      failures.current += 1;
      if (
        err instanceof ApiError &&
        (err.status === 403 || err.status === 404)
      ) {
        setProblem("forbidden");
        setData(null);
        nextMs = 0;
      } else {
        setProblem(err instanceof ApiError ? "failed" : "network");
        nextMs = Math.min(
          MAX_BACKOFF_MS,
          ACTIVE_MS * 2 ** Math.min(failures.current, 3),
        );
      }
    } finally {
      if (token === run.current) setLoading(false);
    }
    if (
      nextMs > 0 &&
      token === run.current &&
      document.visibilityState === "visible"
    ) {
      timer.current = setTimeout(() => void poll(id, token), nextMs);
    }
  }, []);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const channel = useTrackingChannel(applicationId, {
    onLocation: (push: LocationPush) => {
      setData((prev) =>
        prev && updatedAtOf(prev) <= Date.parse(push.location.updatedAt ?? "")
          ? {
              ...prev,
              sharing: "active",
              location: push.location,
              stale: false,
              serverTime: push.serverTime,
            }
          : prev,
      );
      setReceivedAt(Date.now());
      setProblem(null);
    },
    onChanged: () => {
      if (applicationId && document.visibilityState === "visible")
        void pollRef.current(applicationId, run.current);
    },
  });

  // Socket up or down: re-sync once and let the poll pick the right speed.
  useEffect(() => {
    socketLive.current = channel.live;
    if (
      applicationId &&
      run.current > 0 &&
      document.visibilityState === "visible"
    )
      void pollRef.current(applicationId, run.current);
  }, [channel.live, applicationId]);

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
      if (document.visibilityState === "visible")
        void poll(applicationId, token);
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

  return { data, problem, loading, receivedAt, live: channel.live };
}
