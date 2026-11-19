"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useL } from "@/hooks/useL";
import type { LatLngTuple, MapMarker, MapTheme, MarkerKind } from "@/types";

/** Generates modern Uber-style DivIcons with heading rotation and glowing radar accents. */
function iconForMarker(m: MapMarker): L.DivIcon {
  if (m.kind === "worker" || m.kind === "workerStale") {
    const heading = m.heading ?? 0;
    const speed = m.speed ?? null;
    const isStale = m.kind === "workerStale";
    const bg = isStale ? "bg-slate-700" : "bg-[#0b132b]";
    const border = isStale ? "border-slate-400" : "border-[#00e5ff]";
    const speedHtml =
      speed && speed > 2
        ? `<div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; border-radius: 6px; background: rgba(0,0,0,0.85); padding: 1px 5px; font-size: 10px; font-weight: 800; color: #fff; font-family: monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">${speed} km/h</div>`
        : "";
    const pingHtml = !isStale
      ? `<div style="position: absolute; width: 50px; height: 50px; border-radius: 9999px; background: rgba(0,229,255,0.22); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`
      : "";

    return L.divIcon({
      className: "uber-worker-marker",
      html: `
        <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
          ${pingHtml}
          <div class="${bg} ${border}" style="position: relative; width: 40px; height: 40px; border-radius: 9999px; border-width: 2.5px; border-style: solid; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.5);">
            <div style="transform: rotate(${heading}deg); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #00e5ff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
                <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#00e5ff" fill-opacity="0.9"></polygon>
              </svg>
            </div>
          </div>
          ${speedHtml}
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -26],
    });
  }

  if (m.kind === "destination" || m.kind === "pin") {
    const labelHtml = m.label
      ? `<div style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); white-space: nowrap; border-radius: 9999px; background: #0b132b; border: 1.5px solid #334155; padding: 2px 9px; font-size: 11px; font-weight: 800; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); pointer-events: none;">${m.label}</div>`
      : "";

    return L.divIcon({
      className: "uber-dest-marker",
      html: `
        <div style="position: relative; width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center;">
          ${labelHtml}
          <div style="width: 38px; height: 38px; border-radius: 9999px; background: linear-gradient(135deg, #e11d48, #be123c); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(225,29,72,0.5); color: #fff;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3" fill="#fff"></circle>
            </svg>
          </div>
          <div style="width: 4px; height: 9px; background: #be123c; border-bottom-left-radius: 2px; border-bottom-right-radius: 2px;"></div>
        </div>
      `,
      iconSize: [44, 50],
      iconAnchor: [22, 50],
      popupAnchor: [0, -48],
    });
  }

  // Start waypoint
  return L.divIcon({
    className: "uber-start-marker",
    html: `
      <div style="width: 26px; height: 26px; border-radius: 9999px; background: #0f172a; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.35);">
        <div style="width: 8px; height: 8px; border-radius: 9999px; background: #10b981;"></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

const GLIDE_MIN_MS = 800;
const GLIDE_MAX_MS = 6_000;

/**
 * A marker that glides to each new position instead of jumping.
 * Automatically updates its orientation (heading) and speed badge as position changes.
 */
function GlideMarker({ marker }: { marker: MapMarker }) {
  const ref = useRef<L.Marker | null>(null);
  const frame = useRef<number | null>(null);
  const shown = useRef<LatLngTuple>(marker.position);
  const lastUpdate = useRef(0);
  const [lat, lng] = marker.position;

  // Update icon whenever heading, speed, kind or label changes
  useEffect(() => {
    const instance = ref.current;
    if (instance) {
      instance.setIcon(iconForMarker(marker));
    }
  }, [marker.heading, marker.speed, marker.kind, marker.label]);

  useEffect(() => {
    const instance = ref.current;
    if (!instance) return;
    const now = performance.now();
    const from = shown.current;
    const gap = lastUpdate.current ? now - lastUpdate.current : 0;
    lastUpdate.current = now;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (!gap || (from[0] === lat && from[1] === lng)) {
      instance.setLatLng([lat, lng]);
      shown.current = [lat, lng];
      return;
    }
    const duration = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, gap));
    const step = (t: number) => {
      const k = Math.min(1, (t - now) / duration);
      const here: LatLngTuple = [
        from[0] + (lat - from[0]) * k,
        from[1] + (lng - from[1]) * k,
      ];
      instance.setLatLng(here);
      shown.current = here;
      frame.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  }, [lat, lng]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return (
    <Marker ref={ref} position={shown.current} icon={iconForMarker(marker)}>
      {marker.label && <Popup>{marker.label}</Popup>}
    </Marker>
  );
}

/** Fits all markers into view on initial render or when focusKey changes */
function Focus({
  points,
  focusKey,
  disableAutoRefit,
}: {
  points: LatLngTuple[];
  focusKey?: string | number;
  disableAutoRefit?: boolean;
}) {
  const map = useMap();
  const lastKey = useRef<string | number | undefined>(undefined);
  const fitted = useRef(false);
  const signature = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (!points.length) return;
    const keyChanged = lastKey.current !== focusKey;
    const refit = !fitted.current || keyChanged;
    if (!refit) {
      if (disableAutoRefit) return;
      const outside = points.some((p) => !map.getBounds().pad(-0.1).contains(p));
      if (!outside) return;
    }
    fitted.current = true;
    lastKey.current = focusKey;
    if (points.length === 1)
      map.setView(points[0], Math.max(map.getZoom(), 16), { animate: true });
    else
      map.fitBounds(L.latLngBounds(points), {
        padding: [56, 56],
        maxZoom: 17,
        animate: true,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, focusKey, map, disableAutoRefit]);
  return null;
}

/** Automatically follows the worker marker when active, and notifies when user manually pans */
function FollowCamera({
  target,
  enabled,
  onUserPan,
}: {
  target: LatLngTuple | null;
  enabled: boolean;
  onUserPan?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleDrag = () => {
      onUserPan?.();
    };
    map.on("dragstart", handleDrag);
    return () => {
      map.off("dragstart", handleDrag);
    };
  }, [map, onUserPan]);

  useEffect(() => {
    if (!enabled || !target) return;
    map.panTo(target, { animate: true, duration: 0.8 });
  }, [target, enabled, map]);

  return null;
}

interface Props {
  center: LatLngTuple;
  markers: MapMarker[];
  /** The part of the route still to go (drawn strong). */
  route?: LatLngTuple[];
  /** The part already travelled (drawn faded and dashed). */
  routeDone?: LatLngTuple[];
  focusKey?: string | number;
  className?: string;
  theme?: MapTheme;
  followWorker?: boolean;
  onUserPan?: () => void;
}

export default function MapView({
  center,
  markers,
  route,
  routeDone,
  focusKey,
  className = "absolute inset-0 h-full w-full",
  theme = "day",
  followWorker = false,
  onUserPan,
}: Props) {
  const { L: t } = useL();
  const [tileKey, setTileKey] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);
  const points = useMemo(() => markers.map((m) => m.position), [markers]);
  const tilesDown = tileErrors >= 4;

  const workerMarker = useMemo(
    () => markers.find((m) => m.kind === "worker" || m.kind === "workerStale"),
    [markers],
  );

  const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div
      className={`relative isolate h-full min-h-[240px] w-full ${
        theme === "night" ? "bg-[#0b132b] dark-map-tiles" : "bg-slate-100"
      }`}
    >
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom
        className={className}
      >
        <TileLayer
          key={`${tileKey}-${theme}`}
          url={tileUrl}
          attribution={tileAttribution}
          eventHandlers={{
            tileerror: () => setTileErrors((n) => n + 1),
            tileload: () => setTileErrors(0),
          }}
        />

        {/* Traveled route polyline (muted slate) */}
        {routeDone && routeDone.length > 1 && (
          <Polyline
            positions={routeDone}
            pathOptions={{
              color: theme === "night" ? "#475569" : "#94a3b8",
              weight: 5,
              opacity: 0.8,
              dashArray: "3 8",
              lineCap: "round",
            }}
          />
        )}

        {/* Uber Glowing Route Polyline */}
        {route && route.length > 1 && (
          <>
            {/* Dark casing halo underneath */}
            <Polyline
              positions={route}
              pathOptions={{
                color: theme === "night" ? "#0f172a" : "#1e293b",
                weight: 11,
                opacity: 0.45,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Electric cyan glow */}
            <Polyline
              positions={route}
              pathOptions={{
                color: theme === "night" ? "#06b6d4" : "#0284c7",
                weight: 8,
                opacity: 0.55,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Core vibrant path */}
            <Polyline
              positions={route}
              pathOptions={{
                color: theme === "night" ? "#22d3ee" : "#006491",
                weight: 5,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* Markers */}
        {markers.map((m) =>
          m.kind === "worker" || m.kind === "workerStale" ? (
            <GlideMarker key={m.id} marker={m} />
          ) : (
            <Marker key={m.id} position={m.position} icon={iconForMarker(m)}>
              {m.label && <Popup>{m.label}</Popup>}
            </Marker>
          ),
        )}

        <Focus points={points} focusKey={focusKey} disableAutoRefit={followWorker} />
        <FollowCamera
          target={workerMarker ? workerMarker.position : null}
          enabled={followWorker}
          onUserPan={onUserPan}
        />
      </MapContainer>

      {tilesDown && (
        <div
          role="alert"
          className="absolute inset-x-3 bottom-3 z-[500] flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 shadow"
        >
          <span>
            {t(
              "Map images could not be loaded. Check your internet connection.",
              "मैप की तस्वीरें लोड नहीं हो सकीं। इंटरनेट कनेक्शन जाँचें।",
              "नकाशाची चित्रे लोड होऊ शकली नाहीत. इंटरनेट कनेक्शन तपासा.",
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setTileErrors(0);
              setTileKey((k) => k + 1);
            }}
            className="shrink-0 cursor-pointer rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold"
          >
            {t("Retry", "फिर कोशिश करें", "पुन्हा प्रयत्न करा")}
          </button>
        </div>
      )}
    </div>
  );
}
