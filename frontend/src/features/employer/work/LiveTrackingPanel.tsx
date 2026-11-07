"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCrosshair, FiPhone, FiX } from "react-icons/fi";
import MapViewLazy from "@/components/maps/MapViewLazy";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { useWorkerTracking } from "@/hooks/useWorkerTracking";
import { haversine } from "@/lib/geo";
import { clockTime, secondsBetween, STALE_AFTER_MS } from "@/lib/maps";
import type { Application, MapMarker } from "@/types";
import { displayPhone, nameOf, phoneOf } from "../applications/helpers";

const STATUS_KEY: Record<string, EmployerKey> = { confirmed: "badge_confirmed", on_the_way: "badge_onTheWay", arrived: "badge_arrived" };

type View = "live" | "offline" | "waiting" | "notSharing" | "ended" | "unknown";

const TONE: Record<View, string> = {
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  offline: "bg-amber-50 text-amber-800 border-amber-200",
  waiting: "bg-sky-50 text-sky-700 border-sky-200",
  notSharing: "bg-slate-100 text-slate-600 border-slate-200",
  ended: "bg-slate-100 text-slate-600 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};
const LABEL: Record<View, EmployerKey> = { live: "lt_live", offline: "lt_offline", waiting: "lt_waiting", notSharing: "lt_notSharing", ended: "lt_ended", unknown: "lt_waiting" };

interface Props {
  apps: Application[];
  initialId: string;
  onClose: () => void;
}

export default function LiveTrackingPanel({ apps, initialId, onClose }: Props) {
  const { tr, loc } = useEmployerT();
  const [selectedId, setSelectedId] = useState(initialId);
  const [focusKey, setFocusKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const { data, problem, loading, receivedAt } = useWorkerTracking(selectedId);

  const app = apps.find((a) => a._id === selectedId);
  const name = app ? nameOf(app) : tr("lt_worker");
  const phone = app ? phoneOf(app) : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearInterval(tick);
    };
  }, [onClose]);

  useEffect(() => setFocusKey((k) => k + 1), [selectedId]);

  const location = data?.location ?? null;
  const serverNow = data ? Date.parse(data.serverTime) + (now - receivedAt) : now;
  const updatedMs = location?.updatedAt ? Date.parse(location.updatedAt) : NaN;
  const ageSec = Number.isFinite(updatedMs) ? secondsBetween(serverNow, updatedMs) : null;
  const stale = ageSec !== null && ageSec * 1000 > STALE_AFTER_MS;

  let view: View = "unknown";
  if (data) {
    if (data.sharing === "ended") view = "ended";
    else if (data.sharing === "not_enabled") view = "notSharing";
    else if (!location) view = "waiting";
    else view = stale ? "offline" : "live";
  }

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (data?.destination) out.push({ id: "dest", kind: "destination", position: [data.destination.lat, data.destination.lng], label: loc(app?.job?.location) || tr("lt_site") });
    if (location) out.push({ id: "worker", kind: stale ? "workerStale" : "worker", position: [location.lat, location.lng], label: name });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.destination?.lat, data?.destination?.lng, location?.lat, location?.lng, stale, name]);

  const ago = (s: number) => (s < 60 ? tr("lt_secondsAgo", { n: s }) : s < 3600 ? tr("lt_minutesAgo", { n: Math.floor(s / 60) }) : tr("lt_hoursAgo", { n: Math.floor(s / 3600) }));
  const km = location && data?.destination ? haversine(location.lat, location.lng, data.destination.lat, data.destination.lng) : null;

  let message = "";
  if (problem === "forbidden") message = tr("lt_msgForbidden");
  else if (view === "notSharing") message = tr("lt_msgNotEnabled", { name });
  else if (view === "waiting") message = tr("lt_msgWaiting", { name });
  else if (view === "offline" && ageSec !== null) message = tr("lt_msgStale", { name, n: Math.max(1, Math.floor(ageSec / 60)) });
  else if (view === "ended") message = tr("lt_msgEnded");
  else if (data && !data.destination && !location) message = tr("lt_msgNoDest");
  const connection = problem === "network" ? tr("lt_msgNetwork") : problem === "failed" ? tr("lt_msgFailed") : "";

  const workStatusKey = data ? (data.completionRequested ? "aw_requested" : STATUS_KEY[data.status]) : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={tr("lt_title")} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-[1100px] flex-col overflow-hidden bg-white shadow-2xl sm:h-[90vh] sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="m-0 text-[18px] font-extrabold text-[#0F1F4B]">{tr("lt_title")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("lt_close")} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><FiX /></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label={tr("lt_workers")} className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 p-3 md:w-[250px] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            <div className="hidden px-1 text-[12px] font-bold uppercase tracking-wider text-slate-500 md:block">{tr("lt_workers")}</div>
            {apps.map((a) => (
              <button key={a._id} type="button" aria-current={a._id === selectedId} onClick={() => setSelectedId(a._id)} className={`flex min-w-[170px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left md:min-w-0 ${a._id === selectedId ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.locationConsent ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-slate-900">{nameOf(a)}</span>
                  <span className="block truncate text-[12.5px] text-slate-500">{loc(a.job?.jobTitle)}</span>
                </span>
              </button>
            ))}
          </nav>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 mr-1 text-[16px] font-bold text-slate-900">{name}</h3>
                <span role="status" className={`rounded-md border px-2 py-0.5 text-[12.5px] font-semibold ${TONE[view]}`}>
                  {view === "live" && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 align-middle" aria-hidden="true" />}
                  {tr(LABEL[view])}
                </span>
                {workStatusKey && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12.5px] font-semibold text-slate-700">{tr("lt_workStatus")}: {tr(workStatusKey)}</span>}
                {phone && <a href={`tel:${phone}`} aria-label={`${tr("aw_call")} ${displayPhone(phone)}`} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-700 no-underline hover:bg-slate-50"><FiPhone /> {tr("aw_call")}</a>}
              </div>

              {location && ageSec !== null && (
                <p className="m-0 text-[13px] text-slate-600">
                  {tr("lt_lastUpdate")}: <b>{clockTime(updatedMs, true)}</b> · {ago(ageSec)}
                  {location.accuracy != null && <> · {tr("lt_accuracy", { n: location.accuracy })}</>}
                  {km !== null && <> · {tr("lt_distance", { n: km.toFixed(1) })}</>}
                </p>
              )}
              {message && <p role={problem === "forbidden" ? "alert" : undefined} className={`m-0 rounded-lg border px-3 py-2 text-[13.5px] ${TONE[problem === "forbidden" ? "offline" : view]}`}>{message}</p>}
              {connection && <p role="alert" className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13.5px] text-amber-900">{connection}</p>}
            </div>

            <div className="relative min-h-[260px] flex-1 bg-slate-50">
              {markers.length > 0 ? (
                <>
                  <MapViewLazy center={markers[markers.length - 1].position} markers={markers} focusKey={focusKey} />
                  <button type="button" onClick={() => setFocusKey((k) => k + 1)} className="absolute right-3 top-3 z-[500] flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow hover:bg-slate-50"><FiCrosshair /> {tr("lt_recenter")}</button>
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-[14px] text-slate-500">{loading ? "…" : message || connection || tr("lt_msgNoDest")}</div>
              )}
            </div>

            {view === "live" || view === "offline" ? <p className="m-0 border-t border-slate-200 px-4 py-2 text-[12.5px] text-slate-500">{tr("lt_privacy", { name })}</p> : null}
          </main>
        </div>
      </div>
    </div>
  );
}
