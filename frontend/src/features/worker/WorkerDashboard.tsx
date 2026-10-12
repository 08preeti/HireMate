"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { fixLeafletIcons } from "@/lib/leaflet";
import { haversine } from "@/lib/geo";
import { speak } from "@/lib/speech";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { updateApplicationStatus } from "@/services/applications";
import { acceptJob as acceptJobRequest, getJobAlerts, getJobHistory } from "@/services/workers";
import type { Translations } from "@/i18n/translations";
import type { Application, ApplicationStatus, Job, Language, LatLng, RouteResult } from "@/types";


fixLeafletIcons();

const workerIcon = new L.DivIcon({
  html: `<div class="w-[42px] h-[42px] rounded-full bg-brand border-[3px] border-white shadow-[0_3px_12px_rgba(0,100,145,.5)] flex items-center justify-center text-[20px]">🚗</div>`,
  iconSize: [42, 42], iconAnchor: [21, 21], className: "",
});
const jobIcon = new L.DivIcon({
  html: `<div class="w-[42px] h-[42px] rounded-full bg-danger border-[3px] border-white shadow-[0_3px_12px_rgba(232,0,42,.5)] flex items-center justify-center text-[20px]">📍</div>`,
  iconSize: [42, 42], iconAnchor: [21, 42], className: "",
});

