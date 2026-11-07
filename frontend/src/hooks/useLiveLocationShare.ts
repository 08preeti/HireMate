"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { haversine } from "@/lib/geo";
import { ApiError } from "@/services/api";
import { setLocationConsent } from "@/services/applications";
import { sendLiveLocation } from "@/services/location";
import { useGeoWatch, type GeoFix } from "./useGeoWatch";

// Send at most every 10 s, or sooner (5 s) after moving 30 m; a parked phone is re-read every 30 s.
const SEND_EVERY_MS = 10_000;
const MOVED_SEND_EVERY_MS = 5_000;
const MOVED_KM = 0.03;
const HEARTBEAT_MS = 30_000;
const MAX_USEFUL_ACCURACY_M = 1_500;

export type SharePhase = "off" | "starting" | "sharing" | "paused" | "denied" | "unavailable" | "unsupported" | "ended";

/**
 * Worker-side live location for ONE application. Nothing is requested or sent until the worker
 * starts sharing; stopping (or the work ending) clears the GPS watch.
 */
export function useLiveLocationShare(applicationId: string, serverConsent: boolean, eligible: boolean) {
  const [consent, setConsent] = useState(serverConsent);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [weakSignal, setWeakSignal] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consentRef = useRef(consent);
  const sending = useRef(false);
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!busy) setConsent(serverConsent);
  }, [serverConsent, busy]);
  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);

  const { status: geoStatus, fix: geoFix, start: geoStart, stop: geoStop } = useGeoWatch(undefined, { heartbeatMs: HEARTBEAT_MS });

  const send = useCallback(
    async (fix: GeoFix, force = false) => {
      if (!consentRef.current || sending.current) return;
      if (fix.accuracy > MAX_USEFUL_ACCURACY_M) {
        setWeakSignal(true);
        return;
      }
      const prev = last.current;
      if (!force && prev) {
        const elapsed = Date.now() - prev.at;
        const movedKm = haversine(prev.lat, prev.lng, fix.lat, fix.lng);
        if (elapsed < MOVED_SEND_EVERY_MS || (elapsed < SEND_EVERY_MS && movedKm < MOVED_KM)) return;
      }
      sending.current = true;
      try {
        await sendLiveLocation(applicationId, { lat: fix.lat, lng: fix.lng, accuracy: Math.round(fix.accuracy), recordedAt: fix.timestamp });
        last.current = { at: Date.now(), lat: fix.lat, lng: fix.lng };
        setLastSentAt(Date.now());
        setOffline(false);
        setWeakSignal(false);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 409)) {
          // The server says sharing is off or the work is over: stop for real.
          geoStop();
          setConsent(false);
          setError(err.message);
        } else if (err instanceof ApiError && err.status === 422) setWeakSignal(true);
        else if (!(err instanceof ApiError && err.status === 429)) setOffline(true);
      } finally {
        sending.current = false;
      }
    },
    [applicationId, geoStop],
  );

  // Every reading from the watch goes through the same throttled send.
  useEffect(() => {
    if (geoFix && geoStatus === "watching") void send(geoFix);
  }, [geoFix, geoStatus, send]);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);

  // The work ended (completed / cancelled): stop reading GPS.
  useEffect(() => {
    if (!eligible) geoStop();
  }, [eligible, geoStop]);

  /** Called only after the worker has agreed in the consent dialog. */
  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const first = await geoStart(); // browser permission + a real first reading, before anything is stored
      if (!first) return;
      await setLocationConsent(applicationId, true);
      consentRef.current = true;
      setConsent(true);
      await send(first, true);
    } catch (err) {
      geoStop();
      setError(err instanceof Error ? err.message : "Could not turn on sharing");
    } finally {
      setBusy(false);
    }
  }, [applicationId, geoStart, geoStop, send]);

  /** Sharing is still on at the server but this screen stopped reading GPS (page reload / navigation). */
  const resume = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const first = await geoStart();
      if (first) await send(first, true);
    } finally {
      setBusy(false);
    }
  }, [geoStart, send]);

  const stop = useCallback(async () => {
    setBusy(true);
    setError(null);
    geoStop();
    try {
      await setLocationConsent(applicationId, false);
      setConsent(false);
      last.current = null;
      setLastSentAt(null);
      setOffline(false);
      setWeakSignal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop sharing. Try again.");
    } finally {
      setBusy(false);
    }
  }, [applicationId, geoStop]);

  let phase: SharePhase;
  if (!eligible) phase = "ended";
  else if (geoStatus === "requesting" || (busy && geoStatus === "idle")) phase = "starting";
  else if (consent && geoStatus === "watching") phase = "sharing";
  else if (geoStatus === "denied") phase = "denied";
  else if (geoStatus === "unsupported") phase = "unsupported";
  else if (consent) phase = geoStatus === "unavailable" || geoStatus === "timeout" ? "sharing" : "paused";
  else if (geoStatus === "unavailable") phase = "unavailable";
  else phase = "off";

  return { phase, consent, busy, offline, weakSignal, lastSentAt, error, gpsLost: geoStatus === "unavailable" || geoStatus === "timeout", start, resume, stop };
}
