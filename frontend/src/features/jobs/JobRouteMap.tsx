"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCrosshair, FiExternalLink, FiX } from "react-icons/fi";
import MapViewLazy from "@/components/maps/MapViewLazy";
import { useGeoWatch } from "@/hooks/useGeoWatch";
import { useL } from "@/hooks/useL";
import { haversine } from "@/lib/geo";
import { clockTime, formatDistance, formatDuration } from "@/lib/maps";
import { ApiError } from "@/services/api";
import { getJobRoutePreview } from "@/services/location";
import type { LatLng, LatLngTuple, MapMarker, RouteInfo } from "@/types";

const REROUTE_MIN_KM = 0.1;
const REROUTE_MIN_MS = 15_000;
const GLIDE_MS = 900;

interface Props {
  jobId: string;
  dest: LatLng;
  label: string;
  /** True once the person taps "View Route on Map". */
  active: boolean;
  onClose: () => void;
  loggedIn: boolean;
  loginHref: string;
  googleHref: string | null;
}

/**
 * The job-details map. Idle: just the job pin. Active: asks for the phone's GPS, draws the real driving route on this same map
 * and keeps the "you" marker gliding along it with live distance / ETA. The position is used only on this device and for the
 * route request; nothing is stored or shared.
 */
export default function JobRouteMap({ jobId, dest, label, active, onClose, loggedIn, loginHref, googleHref }: Props) {
  const { L } = useL();
  const { status, fix, start, stop } = useGeoWatch();
  const [route, setRoute] = useState<{ info: RouteInfo; at: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [shown, setShown] = useState<LatLngTuple | null>(null);
  const lastRoute = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const busy = useRef(false);
  const glide = useRef<{ raf: number | null; from: LatLngTuple | null }>({ raf: null, from: null });

  const live = active && loggedIn;

  // Start / stop the GPS together with the route view.
  useEffect(() => {
    if (live) void start();
    else {
      stop();
      setRoute(null);
      setProblem(null);
      setShown(null);
      lastRoute.current = null;
    }
  }, [live, start, stop]);

  const fixLat = fix?.lat;
  const fixLng = fix?.lng;

  const fetchRoute = useCallback(
    async (from: LatLng) => {
      if (busy.current) return;
      busy.current = true;
      setRouting(true);
      lastRoute.current = { at: Date.now(), lat: from.lat, lng: from.lng };
      try {
        const info = await getJobRoutePreview(jobId, from);
        setRoute({ info, at: Date.now() });
        setProblem(null);
      } catch (err) {
        const code = err instanceof ApiError ? err.status : 0;
        setProblem(
          code === 401 || code === 403
            ? L("Please sign in as a worker to see the route.", "रूट देखने के लिए वर्कर के रूप में लॉगिन करें।", "मार्ग पाहण्यासाठी वर्कर म्हणून लॉगिन करा.")
            : code === 404
              ? L("No driving route was found. Use Google Maps.", "ड्राइविंग रूट नहीं मिला। Google Maps का उपयोग करें।", "ड्रायव्हिंग मार्ग सापडला नाही. Google Maps वापरा.")
              : code === 429
                ? L("Too many route requests. Please wait a moment.", "रूट के बहुत अनुरोध। कृपया थोड़ा रुकें।", "मार्गाच्या खूप विनंत्या. कृपया थोडे थांबा.")
                : L("Route is not available right now. You can still use Google Maps.", "रूट अभी उपलब्ध नहीं है। आप Google Maps का उपयोग कर सकते हैं।", "मार्ग सध्या उपलब्ध नाही. तुम्ही Google Maps वापरू शकता."),
        );
      } finally {
        busy.current = false;
        setRouting(false);
      }
    },
    [jobId, L],
  );

  // First route straight away, then again only after ~100 m of movement (and at most every 15 s).
  useEffect(() => {
    if (!live || fixLat === undefined || fixLng === undefined) return;
    const prev = lastRoute.current;
    const elapsed = prev ? Date.now() - prev.at : Infinity;
    const moved = prev ? haversine(prev.lat, prev.lng, fixLat, fixLng) : Infinity;
    if (elapsed < REROUTE_MIN_MS) return;
    if (!route || problem || moved >= REROUTE_MIN_KM) void fetchRoute({ lat: fixLat, lng: fixLng });
  }, [live, fixLat, fixLng, route, problem, fetchRoute]);

  // Glide the "you" marker from its previous spot to each new GPS fix instead of jumping.
  useEffect(() => {
    if (!live || fixLat === undefined || fixLng === undefined) return;
    const to: LatLngTuple = [fixLat, fixLng];
    const from = glide.current.from;
    if (!from) {
      glide.current.from = to;
      setShown(to);
      return;
    }
    if (glide.current.raf !== null) cancelAnimationFrame(glide.current.raf);
    const t0 = performance.now();
    let lastPaint = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / GLIDE_MS);
      if (now - lastPaint > 100 || k === 1) {
        lastPaint = now;
        setShown([from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k]);
      }
      if (k < 1) glide.current.raf = requestAnimationFrame(step);
      else {
        glide.current.from = to;
        glide.current.raf = null;
      }
    };
    glide.current.raf = requestAnimationFrame(step);
    return () => {
      if (glide.current.raf !== null) cancelAnimationFrame(glide.current.raf);
      glide.current.raf = null;
      glide.current.from = to;
    };
  }, [live, fixLat, fixLng]);

  useEffect(() => {
    if (!live) glide.current.from = null;
  }, [live]);

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [{ id: "job", kind: "destination", position: [dest.lat, dest.lng], label }];
    if (live && shown) list.push({ id: "me", kind: "worker", position: shown, label: L("You are here", "आप यहाँ हैं", "तुम्ही येथे आहात") });
    return list;
  }, [dest.lat, dest.lng, label, live, shown, L]);

  const geoMessage =
    status === "denied"
      ? L("Location permission is blocked. Allow location for this site in your browser settings.", "लोकेशन की अनुमति बंद है। ब्राउज़र सेटिंग में अनुमति दें।", "लोकेशन परवानगी बंद आहे. ब्राउझर सेटिंगमध्ये परवानगी द्या.")
      : status === "unavailable"
        ? L("Could not find your location. Turn on GPS and try again.", "आपकी लोकेशन नहीं मिली। GPS चालू करके फिर कोशिश करें।", "तुमचे ठिकाण सापडले नाही. GPS चालू करून पुन्हा प्रयत्न करा.")
        : status === "timeout"
          ? L("Getting your location is taking too long. Move to an open area.", "लोकेशन मिलने में बहुत समय लग रहा है। खुली जगह जाएं।", "ठिकाण मिळण्यास खूप वेळ लागत आहे. मोकळ्या जागी जा.")
          : status === "unsupported"
            ? L("This browser cannot read your location.", "यह ब्राउज़र आपकी लोकेशन नहीं पढ़ सकता।", "हा ब्राउझर तुमचे ठिकाण वाचू शकत नाही.")
            : "";

  const arriveAt = route ? route.at + route.info.durationSeconds * 1000 : null;
  const focusKey = live && shown ? `route-${recenter}` : `idle-${recenter}`;
  const heading = route
    ? `${formatDuration(route.info.durationSeconds)} · ${formatDistance(route.info.distanceMeters)}`
    : status === "requesting"
      ? L("Finding your location…", "आपकी लोकेशन ढूँढ रहे हैं…", "तुमचे ठिकाण शोधत आहे…")
      : routing
        ? L("Calculating route…", "रूट निकाला जा रहा है…", "मार्ग काढत आहे…")
        : "";

  return (
    <div className="mt-4">
      {active && !loggedIn && (
        <div role="alert" className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
          <span>{L("Sign in as a worker to see your live route to this job.", "इस काम तक अपना लाइव रूट देखने के लिए वर्कर के रूप में लॉगिन करें।", "या कामापर्यंतचा लाइव्ह मार्ग पाहण्यासाठी वर्कर म्हणून लॉगिन करा.")}</span>
          <span className="flex items-center gap-2">
            <Link href={loginHref} className="rounded-md bg-brand px-3 py-1 font-semibold text-white no-underline">{L("Sign in", "लॉगिन", "लॉगिन")}</Link>
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-amber-300 bg-white px-3 py-1 font-semibold">{L("Close", "बंद करें", "बंद करा")}</button>
          </span>
        </div>
      )}

      {live && (geoMessage || problem) && (
        <div role="alert" className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
          {geoMessage || problem}{" "}
          {googleHref && <a href={googleHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1a73e8]">Google Maps</a>}
        </div>
      )}

      <div className={`relative overflow-hidden rounded-xl border border-[#e6ecf5] transition-[height] duration-300 ${live ? "h-[420px]" : "h-[280px]"}`}>
        <MapViewLazy center={[dest.lat, dest.lng]} markers={markers} route={live ? route?.info.coordinates : undefined} focusKey={focusKey} />

        {live && (
          <>
            <div className="absolute inset-x-3 top-3 z-[500] flex items-center gap-3 rounded-xl bg-white/95 px-3 py-2 shadow">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-slate-900">{heading || L("Live route", "लाइव रूट", "लाइव्ह मार्ग")}</div>
                {arriveAt && <div className="text-[12px] text-slate-600">{L("Arrive about", "लगभग पहुँचेंगे", "सुमारे पोहोचाल")} {clockTime(arriveAt)}</div>}
              </div>
              <button type="button" onClick={() => setRecenter((k) => k + 1)} aria-label={L("Recenter", "बीच में लाएँ", "मध्यभागी आणा")} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"><FiCrosshair /></button>
              <button type="button" onClick={onClose} className="flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700"><FiX /> {L("Stop", "रोकें", "थांबवा")}</button>
            </div>
            {googleHref && (
              <a href={googleHref} target="_blank" rel="noopener noreferrer" className="absolute bottom-7 right-3 z-[500] flex items-center gap-1.5 rounded-lg border border-[#ddd] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1a73e8] no-underline shadow">
                <FiExternalLink aria-hidden="true" /> {L("Open in Google Maps", "Google Maps में खोलें", "Google Maps मध्ये उघडा")}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
