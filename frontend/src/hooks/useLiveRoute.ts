"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { measureRoute, nextInstruction, offRouteLimit, routeProgress, type RouteProgress } from "@/lib/routeProgress";
import { ApiError } from "@/services/api";
import type { LatLng, RouteInfo, RouteStatus } from "@/types";

// A new route is only requested when the first one is missing, the position has clearly left the current route,
// or a previous attempt failed — and never more often than this.
const MIN_REFETCH_MS = 15_000;
const RETRY_AFTER_FAILURE_MS = 20_000;
// Two off-route readings in a row (or one far off) count as "left the route", so one jumpy GPS reading does not.
const FAR_OFF_ROUTE_M = 250;

export type RouteProblem = "notFound" | "busy" | "offline" | "forbidden" | "failed" | null;

export interface PositionInput {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

interface Options {
  position: PositionInput | null;
  destination: LatLng | null;
  enabled: boolean;
  fetchRoute: (from: LatLng) => Promise<RouteInfo>;
}

function problemFor(err: unknown): RouteProblem {
  if (!(err instanceof ApiError)) return "offline";
  if (err.status === 404 || err.status === 409) return "notFound";
  if (err.status === 429) return "busy";
  if (err.status === 401 || err.status === 403) return "forbidden";
  return "failed";
}

/**
 * Shared by the worker's navigation screen and the employer's tracking panel.
 * The route comes from the routing provider; distance, arrival time and the done / remaining split are worked out
 * from the real position on that route, so they move with every GPS update without a new request.
 */
export function useLiveRoute({ position, destination, enabled, fetchRoute }: Options) {
  const [info, setInfo] = useState<RouteInfo | null>(null);
  const [problem, setProblem] = useState<RouteProblem>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(0);
  const inflight = useRef(false);
  const lastTry = useRef(0);
  const offCount = useRef(0);
  const generation = useRef(0);
  const fetchRef = useRef(fetchRoute);
  useEffect(() => {
    fetchRef.current = fetchRoute;
  });

  const destLat = destination?.lat;
  const destLng = destination?.lng;
  const lat = position?.lat;
  const lng = position?.lng;
  const accuracy = position?.accuracy ?? null;

  const measured = useMemo(() => (info ? measureRoute(info.coordinates) : null), [info]);
  const progress = useMemo<RouteProgress | null>(
    () => (info && measured && lat !== undefined && lng !== undefined ? routeProgress(measured, info, [lat, lng]) : null),
    [info, measured, lat, lng],
  );
  const offRoute = !!progress && progress.offRouteMeters > offRouteLimit(accuracy);
  const farOff = !!progress && progress.offRouteMeters > FAR_OFF_ROUTE_M;

  const request = useCallback(async (from: LatLng) => {
    if (inflight.current) return;
    inflight.current = true;
    lastTry.current = Date.now();
    const mine = generation.current;
    setFetching(true);
    try {
      const next = await fetchRef.current(from);
      if (mine !== generation.current) return;
      setInfo(next);
      setFetchedAt(Date.now());
      setProblem(null);
      offCount.current = 0;
    } catch (err) {
      if (mine === generation.current) setProblem(problemFor(err));
    } finally {
      inflight.current = false;
      if (mine === generation.current) setFetching(false);
    }
  }, []);

  // A different destination or a stopped view means the old route no longer applies.
  useEffect(() => {
    generation.current += 1;
    inflight.current = false;
    offCount.current = 0;
    lastTry.current = 0;
    setInfo(null);
    setProblem(null);
    setFetching(false);
    return () => {
      generation.current += 1;
    };
  }, [destLat, destLng, enabled]);

  // Decide, on every accepted position, whether a (new) route is worth asking for.
  useEffect(() => {
    if (!enabled || destLat === undefined || destLng === undefined || lat === undefined || lng === undefined) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const sinceLast = Date.now() - lastTry.current;

    if (!info) {
      if (problem ? sinceLast >= RETRY_AFTER_FAILURE_MS : sinceLast >= 0) void request({ lat, lng });
      return;
    }
    offCount.current = offRoute ? offCount.current + 1 : 0;
    if (offRoute && (offCount.current >= 2 || farOff) && sinceLast >= MIN_REFETCH_MS) void request({ lat, lng });
  }, [enabled, destLat, destLng, lat, lng, info, problem, offRoute, farOff, request]);

  // Coming back online is a reason to try again straight away.
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      if (lat !== undefined && lng !== undefined && (!info || problem)) {
        lastTry.current = 0;
        void request({ lat, lng });
      }
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [enabled, info, problem, lat, lng, request]);

  let status: RouteStatus = "idle";
  if (enabled) {
    if (!info) status = problem ? "unavailable" : "calculating";
    else if (fetching && offRoute) status = "rerouting";
    else if (offRoute) status = "offRoute";
    else status = "onRoute";
  }

  const next = useMemo(
    () => (info && measured && progress ? nextInstruction(measured, info, progress.position.alongMeters) : null),
    [info, measured, progress],
  );

  return { info, progress, status, problem, fetching, fetchedAt, next };
}
