"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FiArrowRight, FiBriefcase, FiCalendar, FiCheckCircle, FiCpu, FiCreditCard, FiFileText, FiFolder, FiHeadphones, FiMapPin, FiPhoneCall, FiStar, FiTool, FiZap } from "react-icons/fi";
import { HERO_PEOPLE } from "@/features/home/homeAssets";
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
const RADII = [5, 10, 25] as const;
type Radius = (typeof RADII)[number];
type HistoryTab = "all" | "active" | "completed" | "cancelled";
type SortKey = "distance" | "pay";

const DAILY_TARGET = 1500;
const CARD = "rounded-2xl border border-[#e6ecf5] bg-white shadow-[0_6px_24px_rgba(20,50,110,0.05)]";
const ACTIVE_STATUSES: ApplicationStatus[] = ["accepted", "on_the_way", "arrived"];

export default function WorkerDashboard() {
  const { language }              = useLanguage();
  const t                         = translations[language];
  const [alerts, setAlerts]       = useState<Job[]>([]);
  const [jobs, setJobs]           = useState<Application[]>([]);
  const [workerPos, setWorkerPos] = useState<LatLng | null>(null);
  const [gpsOn, setGpsOn]         = useState(false);
  const [activeNav, setActiveNav] = useState<{ job: Job; appId?: string } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [radius, setRadius]       = useState<Radius>(10);
  const [sort, setSort]           = useState<SortKey>("distance");
  const [tab, setTab]             = useState<HistoryTab>("all");
  const [available, setAvailable] = useState(true);
  const watchRef                  = useRef<number | null>(null);

  const { worker } = useAuth();

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  // "Available for work" is a per-device setting kept in the browser.
  useEffect(() => {
    try {
      const v = localStorage.getItem("hm_available");
      if (v !== null) setAvailable(v === "1");
    } catch { /* storage unavailable */ }
  }, []);
  const toggleAvailable = () =>
    setAvailable((v) => {
      const next = !v;
      try { localStorage.setItem("hm_available", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });

  // Earnings calculation
  const completed = jobs.filter((j) => j.isCompleted || j.status === "completed");
  const todayDone = completed.filter((j) => new Date(j.updatedAt ?? 0).toDateString() === new Date().toDateString());
  const weekDone  = completed.filter((j) => Date.now() - new Date(j.updatedAt ?? 0).getTime() < 7 * 24 * 60 * 60 * 1000);
  const sumPay = (list: Application[]) => list.reduce((sum, j) => sum + Number(j.job?.salary || 0), 0);
  const todayEarnings = sumPay(todayDone);
  const weekEarnings  = sumPay(weekDone);
  const totalJobs     = completed.length;
  const avgPerGig     = weekDone.length ? Math.round(weekEarnings / weekDone.length) : 0;

  const ratings = completed.map((j) => Number(j.rating)).filter((r) => r > 0);
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : worker?.rating && Number(worker.rating) > 0 ? Number(worker.rating).toFixed(1) : null;

  const profileFields = [worker?.name, worker?.skills, worker?.location, worker?.phone || worker?.contact];
  const profilePct = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

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

  // Job history (earnings) doesn't need GPS
  useEffect(() => {
    if (!worker) return;
    getJobHistory(worker._id)
      .then((d) => setJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [worker]);

  // Nearby jobs need the live position
  useEffect(() => {
    if (!worker || !workerPos) return;
    getJobAlerts(workerPos.lat, workerPos.lng)
      .then((d) => setAlerts(Array.isArray(d) ? d : [])).catch(() => {});
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
      <div className="mb-4 text-[48px]">👷</div>
      <div className="mb-3 text-[18px] font-bold">
        {L("Please Login or Register", "लॉगिन करें या रजिस्टर करें", "लॉगिन किंवा नोंदणी करा")}
      </div>
      <a href="/worker-login" className="inline-block rounded-xl bg-brand px-7 py-3 text-[16px] font-bold text-white no-underline">
        {L("Login / Register", "लॉगिन करें", "लॉगिन करा")}
      </a>
    </div>
  );

  // ── Nearby feed ──
  const feed = alerts.map((job) => ({
    job,
    dist: workerPos && job.latitude && job.longitude ? haversine(workerPos.lat, workerPos.lng, job.latitude, job.longitude) : null,
  }));
  const inRange = feed.filter((f) => f.dist === null || f.dist <= radius);
  const hiddenCount = feed.length - inRange.length;
  const sortedFeed = [...inRange].sort(
    sort === "pay"
      ? (a, b) => Number(b.job.salary || 0) - Number(a.job.salary || 0)
      : (a, b) => (a.dist ?? 999) - (b.dist ?? 999)
  );
  const nextRadius = RADII.find((r) => r > radius);

  // ── History tabs ──
  const isActiveJob = (j: Application) => !j.isCompleted && j.status !== undefined && ACTIVE_STATUSES.includes(j.status);
  const counts = { all: jobs.length, active: jobs.filter(isActiveJob).length, completed: completed.length, cancelled: 0 };
  const shownJobs = tab === "all" ? jobs : tab === "active" ? jobs.filter(isActiveJob) : tab === "completed" ? completed : [];
  const tabLabels: Record<HistoryTab, string> = {
    all: L("All Jobs", "सभी काम", "सर्व कामे"),
    active: L("Active", "चालू", "सुरू"),
    completed: L("Completed", "पूर्ण", "पूर्ण"),
    cancelled: L("Cancelled", "रद्द", "रद्द"),
  };

  const SectionIcon = ({ icon: Icon, tone }: { icon: IconType; tone: string }) => (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={18} aria-hidden="true" /></span>
  );

  return (
    <>
      {activeNav && (
        <NavModal
          job={activeNav.job} appId={activeNav.appId}
          workerPos={workerPos} onClose={() => setActiveNav(null)} t={t} language={language}
        />
      )}

      <div className="mx-auto max-w-[1080px] space-y-5 px-4 py-5 sm:px-6">

        {/* ── WELCOME BANNER ─────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-[#dbe6f7] bg-[linear-gradient(110deg,#eaf2ff_0%,#dce9fb_100%)] p-5 sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_PEOPLE}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] select-none object-cover object-[center_25%] opacity-90 [mask-image:linear-gradient(to_right,transparent_0%,#000_55%)] md:block"
            draggable={false}
          />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${gpsOn && workerPos ? "bg-[#dff6e8] text-[#13783d]" : "bg-white/80 text-[#5b6a85]"}`}>
                  <span className={`h-2 w-2 rounded-full ${gpsOn && workerPos ? "bg-[#1fb25a]" : "bg-[#a9b3c5]"}`} />
                  {gpsOn && workerPos ? L("Live Dispatch Active", "लाइव डिस्पैच चालू", "लाइव्ह डिस्पॅच सुरू") : L("Location Off", "लोकेशन बंद", "लोकेशन बंद")}
                </span>
                <span className="rounded-full border border-[#cfdcf2] bg-white/70 px-3 py-1 text-[#5b6a85]">
                  {L("Worker ID", "वर्कर आईडी", "वर्कर आयडी")}: #HM-{worker._id.slice(-4).toUpperCase()}
                </span>
              </div>

              <p className="mt-4 text-[16px] text-[#16295a]">{L("Welcome back,", "वापसी पर स्वागत है,", "पुन्हा स्वागत आहे,")}</p>
              <h1 className="text-[clamp(26px,3vw,34px)] font-extrabold leading-tight text-[#0d2250]">
                {worker.name} <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-1 text-[14px] text-[#5b6a85]">
                {L("Your hard work keeps our city moving!", "आपकी मेहनत हमारे शहर को चलाती है!", "तुमची मेहनत आपले शहर चालवते!")}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[12px] font-semibold">
                {avgRating && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3cf] px-3 py-1.5 text-[#8a5a00]">
                    <FiStar size={14} aria-hidden="true" /> {avgRating} {L("Star Rating", "स्टार रेटिंग", "स्टार रेटिंग")}
                  </span>
                )}
                {worker.skills && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[#1a4fb0]">
                    <FiTool size={14} aria-hidden="true" /> {worker.skills}
                  </span>
                )}
                <span className="flex items-center gap-2 text-[#16295a]">
                  {L("Profile", "प्रोफ़ाइल", "प्रोफाइल")} {profilePct}% {L("Completed", "पूर्ण", "पूर्ण")}
                  <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/80">
                    <span className="block h-full rounded-full bg-[#1a6cf0]" style={{ width: `${profilePct}%` }} />
                  </span>
                </span>
              </div>
            </div>

            {/* Availability card */}
            <div className="w-full rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_rgba(20,50,110,0.12)] backdrop-blur lg:w-[290px] lg:shrink-0">
              <div className="text-[12px] text-[#5b6a85]">{L("Availability Status", "उपलब्धता स्थिति", "उपलब्धता स्थिती")}</div>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  role="switch"
                  aria-checked={available}
                  onClick={toggleAvailable}
                  className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition ${available ? "bg-[#1fb25a]" : "bg-[#c3cddd]"}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${available ? "left-[22px]" : "left-0.5"}`} />
                  <span className="sr-only">{L("Available for Work", "काम के लिए उपलब्ध", "कामासाठी उपलब्ध")}</span>
                </button>
                <span className="text-[16px] font-bold text-[#0d2250]">
                  {available ? L("Available for Work", "काम के लिए उपलब्ध", "कामासाठी उपलब्ध") : L("Not Available", "उपलब्ध नहीं", "उपलब्ध नाही")}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2.5 border-t border-[#eef2f8] pt-3 text-[12px] text-[#5b6a85]">
                <FiMapPin size={16} className="mt-0.5 shrink-0 text-[#1a4fb0]" aria-hidden="true" />
                {available
                  ? L(`Showing jobs within ${radius} km of you`, `आपके ${radius} किमी के अंदर की नौकरियां दिख रही हैं`, `तुमच्या ${radius} किमी आतील नोकऱ्या दिसत आहेत`)
                  : L("Job alerts are paused on this device", "इस डिवाइस पर जॉब अलर्ट बंद हैं", "या डिव्हाइसवर जॉब अलर्ट बंद आहेत")}
              </div>
            </div>
          </div>
        </section>

        {/* ── EARNINGS ─────────────────────────── */}
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon icon={FiCreditCard} tone="bg-[#fff1dc] text-[#d97706]" />
              <div>
                <h2 className="text-[16px] font-bold text-[#0d2250]">{L("My Earnings & Performance", "मेरी कमाई और प्रदर्शन", "माझी कमाई आणि कामगिरी")}</h2>
                <p className="text-[12.5px] text-[#6b7a95]">{L("Track what you earn from completed jobs", "पूरे किए गए कामों से अपनी कमाई देखें", "पूर्ण केलेल्या कामांची कमाई पहा")}</p>
              </div>
            </div>
            <a href="#job-history" className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-[13px] font-semibold text-[#1a4fb0] no-underline hover:bg-[#f2f7ff]">
              {L("View Ledger", "लेजर देखें", "लेजर पहा")}
            </a>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* Today */}
            <div className="rounded-xl border border-[#cfeedd] bg-[#f1fbf5] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-wide text-[#0d2250]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1fb25a] text-[16px] font-bold text-white">₹</span>
                  {L("Today's Earnings", "आज की कमाई", "आजची कमाई")}
                </span>
                <span className="rounded-full bg-[#dff6e8] px-2.5 py-0.5 text-[11px] font-semibold text-[#13783d]">
                  {todayDone.length} {L("jobs", "काम", "कामे")}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div><span className="text-[28px] font-extrabold text-[#0d2250]">₹{todayEarnings}</span> <span className="text-[12px] text-[#6b7a95]">INR</span></div>
                <span className="text-[12px] text-[#6b7a95]">{L("Daily Target", "दैनिक लक्ष्य", "दैनिक उद्दिष्ट")}: ₹{DAILY_TARGET}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#cfeedd]">
                <div className="h-full rounded-full bg-[#1fb25a]" style={{ width: `${Math.min(100, (todayEarnings / DAILY_TARGET) * 100)}%` }} />
              </div>
            </div>

            {/* Week */}
            <div className="rounded-xl border border-[#d3e4fb] bg-[#f1f7ff] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-wide text-[#0d2250]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a6cf0] text-white"><FiCalendar size={17} aria-hidden="true" /></span>
                  {L("This Week", "इस हफ्ते", "या आठवड्यात")}
                </span>
                <span className="rounded-full bg-[#dbe8fd] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a4fb0]">
                  {weekDone.length} {L("jobs", "काम", "कामे")}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div><span className="text-[28px] font-extrabold text-[#0d2250]">₹{weekEarnings}</span> <span className="text-[12px] text-[#6b7a95]">INR</span></div>
                <span className="text-[12px] text-[#6b7a95]">{L("Avg", "औसत", "सरासरी")} ₹{avgPerGig} / {L("gig", "गिग", "गिग")}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#d3e4fb]">
                <div className="h-full rounded-full bg-[#1a6cf0]" style={{ width: `${Math.min(100, (weekEarnings / (DAILY_TARGET * 7)) * 100)}%` }} />
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl border border-[#e3dcfa] bg-[#f6f3ff] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-wide text-[#0d2250]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7c5ce6] text-white"><FiBriefcase size={17} aria-hidden="true" /></span>
                  {L("Total Completed Jobs", "कुल पूरे काम", "एकूण पूर्ण कामे")}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div><span className="text-[28px] font-extrabold text-[#0d2250]">{totalJobs}</span> <span className="text-[13px] font-semibold text-[#6b7a95]">{L("jobs", "काम", "कामे")}</span></div>
                {avgRating && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7c5ce6]"><FiStar size={13} aria-hidden="true" /> {avgRating}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* ── LOCATION ─────────────────────────── */}
        <section className="flex flex-col gap-4 rounded-2xl bg-[linear-gradient(110deg,#0f3a73_0%,#0b2a5c_100%)] p-5 text-white shadow-[0_10px_30px_rgba(11,42,92,0.25)] lg:flex-row lg:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#e8334f]"><FiMapPin size={20} aria-hidden="true" /></span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold">
              {gpsOn ? L("Live Location is On", "लाइव लोकेशन चालू है", "लाइव्ह लोकेशन सुरू आहे") : L("Enable Live Location to See Nearby Jobs", "पास की नौकरियां देखने के लिए लोकेशन चालू करें", "जवळच्या नोकऱ्या पाहण्यासाठी लोकेशन सुरू करा")}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-[#c9d9f3]">
              {gpsOn
                ? L("You will see instant job invites from clients in your area.", "आपको अपने इलाके के ग्राहकों से तुरंत जॉब आमंत्रण दिखेंगे।", "तुम्हाला तुमच्या परिसरातील ग्राहकांची तातडीची कामे दिसतील.")
                : L("Turn on precise GPS to receive priority instant job invites from clients in your local neighborhood.", "अपने इलाके के ग्राहकों से तुरंत जॉब आमंत्रण पाने के लिए GPS चालू करें।", "तुमच्या परिसरातील ग्राहकांकडून तातडीची कामे मिळवण्यासाठी GPS सुरू करा.")}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/25 p-1 text-[13px]">
            <span className="px-2.5 text-[#c9d9f3]">{L("Radius", "दायरा", "त्रिज्या")}:</span>
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition ${radius === r ? "bg-white text-[#0b2a5c]" : "text-white hover:bg-white/10"}`}
              >
                {r} km
              </button>
            ))}
          </div>

          {gpsOn ? (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1fb25a] px-5 py-3 text-[14px] font-bold text-white">
              <FiCheckCircle size={17} aria-hidden="true" /> {L("Location On", "लोकेशन चालू", "लोकेशन सुरू")}
            </span>
          ) : (
            <button onClick={enableGPS} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-3 text-[14px] font-bold text-[#3b2a00] shadow-[0_8px_20px_rgba(251,191,36,0.35)] transition hover:brightness-95">
              <FiMapPin size={17} aria-hidden="true" /> {L("Enable Location Now", "अभी लोकेशन चालू करें", "आता लोकेशन सुरू करा")}
            </button>
          )}
        </section>

        {/* ── NEW JOBS NEAR YOU ─────────────────────────── */}
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon icon={FiBriefcase} tone="bg-[#fff1dc] text-[#d97706]" />
              <h2 className="text-[16px] font-bold text-[#0d2250]">{t.newJobsNear}</h2>
              {gpsOn && <span className="rounded-full bg-[#ffe4e8] px-2.5 py-0.5 text-[11px] font-bold text-[#d6203a]">{L("Live Feed", "लाइव फ़ीड", "लाइव्ह फीड")}</span>}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#6b7a95]">
              {L("Sort by", "क्रम", "क्रम")}:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="cursor-pointer rounded-lg border border-[#dbe4f0] bg-white px-3 py-1.5 text-[13px] text-[#0d2250] outline-none focus:border-[#1a6cf0]"
              >
                <option value="distance">{L("Distance (Closest)", "दूरी (सबसे पास)", "अंतर (जवळचे)")}</option>
                <option value="pay">{L("Pay (Highest)", "वेतन (सबसे ज़्यादा)", "वेतन (सर्वाधिक)")}</option>
              </select>
            </label>
          </div>

          {!gpsOn ? (
            <div className="rounded-xl border border-dashed border-[#cfdcf2] bg-[#f7faff] p-8 text-center text-[#6b7a95]">
              <FiMapPin size={30} className="mx-auto mb-2 text-[#1a6cf0]" aria-hidden="true" />
              <div className="font-semibold text-[#0d2250]">{t.enableToSee}</div>
            </div>
          ) : !available ? (
            <div className="rounded-xl border border-dashed border-[#cfdcf2] bg-[#f7faff] p-8 text-center text-[#6b7a95]">
              <div className="font-semibold text-[#0d2250]">{L("You are set to Not Available", "आप उपलब्ध नहीं हैं", "तुम्ही उपलब्ध नाही")}</div>
              <button onClick={toggleAvailable} className="mt-3 cursor-pointer rounded-xl bg-[#1a6cf0] px-5 py-2 text-[13px] font-semibold text-white">
                {L("Go Available", "उपलब्ध हों", "उपलब्ध व्हा")}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedFeed.map(({ job, dist }) => {
                const tags = (job.skills?.[language] || job.skills?.en || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);
                const desc = job.description?.[language] || job.description?.en;
                return (
                  <article key={job._id} className="flex flex-col rounded-2xl border border-[#e6ecf5] bg-white p-4 shadow-[0_2px_10px_rgba(20,50,110,0.04)]">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${job.isUrgent ? "bg-[#fff1dc] text-[#d97706]" : "bg-[#eaf2ff] text-[#1a4fb0]"}`}>
                        {job.isUrgent ? <FiZap size={20} aria-hidden="true" /> : <FiTool size={20} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[14.5px] font-bold leading-snug text-[#0d2250]">{job.jobTitle?.[language] || job.jobTitle?.en}</h3>
                          {job.isUrgent && <span className="shrink-0 rounded-full bg-[#fff1dc] px-2 py-0.5 text-[11px] font-bold text-[#c2620a]">{t.urgent}</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#6b7a95]">
                          <FiMapPin size={13} className="shrink-0 text-[#1a4fb0]" aria-hidden="true" />
                          <span className="truncate">{job.location?.[language] || job.location?.en}</span>
                          {dist !== null && <span className="shrink-0">• {dist.toFixed(1)} {t.kmAway}</span>}
                        </div>
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((tag) => <span key={tag} className="rounded-lg bg-[#eef4ff] px-2.5 py-1 text-[11.5px] font-medium text-[#1a4fb0]">{tag}</span>)}
                      </div>
                    )}

                    {desc && <p className="mt-3 line-clamp-3 text-[12.5px] leading-snug text-[#5b6a85]">{desc}</p>}

                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <div>
                        <div className="text-[11.5px] text-[#6b7a95]">{L("Estimate", "अनुमान", "अंदाज")}</div>
                        <div className="text-[18px] font-extrabold text-[#0d2250]">₹{job.salary} <span className="text-[12px] font-normal text-[#6b7a95]">{job.paymentMethod}</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.contactInfo && (
                          <a href={`tel:${job.contactInfo}`} aria-label={t.call} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbe4f0] text-[#1a4fb0] no-underline hover:bg-[#f2f7ff]">
                            <FiPhoneCall size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => acceptJob(job)}
                          disabled={!!acceptingId}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition ${acceptingId === job._id ? "bg-[#9db3d8]" : "bg-[#1a6cf0]"} ${acceptingId ? "cursor-not-allowed" : "cursor-pointer shadow-[0_6px_16px_rgba(26,108,240,0.3)] hover:brightness-95"}`}
                        >
                          {acceptingId === job._id ? t.accepting : <>{L("Accept Gig", "काम लें", "काम घ्या")} <FiArrowRight size={14} aria-hidden="true" /></>}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Hidden jobs / expand card */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c5d5ee] bg-[#f7faff] bg-[linear-gradient(#e9eff9_1px,transparent_1px),linear-gradient(90deg,#e9eff9_1px,transparent_1px)] bg-[size:28px_28px] p-5 text-center">
                <FiMapPin size={26} className="text-[#e8334f]" aria-hidden="true" />
                <h3 className="mt-2 text-[14.5px] font-bold text-[#0d2250]">
                  {hiddenCount > 0 ? L("More Jobs Hidden", "और नौकरियां छिपी हैं", "आणखी नोकऱ्या लपलेल्या आहेत") : sortedFeed.length === 0 ? t.noJobsNearby : L("You're all caught up", "आप अप-टू-डेट हैं", "तुम्ही अपडेट आहात")}
                </h3>
                <p className="mt-1 max-w-[230px] text-[12px] leading-snug text-[#6b7a95]">
                  {hiddenCount > 0
                    ? L(`${hiddenCount} more employers are hiring beyond ${radius} km. Expand radius to see more.`, `${hiddenCount} और नियोक्ता ${radius} किमी के बाहर भर्ती कर रहे हैं। दायरा बढ़ाएं।`, `${hiddenCount} आणखी नियोक्ते ${radius} किमीच्या बाहेर भरती करत आहेत. त्रिज्या वाढवा.`)
                    : L("Check back soon or browse all open jobs.", "जल्द फिर देखें या सभी खुली नौकरियां देखें।", "लवकरच पुन्हा पहा किंवा सर्व खुल्या नोकऱ्या पहा.")}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {hiddenCount > 0 && nextRadius && (
                    <button onClick={() => setRadius(nextRadius)} className="cursor-pointer rounded-xl bg-[#1a6cf0] px-4 py-2 text-[12.5px] font-semibold text-white">
                      {L(`Expand to ${nextRadius} km`, `${nextRadius} किमी तक बढ़ाएं`, `${nextRadius} किमी पर्यंत वाढवा`)}
                    </button>
                  )}
                  <Link href="/ai-suggestions" className="inline-flex items-center gap-2 rounded-xl border border-[#1a6cf0] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#1a4fb0] no-underline">
                    <FiCpu size={15} aria-hidden="true" /> {L("HireMate Assistant", "हायरमेट असिस्टेंट", "हायरमेट असिस्टंट")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── JOB HISTORY ─────────────────────────── */}
        <section id="job-history" className={`${CARD} p-4 sm:p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon icon={FiFolder} tone="bg-[#fff1dc] text-[#d97706]" />
              <h2 className="text-[16px] font-bold text-[#0d2250]">{t.jobHistory}</h2>
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl bg-[#f2f6fc] p-1 text-[12.5px]">
              {(Object.keys(tabLabels) as HistoryTab[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 transition ${tab === k ? "bg-white font-semibold text-[#1a4fb0] shadow-sm ring-1 ring-[#cfdcf2]" : "text-[#6b7a95] hover:text-[#0d2250]"}`}
                >
                  {tabLabels[k]}{k !== "all" && ` (${counts[k]})`}
                </button>
              ))}
            </div>
          </div>

          {shownJobs.length === 0 ? (
            <div className="flex flex-col items-center border-t border-[#eef2f8] px-4 pb-4 pt-8 text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf2ff] text-[#1a6cf0]">
                <FiFileText size={28} aria-hidden="true" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#1fb25a] text-white ring-2 ring-white"><FiCheckCircle size={14} aria-hidden="true" /></span>
              </span>
              <h3 className="mt-3 text-[15px] font-bold text-[#0d2250]">
                {tab === "all" || tab === "completed" ? L("No jobs completed yet", "अभी कोई काम पूरा नहीं हुआ", "अजून कोणतेही काम पूर्ण झाले नाही") : L("Nothing here", "यहां कुछ नहीं", "येथे काही नाही")}
              </h3>
              <p className="mt-1 max-w-[380px] text-[12.5px] text-[#6b7a95]">
                {L("Accept your first nearby gig to start building your earnings, ratings, and reputation on HireMate.", "अपनी कमाई, रेटिंग और साख बनाने के लिए पहला काम स्वीकार करें।", "कमाई, रेटिंग आणि प्रतिष्ठा वाढवण्यासाठी पहिले काम स्वीकारा.")}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <Link href="/jobs" className="rounded-xl bg-[#1a6cf0] px-5 py-2.5 text-[13px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(26,108,240,0.3)]">
                  {L("Browse Nearby Available Jobs", "उपलब्ध नौकरियां देखें", "उपलब्ध नोकऱ्या पहा")}
                </Link>
                <Link href="/worker-profile" className="rounded-xl border border-[#dbe4f0] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#5b6a85] no-underline hover:bg-[#f2f7ff]">
                  {L("Update My Profile", "प्रोफ़ाइल अपडेट करें", "प्रोफाइल अपडेट करा")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 border-t border-[#eef2f8] pt-4">
              {shownJobs.map((j) => {
                const sc = (j.status && STATUS_CONFIG[j.status]) || STATUS_CONFIG.accepted;
                return (
                  <div key={j._id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f8] bg-[#fbfcff] px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-[#0d2250]">{j.job?.jobTitle?.[language] || j.job?.jobTitle?.en}</div>
                      <div className="truncate text-[12px] text-[#6b7a95]">{j.job?.location?.[language] || j.job?.location?.en}</div>
                      <div className="mt-0.5 text-[12.5px] font-semibold text-[#1a4fb0]">₹{j.job?.salary}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${sc.soft} ${sc.text}`}>{sc.label}</span>
                      {j.isCompleted && j.rating ? <div className="mt-1 flex items-center justify-end gap-1 text-[12px] text-[#8a5a00]"><FiStar size={12} aria-hidden="true" /> {j.rating}/5</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── HELP / SOS ─────────────────────────── */}
        <section className="flex flex-col gap-4 rounded-2xl border border-[#d6e4fb] bg-[#eef5ff] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a4fb0] text-white"><FiHeadphones size={22} aria-hidden="true" /></span>
            <div>
              <h2 className="text-[14.5px] font-bold text-[#0d3a8a]">{L("Need help or in an emergency?", "मदद चाहिए या आपातकाल है?", "मदत हवी आहे किंवा आणीबाणी आहे?")}</h2>
              <p className="text-[12.5px] text-[#5b6a85]">{L("In an emergency, call 112 for police, fire or ambulance.", "आपातकाल में पुलिस, फायर या एम्बुलेंस के लिए 112 पर कॉल करें।", "आणीबाणीत पोलीस, अग्निशमन किंवा रुग्णवाहिकेसाठी 112 वर कॉल करा.")}</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Link href="/ai-suggestions" className="rounded-xl border border-[#dbe4f0] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#1a4fb0] no-underline hover:bg-[#f2f7ff]">
              {L("Help Center", "सहायता केंद्र", "मदत केंद्र")}
            </Link>
            <a href="tel:112" className="inline-flex items-center gap-2 rounded-xl bg-[#f0264a] px-5 py-2.5 text-[13px] font-bold text-white no-underline shadow-[0_6px_16px_rgba(240,38,74,0.3)]">
              <FiPhoneCall size={15} aria-hidden="true" /> {L("Emergency SOS", "इमरजेंसी SOS", "इमर्जन्सी SOS")}
            </a>
          </div>
        </section>
      </div>
    </>
  );
}