function FollowWorker({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  const prev = useRef<LatLng | null>(null);
  useEffect(() => {
    if (!pos) return;
    const dist = prev.current ? map.distance([prev.current.lat, prev.current.lng], [pos.lat, pos.lng]) : 999;
    if (dist > 30) map.setView([pos.lat, pos.lng], 15, { animate: true, duration: 1 });
    prev.current = pos;
  }, [pos, map]);
  return null;
}


interface OsrmResponse {
  code: string;
  routes: {
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
    legs: { steps: { maneuver: { instruction?: string } }[] }[];
  }[];
}

async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`);
    const d = (await r.json()) as OsrmResponse;
    if (d.code !== "Ok") return null;
    const route = d.routes[0];
    return {
      coords: route.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng]),
      distKm: (route.distance / 1000).toFixed(1),
      timeMin: Math.round(route.duration / 60),
      steps: route.legs[0].steps.map(s => s.maneuver.instruction).filter((x): x is string => Boolean(x)),
    };
  } catch { return null; }
}


interface StatusStyle {
  label: string;
  icon: string;
  solid: string;
  text: string;
  soft: string;
  ring: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, StatusStyle> = {
  // Full Tailwind class names (not built dynamically) so Tailwind can see them.
  accepted:   { label: "Job Accepted", icon: "✅", solid: "bg-brand",       text: "text-brand",       soft: "bg-brand-light", ring: "shadow-[0_0_0_4px_rgba(0,100,145,.19)]" },
  on_the_way: { label: "On the Way",   icon: "🚗", solid: "bg-amber-500",   text: "text-amber-500",   soft: "bg-amber-50",    ring: "shadow-[0_0_0_4px_rgba(245,158,11,.19)]" },
  arrived:    { label: "Arrived",      icon: "📍", solid: "bg-emerald-500", text: "text-emerald-500", soft: "bg-green-50",    ring: "shadow-[0_0_0_4px_rgba(16,185,129,.19)]" },
  completed:  { label: "Completed",    icon: "🎉", solid: "bg-violet-500",  text: "text-violet-500",  soft: "bg-violet-50",   ring: "shadow-[0_0_0_4px_rgba(139,92,246,.19)]" },
};
const STEPS: ApplicationStatus[] = ["accepted", "on_the_way", "arrived", "completed"];

// ══ NAVIGATION MODAL ══════════════════════════════════════════════════════
interface NavModalProps {
  job: Job;
  appId?: string;
  workerPos: LatLng | null;
  onClose: () => void;
  t: Translations;
  language: Language;
}

function NavModal({ job, appId, workerPos, onClose, t, language }: NavModalProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo]     = useState<{ distKm: string; timeMin: number } | null>(null);
  const [status, setStatus]           = useState<ApplicationStatus>("accepted");
  const [nextStep, setNextStep]       = useState("");
  const [eta, setEta]                 = useState("");
  const [arrived, setArrived]         = useState(false);
  const lastFetch  = useRef(0);
  const prevStep   = useRef("");
  const arrivedRef = useRef(false);
  const destRef    = useRef<LatLng>({ lat: job.latitude ?? 0, lng: job.longitude ?? 0 });

  useEffect(() => { arrivedRef.current = arrived; }, [arrived]);

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!workerPos || !destRef.current.lat) return;
    const now = Date.now();
    if (now - lastFetch.current < 8000) return;
    lastFetch.current = now;
    const dest = destRef.current;
    fetchRoute(workerPos, dest).then(result => {
      if (!result) return;
      setRouteCoords(result.coords);
      setRouteInfo({ distKm: result.distKm, timeMin: result.timeMin });
      const arrTime = new Date(); arrTime.setMinutes(arrTime.getMinutes() + result.timeMin);
      setEta(arrTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (result.steps[0] && result.steps[0] !== prevStep.current) {
        speak(result.steps[0]); prevStep.current = result.steps[0]; setNextStep(result.steps[0]);
      }
      if (haversine(workerPos.lat, workerPos.lng, dest.lat, dest.lng) < 0.08 && !arrivedRef.current) {
        arrivedRef.current = true; setArrived(true); speak("You have arrived at the job location.");
      }
    });
  }, [workerPos]);

  const updateStatus = async (s: ApplicationStatus) => {
    setStatus(s);
    if (s === "on_the_way") speak("Navigation started.");
    if (s === "completed")  speak("Job completed. Great work!");
    if (appId) {
      await updateApplicationStatus(appId, s).catch(() => {});
    }
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#f8f9fa]">
      {/* Top bar */}
      <div className={`text-white py-3 px-4 shrink-0 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,.2)] ${cfg.solid}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-[24px]">{cfg.icon}</span>
          <div>
            <div className="font-bold text-[16px]">{cfg.label}</div>
            {routeInfo && <div className="text-[12px] opacity-90">{routeInfo.distKm} km · ETA {eta || `~${routeInfo.timeMin} min`}</div>}
          </div>
        </div>
        <button onClick={() => status === "completed" ? onClose() : setConfirmClose(true)} className="bg-[rgba(255,255,255,.2)] text-white rounded-lg py-1.5 px-3.5 cursor-pointer font-semibold">✕</button>
      </div>

      {/* Voice instruction */}
      {nextStep && status === "on_the_way" && (
        <div className="bg-[#1a1a2e] text-white py-2.5 px-4 text-[13px] flex gap-2 items-center shrink-0">
          <span className="text-[18px]">🗣️</span><span>{nextStep}</span>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-[0px] relative">
        <MapContainer center={workerPos ? [workerPos.lat, workerPos.lng] : [destRef.current.lat, destRef.current.lng]} zoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {destRef.current.lat && <Marker position={[destRef.current.lat, destRef.current.lng]} icon={jobIcon}><Popup>{job.location?.en}</Popup></Marker>}
          {workerPos && <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon}><Popup>🚗 You</Popup></Marker>}
          {routeCoords.length > 0 && <>
            <Polyline positions={routeCoords} color="#006491" weight={10} opacity={0.2} />
            <Polyline positions={routeCoords} color="#006491" weight={5} opacity={0.95} />
          </>}
          {workerPos && <FollowWorker pos={workerPos} />}
        </MapContainer>

        {/* Call employer + Google Maps */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          {job.contactInfo && (
            <a href={`tel:${job.contactInfo}`} className="bg-emerald-500 text-white rounded-lg py-2 px-3 text-[13px] font-bold no-underline text-center shadow-[0_2px_8px_rgba(0,0,0,.15)]">
              📞 {t.call}
            </a>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${destRef.current.lat},${destRef.current.lng}`} target="_blank" rel="noreferrer"
            className="bg-white border border-[#dddddd] rounded-lg py-[7px] px-3 text-[12px] font-semibold text-[#1a73e8] no-underline shadow-[0_2px_8px_rgba(0,0,0,.1)]">
            {t.googleMaps}
          </a>
        </div>
      </div>

      {/* Bottom card */}
      <div className="bg-white rounded-tl-3xl rounded-tr-3xl shadow-[0_-4px_24px_rgba(0,0,0,.12)] pt-4 px-5 pb-7 shrink-0">
        <div className="w-10 h-1 bg-[#e0e0e0] rounded-sm mt-0 mx-auto mb-3.5" />

        {/* Job info */}
        <div className="flex gap-3 mb-3.5 items-start">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center text-[22px] shrink-0">💼</div>
          <div className="flex-1">
            <div className="font-bold text-[15px]">{job.jobTitle?.en}</div>
            <div className="text-[13px] text-gray-500 mt-0.5">{job.location?.en}</div>
            {routeInfo && <div className="text-[12px] text-brand mt-0.5 font-semibold">{routeInfo.distKm} km · ~{routeInfo.timeMin} min</div>}
          </div>
          <div className="text-right">
            <div className="font-bold text-[16px] text-danger">₹{job.salary}</div>
            <div className="text-[11px] text-[#888888]">{job.paymentMethod}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-4">
          {STEPS.map((step, i) => {
            const done = i <= STEPS.indexOf(status);
            const cur  = step === status;
            const sc   = STATUS_CONFIG[step];
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-[3px]">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all duration-300 ${done ? sc.solid : "bg-gray-200"} ${cur ? sc.ring : ""}`}>{done ? sc.icon : "○"}</div>
                  <div className={`text-[9px] text-center leading-[1.2] max-w-[52px] ${cur ? "font-bold" : "font-normal"} ${done ? sc.text : "text-gray-400"}`}>{sc.label}</div>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-4 transition-[background] duration-300 ${i < STEPS.indexOf(status) ? "bg-brand" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {status === "accepted" && (
          <button onClick={() => updateStatus("on_the_way")} className="w-full py-[15px] px-0 bg-brand text-white rounded-[14px] text-[16px] font-bold cursor-pointer shadow-[0_4px_16px_rgba(0,100,145,.35)]">
            {t.startNavigation}
          </button>
        )}
        {status === "on_the_way" && !arrived && (
          <div className="w-full p-3.5 bg-sky-50 border-2 border-brand rounded-[14px] text-center text-[14px] text-brand font-semibold">
            {t.navigating}
          </div>
        )}
        {status === "on_the_way" && arrived && (
          <button onClick={() => updateStatus("arrived")} className="w-full py-[15px] px-0 bg-emerald-500 text-white rounded-[14px] text-[16px] font-bold cursor-pointer">
            {t.iHaveArrived}
          </button>
        )}
        {status === "arrived" && (
          <button onClick={() => updateStatus("completed")} className="w-full py-[15px] px-0 bg-violet-500 text-white rounded-[14px] text-[16px] font-bold cursor-pointer">
            {t.markCompleted}
          </button>
        )}
        {status === "completed" && (
          <div className="text-center p-4 bg-green-50 rounded-[14px] border-2 border-emerald-500">
            <div className="text-[28px]">🎉</div>
            <div className="font-bold text-emerald-800 text-[16px]">{t.jobCompleted}</div>
            <div className="text-[12px] text-gray-500 mt-1">{t.employerWillRate}</div>
            <button onClick={onClose} className="mt-2.5 py-2 px-5 bg-brand text-white rounded-lg cursor-pointer text-[13px]">{t.backToDashboard}</button>
          </div>
        )}
      </div>
      {/* Confirm close dialog */}
      {confirmClose && (
        <div className="absolute inset-0 bg-[rgba(0,0,0,.6)] flex items-center justify-center z-[99999] p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] text-center">
            <div className="text-[36px] mb-3">⚠️</div>
            <div className="font-bold text-[16px] mb-2">
              {language === "hi" ? "नेविगेशन बंद करें?" : "Close Navigation?"}
            </div>
            <div className="text-[13px] text-gray-500 mb-5 leading-normal">
              {language === "hi" ? "अगर आप बंद करते हैं तो रूट खो जाएगा।" : "If you close, you will lose your route and directions."}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmClose(false)} className="flex-1 py-[11px] px-0 bg-gray-100 rounded-[10px] font-semibold cursor-pointer text-[14px]">
                {language === "hi" ? "वापस जाएं" : "Keep Going"}
              </button>
              <button onClick={() => { setConfirmClose(false); onClose(); }} className="flex-1 py-[11px] px-0 bg-danger text-white rounded-[10px] font-bold cursor-pointer text-[14px]">
                {language === "hi" ? "बंद करें" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══ MAIN DASHBOARD ════════════════════════════════════════════════════════
export default function WorkerDashboard() {
  const { language }              = useLanguage();
  const t                         = translations[language];
  const [alerts, setAlerts]       = useState<Job[]>([]);
  const [jobs, setJobs]           = useState<Application[]>([]);
  const [workerPos, setWorkerPos] = useState<LatLng | null>(null);
  const [gpsOn, setGpsOn]         = useState(false);
  const [activeNav, setActiveNav] = useState<{ job: Job; appId?: string } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const watchRef                  = useRef<number | null>(null);

  const { worker } = useAuth();

  // Earnings calculation
  const todayEarnings = jobs
    .filter(j => j.isCompleted && new Date(j.updatedAt ?? 0).toDateString() === new Date().toDateString())
    .reduce((sum, j) => sum + Number(j.job?.salary || 0), 0);
  const weekEarnings = jobs
    .filter(j => j.isCompleted && (Date.now() - new Date(j.updatedAt ?? 0).getTime()) < 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, j) => sum + Number(j.job?.salary || 0), 0);
  const totalJobs = jobs.filter(j => j.isCompleted).length;

  const enableGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    setGpsOn(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setWorkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  };

  useEffect(() => () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); }, []);

  useEffect(() => {
    if (!worker || !workerPos) return;
    getJobAlerts(workerPos.lat, workerPos.lng)
      .then(d => setAlerts(Array.isArray(d) ? d : [])).catch(() => {});
    getJobHistory(worker._id)
      .then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [worker, workerPos]);

  const acceptJob = async (job: Job) => {
    if (!worker) return;
    setAcceptingId(job._id);
    try {
      const data = await acceptJobRequest(worker._id, job._id);
      setActiveNav({ job, appId: data.applicationId });
    } catch (err) {
      alert(err instanceof ApiError ? err.message || "Could not accept job" : "Server error");
    }
        finally { setAcceptingId(null); }
  };

  if (!worker) return (
    <div className="p-10 text-center font-plain">
      <div className="text-[48px] mb-4">👷</div>
      <div className="font-bold text-[18px] mb-3">
        {language === "hi" ? "लॉगिन करें या रजिस्टर करें" : language === "mr" ? "लॉगिन किंवा नोंदणी करा" : "Please Login or Register"}
      </div>
      <a href="/worker-login" className="inline-block bg-brand text-white py-3 px-7 rounded-xl no-underline font-bold text-[16px]">
        {language === "hi" ? "लॉगिन करें" : language === "mr" ? "लॉगिन करा" : "Login / Register"}
      </a>
    </div>
  );

  return (
    <>
      {activeNav && (
        <NavModal
          job={activeNav.job} appId={activeNav.appId}
          workerPos={workerPos} onClose={() => setActiveNav(null)} t={t} language={language}
        />
      )}

      <div className="max-w-[680px] my-0 mx-auto py-6 px-4 font-plain">

        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#006491,#004f73)] text-white rounded-2xl py-5 px-6 mb-5 shadow-[0_4px_20px_rgba(0,100,145,.3)]">
          <div className="text-[20px] font-bold">{t.workerDashboardTitle}</div>
          <div className="text-[14px] opacity-[0.85] mt-1">{t.welcome}, <b>{worker.name}</b></div>
          {gpsOn && workerPos && (
            <div className="mt-2.5 bg-[rgba(255,255,255,.15)] rounded-lg py-[5px] px-3 text-[12px] inline-flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
              {t.liveActive}
            </div>
          )}
        </div>

        {/* ── EARNINGS TRACKER ─────────────────────────── */}
        <div className="bg-white rounded-2xl py-4 px-5 mb-5 shadow-[0_2px_12px_rgba(0,0,0,.08)]">
          <div className="text-[14px] font-bold mb-3 text-gray-700">
            💰 {language === "hi" ? "मेरी कमाई" : language === "mr" ? "माझी कमाई" : "My Earnings"}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: language === "hi" ? "आज" : language === "mr" ? "आज" : "Today",   value: `₹${todayEarnings}`, text: "text-emerald-500", soft: "bg-green-50" },
              { label: language === "hi" ? "इस हफ्ते" : language === "mr" ? "या आठवड्यात" : "This Week", value: `₹${weekEarnings}`, text: "text-brand", soft: "bg-brand-light" },
              { label: language === "hi" ? "कुल काम" : language === "mr" ? "एकूण काम" : "Total Jobs",  value: totalJobs, text: "text-violet-500", soft: "bg-violet-50" },
            ].map(s => (
              <div key={s.label} className={`text-center rounded-xl py-3 px-1.5 ${s.soft}`}>
                <div className={`text-[20px] font-extrabold ${s.text}`}>{s.value}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* GPS button */}
        {!gpsOn && (
          <button onClick={enableGPS} className="w-full p-3.5 mb-5 bg-brand text-white rounded-xl text-[15px] font-semibold cursor-pointer shadow-[0_4px_14px_rgba(0,100,145,.3)] flex items-center justify-center gap-2">
            {t.enableLocationFull}
          </button>
        )}

        {/* Job Alerts */}
        <div className="mb-6">
          <div className="text-[17px] font-bold mb-3 flex items-center gap-1.5">
            🔔 {t.newJobsNear}
            {alerts.length > 0 && <span className="bg-danger text-white rounded-xl py-0.5 px-2 text-[12px]">{alerts.length}</span>}
          </div>

          {!gpsOn && (
            <div className="bg-[#f8f9fa] rounded-xl p-6 text-center text-[#888888]">
              <div className="text-[36px] mb-2">📍</div>
              <div className="font-semibold">{t.enableToSee}</div>
            </div>
          )}

          {gpsOn && alerts.length === 0 && (
            <div className="bg-[#f8f9fa] rounded-xl p-6 text-center text-[#888888]">
              <div className="text-[36px] mb-2">🔍</div>
              <div className="font-semibold">{t.noJobsNearby}</div>
              <div className="text-[12px] mt-1"><a href="/jobs" className="text-brand">{t.browseJobs}</a></div>
            </div>
          )}

          {alerts.map(job => {
            const dist = workerPos && job.latitude && job.longitude
              ? haversine(workerPos.lat, workerPos.lng, job.latitude, job.longitude).toFixed(1) : null;
            return (
              <div key={job._id} className="bg-white rounded-2xl mb-3 shadow-[0_2px_12px_rgba(0,0,0,.08)] overflow-hidden border border-[#f0f0f0]">
                {job.isUrgent && <div className="bg-danger text-white py-1 px-3 text-[12px] font-bold">🚨 {t.urgent}</div>}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <div className="font-bold text-[16px]">{job.jobTitle?.[language] || job.jobTitle?.en}</div>
                      <div className="text-[13px] text-gray-500 mt-0.5">📍 {job.location?.[language] || job.location?.en}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-[18px] text-danger">₹{job.salary}</div>
                      <div className="text-[11px] text-[#888888]">{job.paymentMethod}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap mb-3">
                    {dist && <span className="bg-brand-light text-brand rounded-[20px] py-[3px] px-2.5 text-[12px] font-semibold">📏 {dist} {t.kmAway}</span>}
                    {job.skills?.[language] && <span className="bg-gray-100 text-gray-700 rounded-[20px] py-[3px] px-2.5 text-[12px]">🛠️ {job.skills[language]}</span>}
                  </div>

                  {/* Accept + Call buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptJob(job)}
                      disabled={!!acceptingId}
                      className={`flex-1 py-[13px] px-0 text-white rounded-xl text-[15px] font-bold ${acceptingId === job._id ? "bg-gray-400" : "bg-brand"} ${acceptingId ? "cursor-not-allowed shadow-none" : "cursor-pointer shadow-[0_4px_14px_rgba(0,100,145,.3)]"}`}
                    >
                      {acceptingId === job._id ? t.accepting : t.acceptNavigate}
                    </button>
                    {job.contactInfo && (
                      <a href={`tel:${job.contactInfo}`} className="py-[13px] px-4 bg-emerald-500 text-white rounded-xl font-bold text-[18px] no-underline flex items-center justify-center">
                        📞
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Job History */}
        <div>
          <div className="text-[17px] font-bold mb-3">📋 {t.jobHistory}</div>
          {jobs.length === 0 ? (
            <div className="bg-[#f8f9fa] rounded-xl p-6 text-center text-[#888888]">
              <div className="text-[36px] mb-2">📂</div>
              <div className="font-semibold">{t.noJobsYet}</div>
            </div>
          ) : jobs.map(j => {
            const sc = (j.status && STATUS_CONFIG[j.status]) || STATUS_CONFIG.accepted;
            return (
              <div key={j._id} className="bg-white rounded-[14px] py-3.5 px-4 mb-2.5 shadow-[0_2px_8px_rgba(0,0,0,.06)] flex justify-between items-center border border-[#f0f0f0]">
                <div>
                  <div className="font-semibold text-[14px]">{j.job?.jobTitle?.[language] || j.job?.jobTitle?.en}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">{j.job?.location?.[language] || j.job?.location?.en}</div>
                  <div className="text-[12px] text-brand mt-0.5 font-semibold">₹{j.job?.salary}</div>
                </div>
                <div className="text-right">
                  <div className={`rounded-[20px] py-1 px-2.5 text-[12px] font-semibold ${sc.soft} ${sc.text}`}>{sc.icon} {sc.label}</div>
                  {j.isCompleted && j.rating && <div className="text-[12px] mt-1">⭐ {j.rating}/5</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}