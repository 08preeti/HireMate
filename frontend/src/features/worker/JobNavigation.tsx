"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { fixLeafletIcons } from "@/lib/leaflet";
import { haversine } from "@/lib/geo";
import { speak } from "@/lib/speech";
import { useAuth } from "@/context/AuthContext";
import { updateApplicationStatus } from "@/services/applications";
import { updateWorkerLocation } from "@/services/workers";
import type { ApplicationStatus, LatLng, RouteResult } from "@/types";


// ─── ICONS ─────────────────────────────────────────────────────────────────
fixLeafletIcons();

const workerIcon = new L.DivIcon({
  html: `<div class="w-[44px] h-[44px] rounded-full bg-brand border-[3px] border-white shadow-[0_2px_12px_rgba(0,100,145,0.5)] flex items-center justify-center text-[20px]">🚗</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  className: "",
});

const destIcon = new L.DivIcon({
  html: `<div class="w-[44px] h-[44px] rounded-full bg-danger border-[3px] border-white shadow-[0_2px_12px_rgba(232,0,42,0.5)] flex items-center justify-center text-[20px]">📍</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  className: "",
});

// ─── MOVE MAP TO WORKER LOCATION ───────────────────────────────────────────
function FollowWorker({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  const prevPos = useRef<LatLng | null>(null);
  useEffect(() => {
    if (!pos) return;
    // Only pan if moved more than ~50m
    if (!prevPos.current) {
      map.setView([pos.lat, pos.lng], 16, { animate: true, duration: 1 });
    } else {
      const dist = map.distance(
        [prevPos.current.lat, prevPos.current.lng],
        [pos.lat, pos.lng]
      );
      if (dist > 50) {
        map.setView([pos.lat, pos.lng], 16, { animate: true, duration: 1 });
      }
    }
    prevPos.current = pos;
  }, [pos, map]);
  return null;
}


// ─── OSRM ROUTE FETCH ─────────────────────────────────────────────────────
interface OsrmResponse {
  code: string;
  routes: {
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
    legs: { steps: { name?: string; maneuver: { instruction?: string } }[] }[];
  }[];
}

async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || !data.routes.length) return null;
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng]);
    const distKm = (route.distance / 1000).toFixed(2);
    const timeMin = Math.round(route.duration / 60);
    const steps = route.legs[0].steps.map((s) => s.maneuver.instruction || s.name).filter((x): x is string => Boolean(x));
    return { coords, distKm, timeMin, steps };
  } catch {
    return null;
  }
}


// ─── STATUS STEPS ─────────────────────────────────────────────────────────
const STATUS_STEPS: ApplicationStatus[] = ["accepted", "on_the_way", "arrived", "completed"];
interface StatusStyle {
  label: string;
  icon: string;
  solid: string;
  text: string;
  ring: string;
}

const STATUS_LABELS: Record<ApplicationStatus, StatusStyle> = {
  // Full Tailwind class names (not built dynamically) so Tailwind can see them.
  accepted:    { label: "Job Accepted",    icon: "✅", solid: "bg-brand",       text: "text-brand",       ring: "shadow-[0_0_0_4px_rgba(0,100,145,.19)]" },
  on_the_way:  { label: "On the Way",      icon: "👷‍♂️", solid: "bg-amber-500",   text: "text-amber-500",   ring: "shadow-[0_0_0_4px_rgba(245,158,11,.19)]" },
  arrived:     { label: "Arrived",         icon: "📍", solid: "bg-emerald-500", text: "text-emerald-500", ring: "shadow-[0_0_0_4px_rgba(16,185,129,.19)]" },
  completed:   { label: "Job Completed",   icon: "🎉", solid: "bg-violet-500",  text: "text-violet-500",  ring: "shadow-[0_0_0_4px_rgba(139,92,246,.19)]" },
};

