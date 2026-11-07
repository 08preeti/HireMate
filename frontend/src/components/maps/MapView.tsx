"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useL } from "@/hooks/useL";
import type { LatLngTuple, MapMarker, MarkerKind } from "@/types";

const ICON_HTML: Record<MarkerKind, string> = {
  worker: `<div class="flex h-[40px] w-[40px] items-center justify-center rounded-full border-[3px] border-white bg-brand text-[18px] shadow-[0_2px_12px_rgba(0,100,145,0.5)]">🚗</div>`,
  workerStale: `<div class="flex h-[40px] w-[40px] items-center justify-center rounded-full border-[3px] border-white bg-slate-400 text-[18px] opacity-80 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">🚗</div>`,
  destination: `<div class="flex h-[40px] w-[40px] items-center justify-center rounded-full border-[3px] border-white bg-danger text-[18px] shadow-[0_2px_12px_rgba(232,0,42,0.5)]">📍</div>`,
  pin: `<div class="flex h-[40px] w-[40px] items-center justify-center rounded-full border-[3px] border-white bg-emerald-500 text-[18px] shadow-[0_2px_12px_rgba(16,185,129,0.5)]">📌</div>`,
};

const iconCache = new Map<MarkerKind, L.DivIcon>();
function iconFor(kind: MarkerKind): L.DivIcon {
  let icon = iconCache.get(kind);
  if (!icon) {
    icon = L.divIcon({ html: ICON_HTML[kind], className: "", iconSize: [40, 40], iconAnchor: [20, kind === "destination" || kind === "pin" ? 38 : 20], popupAnchor: [0, -34] });
    iconCache.set(kind, icon);
  }
  return icon;
}

/** Fits all markers into view on first render and whenever `focusKey` changes; afterwards it only re-fits when a marker would leave the screen. */
function Focus({ points, focusKey }: { points: LatLngTuple[]; focusKey?: string | number }) {
  const map = useMap();
  const lastKey = useRef<string | number | undefined>(undefined);
  const fitted = useRef(false);
  const signature = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (!points.length) return;
    const refit = !fitted.current || lastKey.current !== focusKey;
    const outside = points.some((p) => !map.getBounds().pad(-0.1).contains(p));
    if (!refit && !outside) return;
    fitted.current = true;
    lastKey.current = focusKey;
    if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 16), { animate: true });
    else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 17, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, focusKey, map]);
  return null;
}

interface Props {
  center: LatLngTuple;
  markers: MapMarker[];
  route?: LatLngTuple[];
  focusKey?: string | number;
  className?: string;
}

export default function MapView({ center, markers, route, focusKey, className = "h-full w-full" }: Props) {
  const { L: t } = useL();
  const [tileKey, setTileKey] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);
  const points = useMemo(() => markers.map((m) => m.position), [markers]);
  const tilesDown = tileErrors >= 4;

  return (
    <div className="relative isolate h-full w-full">
      <MapContainer center={center} zoom={15} scrollWheelZoom className={className}>
        <TileLayer
          key={tileKey}
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          eventHandlers={{ tileerror: () => setTileErrors((n) => n + 1), tileload: () => setTileErrors(0) }}
        />
        {route && route.length > 1 && (
          <>
            <Polyline positions={route} pathOptions={{ color: "#006491", weight: 10, opacity: 0.25 }} />
            <Polyline positions={route} pathOptions={{ color: "#006491", weight: 5, opacity: 0.9 }} />
          </>
        )}
        {markers.map((m) => (
          <Marker key={m.id} position={m.position} icon={iconFor(m.kind)}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        <Focus points={points} focusKey={focusKey} />
      </MapContainer>

      {tilesDown && (
        <div role="alert" className="absolute inset-x-3 bottom-3 z-[500] flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 shadow">
          <span>{t("Map images could not be loaded. Check your internet connection.", "मैप की तस्वीरें लोड नहीं हो सकीं। इंटरनेट कनेक्शन जाँचें।", "नकाशाची चित्रे लोड होऊ शकली नाहीत. इंटरनेट कनेक्शन तपासा.")}</span>
          <button type="button" onClick={() => { setTileErrors(0); setTileKey((k) => k + 1); }} className="shrink-0 cursor-pointer rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold">
            {t("Retry", "फिर कोशिश करें", "पुन्हा प्रयत्न करा")}
          </button>
        </div>
      )}
    </div>
  );
}
