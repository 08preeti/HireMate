"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  /** When the device took the reading (ms since epoch). */
  timestamp: number;
}

export type GeoStatus = "idle" | "requesting" | "watching" | "denied" | "unavailable" | "timeout" | "unsupported";

const toFix = (p: GeolocationPosition): GeoFix => ({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, timestamp: p.timestamp });

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
export function useGeoWatch(onFix?: (fix: GeoFix) => void, { heartbeatMs = 0 }: Options = {}) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [fix, setFix] = useState<GeoFix | null>(null);
  const watchId = useRef<number | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFixRef = useRef(onFix);
  useEffect(() => {
    onFixRef.current = onFix;
  }, [onFix]);

  const halt = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
  }, []);

  const accept = useCallback((p: GeolocationPosition) => {
    const next = toFix(p);
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
    setStatus("requesting");
    const first = await new Promise<GeolocationPosition | GeolocationPositionError>((resolve) =>
      navigator.geolocation.getCurrentPosition(resolve, resolve, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 }),
    );
    if ("code" in first) {
      setStatus(statusFor(first));
      return null;
    }
    const firstFix = toFix(first);
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
        navigator.geolocation.getCurrentPosition(accept, () => {}, { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 });
      }, heartbeatMs);
    }
    return firstFix;
  }, [accept, halt, heartbeatMs]);

  const stop = useCallback(() => {
    halt();
    setStatus("idle");
  }, [halt]);

  useEffect(() => halt, [halt]);

  return { status, fix, start, stop };
}