// ══════════════════════════════════════════════════════════════════════════
export default function JobNavigation() {
  const { worker } = useAuth();
  const params    = useSearchParams();
  const destLat    = parseFloat(params.get("lat") ?? "");
  const destLng    = parseFloat(params.get("lng") ?? "");
  const address    = params.get("address") || "Job Location";
  const appId      = params.get("appId");     // application _id for status update

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dest = useMemo<LatLng>(() => ({ lat: destLat, lng: destLng }), [destLat, destLng]);

  const [workerPos, setWorkerPos]         = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords]     = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo]         = useState<{ distKm: string; timeMin: number } | null>(null);   // { distKm, timeMin }
  const [nextStep, setNextStep]           = useState("");
  const [tracking, setTracking]           = useState(false);
  const [status, setStatus]               = useState<ApplicationStatus>("accepted");
  const [arrived, setArrived]             = useState(false);
  const [eta, setEta]                     = useState<string | null>(null);   // HH:MM string
  const [routeLoading, setRouteLoading]   = useState(false);
  const [mapReady, setMapReady]           = useState(false); // eslint-disable-line no-unused-vars
  const watchIdRef                        = useRef<number | null>(null);
  const lastRouteFetch                    = useRef(0);
  const prevStepRef                       = useRef("");

  // ─── FETCH ROUTE whenever worker moves significantly ─────────────────
  const refreshRoute = useCallback(async (pos: LatLng) => {
    const now = Date.now();
    if (now - lastRouteFetch.current < 8000) return; // throttle 8s
    lastRouteFetch.current = now;

    setRouteLoading(true);
    const result = await fetchRoute(pos, dest);
    setRouteLoading(false);

    if (!result) return;
    setRouteCoords(result.coords);
    setRouteInfo({ distKm: result.distKm, timeMin: result.timeMin });

    // ETA
    const now2 = new Date();
    now2.setMinutes(now2.getMinutes() + result.timeMin);
    setEta(now2.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

    // Voice next step
    const step = result.steps[0];
    if (step && step !== prevStepRef.current) {
      speak(step);
      prevStepRef.current = step;
      setNextStep(step);
    }

    // Arrived check — within 80m
    const dist = haversine(pos.lat, pos.lng, dest.lat, dest.lng);
    if (dist < 0.08 && !arrived) {
      setArrived(true);
      setStatus("arrived");
      speak("You have arrived at the job location.");
    }
  }, [dest, arrived]);

  // ─── START GPS TRACKING ──────────────────────────────────────────────
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser");
      return;
    }
    setTracking(true);
    setStatus("on_the_way");
    speak("Navigation started. Head towards the job location.");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setWorkerPos(newPos);

        // Send location to backend
        try {
          if (worker) await updateWorkerLocation(worker._id, newPos.lat, newPos.lng);
        } catch {}

        await refreshRoute(newPos);
      },
      (err) => { console.error(err); alert("Please allow location access."); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  // ─── UPDATE JOB STATUS ───────────────────────────────────────────────
  const updateStatus = async (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    if (newStatus === "completed") {
      speak("Job completed. Great work!");
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        setTracking(false);
      }
    }
    if (appId) {
      try {
        await updateApplicationStatus(appId, newStatus);
      } catch {}
    }
  };

  // ─── CLEANUP ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ─── INVALID PARAMS CHECK ─────────────────────────────────────────────
  if (isNaN(destLat) || isNaN(destLng)) {
    return (
      <div className="p-10 text-center">
        <h2>❌ Invalid job location</h2>
        <p>No coordinates found. Go back and accept a job first.</p>
      </div>
    );
  }

  const currentStatus = STATUS_LABELS[status];
  const distToJob = workerPos
    ? haversine(workerPos.lat, workerPos.lng, dest.lat, dest.lng).toFixed(2)
    : null;

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa]">

      {/* ── TOP STATUS BAR ── */}
      <div className={`text-white py-3 px-5 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.15)] z-[500] shrink-0 ${currentStatus.solid}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-[24px]">{currentStatus.icon}</span>
          <div>
            <div className="font-bold text-[16px]">{currentStatus.label}</div>
            {routeInfo && (
              <div className="text-[12px] opacity-90">
                {routeInfo.distKm} km away · ETA {eta || `~${routeInfo.timeMin} min`}
              </div>
            )}
          </div>
        </div>
        {routeLoading && (
          <div className="text-[12px] opacity-80">Updating route…</div>
        )}
      </div>

      {/* ── NEXT INSTRUCTION BANNER ── */}
      {nextStep && tracking && status !== "completed" && (
        <div className="bg-[#1a1a2e] text-white py-2.5 px-5 text-[14px] flex items-center gap-2.5 shrink-0">
          <span className="text-[20px]">🗣️</span>
          <span>{nextStep}</span>
        </div>
      )}

      {/* ── MAP ── */}
      <div className="flex-1 relative min-h-[0px]">
        <MapContainer
          center={workerPos ? [workerPos.lat, workerPos.lng] : [destLat, destLng]}
          zoom={14}
          className="h-full w-full"
          whenReady={() => setMapReady(true)}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &amp; CARTO'
          />

          {/* Destination marker */}
          <Marker position={[destLat, destLng]} icon={destIcon}>
            <Popup>
              <b>📍 Job Location</b><br />{address}
            </Popup>
          </Marker>

          {/* Worker marker */}
          {workerPos && (
            <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon}>
              <Popup>👷‍♂️ You are here</Popup>
            </Marker>
          )}

          {/* Route polyline */}
          {routeCoords.length > 0 && (
            <>
              {/* Outer glow line */}
              <Polyline
                positions={routeCoords}
                color="#006491"
                weight={10}
                opacity={0.25}
              />
              {/* Main route line */}
              <Polyline
                positions={routeCoords}
                color="#006491"
                weight={5}
                opacity={0.9}
                dashArray={status === "arrived" ? "8 4" : null}
              />
            </>
          )}

          {workerPos && <FollowWorker pos={workerPos} />}
        </MapContainer>

        {/* Zoom controls — custom position */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
          {/* Google Maps button */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`}
            target="_blank"
            rel="noreferrer"
            className="bg-white border border-[#dddddd] rounded-lg py-2 px-3 text-[12px] font-semibold text-[#1a73e8] no-underline block text-center shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          >
            🗺️ Google Maps
          </a>
        </div>
      </div>

      {/* ── BOTTOM UBER-STYLE CARD ── */}
      <div className="bg-white rounded-tl-3xl rounded-tr-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pt-5 px-5 pb-8 shrink-0 z-[500]">

        {/* Handle bar */}
        <div className="w-10 h-1 bg-[#e0e0e0] rounded-sm mt-0 mx-auto mb-4" />

        {/* Destination info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[20px] shrink-0">📍</div>
          <div className="flex-1">
            <div className="font-bold text-[15px] text-[#1a1a1a]">
              {address}
            </div>
            {distToJob && (
              <div className="text-[13px] text-gray-500 mt-0.5">
                {distToJob} km from your location
                {routeInfo && ` · ~${routeInfo.timeMin} min`}
              </div>
            )}
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between mb-5 py-3 px-0">
          {STATUS_STEPS.map((step, i) => {
            const stepIndex    = STATUS_STEPS.indexOf(status);
            const isDone       = i <= stepIndex;
            const isCurrent    = i === stepIndex;
            const info         = STATUS_LABELS[step];
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-all duration-300 ${isDone ? info.solid : "bg-gray-200"} ${isCurrent ? info.ring : ""}`}>
                    {isDone ? info.icon : "○"}
                  </div>
                  <div className={`text-[10px] mt-1 text-center leading-[1.2] ${isCurrent ? "font-bold" : "font-normal"} ${isDone ? info.text : "text-gray-400"}`}>
                    {info.label.split(" ").map((w, j) => <div key={j}>{w}</div>)}
                  </div>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 transition-[background] duration-300 ${i < STATUS_STEPS.indexOf(status) ? "bg-brand" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {!tracking && status === "accepted" && (
          <button
            onClick={startTracking}
            className="w-full py-4 px-0 bg-brand text-white rounded-[14px] text-[16px] font-bold cursor-pointer shadow-[0_4px_16px_rgba(0,100,145,0.35)]"
          >
            🚀 Start Navigation
          </button>
        )}

        {tracking && status === "on_the_way" && arrived && (
          <button
            onClick={() => updateStatus("arrived")}
            className="w-full py-4 px-0 bg-emerald-500 text-white rounded-[14px] text-[16px] font-bold cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.35)]"
          >
            📍 I Have Arrived
          </button>
        )}

        {tracking && status === "on_the_way" && !arrived && (
          <div className="w-full py-3.5 px-0 bg-sky-50 border-2 border-brand rounded-[14px] text-center text-[14px] text-brand font-semibold">
            🛣️ Navigating to job…
          </div>
        )}

        {status === "arrived" && (
          <button
            onClick={() => updateStatus("completed")}
            className="w-full py-4 px-0 bg-violet-500 text-white rounded-[14px] text-[16px] font-bold cursor-pointer shadow-[0_4px_16px_rgba(139,92,246,0.35)]"
          >
            🎉 Mark Job as Completed
          </button>
        )}

        {status === "completed" && (
          <div className="text-center py-4 px-0 bg-green-50 rounded-[14px] border-2 border-emerald-500">
            <div className="text-[28px]">🎉</div>
            <div className="font-bold text-emerald-800 text-[16px]">
              Job Completed!
            </div>
            <div className="text-[13px] text-gray-500 mt-1">
              The employer will rate your work shortly.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}