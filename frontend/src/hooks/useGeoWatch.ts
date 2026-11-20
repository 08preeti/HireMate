"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidLatLng } from "@/lib/maps";
import { calculateBearing, haversine } from "@/lib/geo";

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  /** When the device took the reading (ms since epoch). */
  timestamp: number;
}

export type GeoStatus =
  | "idle"
  | "requesting"
  | "watching"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

const toFix = (p: GeolocationPosition, prev?: GeoFix | null): GeoFix => {
  let heading =
    Number.isFinite(p.coords.heading) && p.coords.heading !== null && p.coords.heading >= 0
      ? p.coords.heading
      : null;
  let speed =
    Number.isFinite(p.coords.speed) && p.coords.speed !== null && p.coords.speed >= 0
      ? Math.round(p.coords.speed * 3.6) // m/s to km/h
      : null;

  if (prev && isValidLatLng(prev.lat, prev.lng)) {
    const km = haversine(prev.lat, prev.lng, p.coords.latitude, p.coords.longitude);
    const dtSeconds = (p.timestamp - prev.timestamp) / 1000;
    if (heading === null && km > 0.003) {
      heading = Math.round(calculateBearing(prev.lat, prev.lng, p.coords.latitude, p.coords.longitude));
    } else if (heading === null && prev.heading !== undefined) {
      heading = prev.heading;
    }
    if (speed === null && dtSeconds > 0.5 && dtSeconds < 30) {
      speed = Math.round(km / (dtSeconds / 3600));
    }
  }

  return {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy: p.coords.accuracy,
    heading,
    speed,
    timestamp: p.timestamp,
  };
};

function statusFor(err: GeolocationPositionError): GeoStatus {
  if (err.code === err.PERMISSION_DENIED) return "denied";
  if (err.code === err.TIMEOUT) return "timeout";
  return "unavailable";
}

interface Options {
  /** Re-read the position this often while the page is visible (a parked phone emits no movement events). 0 = off. */
  heartbeatMs?: number;
}

/**
 * The only place that touches navigator.geolocation. Nothing runs until start() is called, and
 * stop() (or unmounting) always clears the watch and the heartbeat.
 */
export function useGeoWatch(
  onFix?: (fix: GeoFix) => void,
  { heartbeatMs = 0 }: Options = {},
) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [fix, setFix] = useState<GeoFix | null>(null);
  const lastFixRef = useRef<GeoFix | null>(null);
  const watchId = useRef<number | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimestamp = useRef(0);
  const onFixRef = useRef(onFix);
  useEffect(() => {
    onFixRef.current = onFix;
  }, [onFix]);

  const halt = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined")
      navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
  }, []);

  const accept = useCallback((p: GeolocationPosition) => {
    const next = toFix(p, lastFixRef.current);
    // Ignore impossible coordinates and readings older than one already accepted (the device can replay a cached fix).
    if (
      !isValidLatLng(next.lat, next.lng) ||
      next.timestamp < lastTimestamp.current
    )
      return;
    lastTimestamp.current = next.timestamp;
    lastFixRef.current = next;
    setFix(next);
    setStatus("watching");
    onFixRef.current?.(next);
  }, []);

  /** Asks for permission and a first real reading. Resolves with it, or null (the status says why). */
  const start = useCallback(async (): Promise<GeoFix | null> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      return null;
    }
    halt();
    lastTimestamp.current = 0;
    setStatus("requesting");
    const first = await new Promise<
      GeolocationPosition | GeolocationPositionError
    >((resolve) =>
      navigator.geolocation.getCurrentPosition(resolve, resolve, {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      }),
    );
    if ("code" in first) {
      setStatus(statusFor(first));
      return null;
    }
    const firstFix = toFix(first, lastFixRef.current);
    if (!isValidLatLng(firstFix.lat, firstFix.lng)) {
      setStatus("unavailable");
      return null;
    }
    lastTimestamp.current = firstFix.timestamp;
    lastFixRef.current = firstFix;
    setFix(firstFix);
    setStatus("watching");

    watchId.current = navigator.geolocation.watchPosition(
      accept,
      (err) => {
        const next = statusFor(err);
        setStatus(next);
        if (next === "denied") halt();
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    if (heartbeatMs > 0) {
      heartbeat.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        navigator.geolocation.getCurrentPosition(accept, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 15_000,
          timeout: 15_000,
        });
      }, heartbeatMs);
    }
    return firstFix;
  }, [accept, halt, heartbeatMs]);

  const stop = useCallback(() => {
    halt();
    setStatus("idle");
  }, [halt]);

  // A hidden tab may have been throttled: read the position again the moment it is visible.
  useEffect(() => {
    if (status !== "watching") return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        navigator.geolocation.getCurrentPosition(accept, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 15_000,
        });
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [status, accept]);

  useEffect(() => halt, [halt]);

  return { status, fix, start, stop };
}
