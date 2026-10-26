"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { FiCalendar, FiCheckCircle, FiChevronRight, FiBriefcase, FiFileText, FiHeadphones, FiMapPin, FiPhoneCall, FiPlus, FiSearch, FiShield, FiStar, FiUser, FiZap } from "react-icons/fi";
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
type SortKey = "distance" | "pay";

const CARD = "rounded-2xl border border-[#e3eaf5] bg-white shadow-[0_4px_18px_rgba(20,50,110,0.05)]";

const tradeEmoji = (title = "") => {
  const t = title.toLowerCase();
  if (/driv|चालक|ड्रायव्हर/.test(t)) return "🚚";
  if (/chef|cook|कुक|रसोई|स्वयंपाक|स्वयंपाकी/.test(t)) return "🍳";
  if (/mechanic|मैकेनिक|मेकॅनिक/.test(t)) return "🔧";
  if (/plumb|नल/.test(t)) return "🚰";
  if (/electric|बिजली|वीज/.test(t)) return "⚡";
  if (/clean|सफाई|स्वच्छ/.test(t)) return "🧹";
  if (/paint|पेंट|रंग/.test(t)) return "🎨";
  if (/guard|security|सुरक्षा/.test(t)) return "💂";
  return "💼";
};

function StatTile({ icon, iconBg, label, value, sub, subClass = "text-[#6b7a95]" }: {
  icon: ReactNode; iconBg: string; label: string; value: ReactNode; sub?: string; subClass?: string;
}) {
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      <div className="mt-3 text-[14px] text-[#33415f]">{label}</div>
      <div className="mt-0.5 text-[26px] font-extrabold leading-tight text-[#0d2250]">{value}</div>
      {sub && <div className={`mt-1 text-[13px] ${subClass}`}>{sub}</div>}
    </div>
  );
}

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

  // ── Numbers for the stat cards ──
  const completed = jobs.filter((j) => j.isCompleted || j.status === "completed");
  const salaryOf = (a: Application) => Number(String(a.job?.salary ?? "").replace(/[^\d.]/g, "")) || 0;
  const totalEarned = completed.reduce((s, a) => s + salaryOf(a), 0);
  const weekEarned = completed
    .filter((j) => Date.now() - new Date(j.updatedAt ?? 0).getTime() < 7 * 24 * 60 * 60 * 1000)
    .reduce((s, a) => s + salaryOf(a), 0);

  const ratings = completed.map((j) => Number(j.rating)).filter((r) => r > 0);
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : worker?.rating && Number(worker.rating) > 0 ? Number(worker.rating).toFixed(1) : null;
  const reviewCount = ratings.length || worker?.totalReviews || 0;

  const reviews = completed.filter((j) => j.review).sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());

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

  // Job history (earnings, reviews) doesn't need GPS
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

  const skillList = (worker.skills || "").split(/[,،;、]/).map((s) => s.trim()).filter(Boolean);
  const city = (worker.location || "").split(",")[0].trim();
  const areas = [worker.location, ...(worker.serviceAreas || [])].filter((a): a is string => Boolean(a));
  const docs = worker.documents || [];
  const allDocsVerified = docs.length > 0 && docs.every((d) => d.verified);

  const greeting = L("Namaste", "नमस्ते", "नमस्कार");
  const ago = (iso?: string) => {
    if (!iso) return "";
    const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
    return days < 1 ? rtf.format(0, "day") : days < 14 ? rtf.format(-days, "day") : rtf.format(-Math.round(days / 7), "week");
  };

  return (
    <>
      {activeNav && (
        <NavModal
          job={activeNav.job} appId={activeNav.appId}
          workerPos={workerPos} onClose={() => setActiveNav(null)} t={t} language={language}
        />
      )}

      <div className="mx-auto max-w-[1180px] space-y-5 px-4 py-5 sm:px-6">

        {/* ── WELCOME BANNER ─────────────────────────── */}
        <section className={`${CARD} overflow-hidden`}>
          <div className="relative bg-[linear-gradient(100deg,#eef5ff_0%,#dcebff_60%,#c8dcf6_100%)] px-5 py-6 sm:px-7 sm:py-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_PEOPLE}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[50%] select-none object-cover object-[center_25%] [mask-image:linear-gradient(to_right,transparent_0%,#000_45%)] md:block"
              draggable={false}
            />
            <div className="relative z-10 max-w-[620px]">
              <h1 className="m-0 text-[clamp(26px,3.2vw,36px)] font-extrabold leading-tight text-[#0d2250]">
                {greeting} <span className="text-[#1a6cf0]">{worker.name}!</span>
              </h1>
              <h2 className="m-0 mt-1.5 text-[clamp(17px,2vw,22px)] font-bold text-[#0d2250]">
                {L("Welcome to your Worker Portal", "आपका Worker Portal में स्वागत है", "तुमच्या Worker Portal मध्ये स्वागत आहे")}
              </h2>
              <p className="m-0 mt-2 text-[14.5px] text-[#33415f]">
                {L("Find new jobs, get the right information, and receive payments on time.", "यहाँ आपको नए काम, सही जानकारी और समय पर पेमेंट की सुविधा मिलती है।", "येथे तुम्हाला नवीन कामे, योग्य माहिती आणि वेळेवर पेमेंटची सुविधा मिळते.")}
              </p>
              <div className="mt-4">
                {profilePct === 100 ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#a7e8c8] bg-[#dff6e8] px-4 py-1.5 text-[13.5px] font-semibold text-[#0b6b3a]">
                    <FiCheckCircle size={17} aria-hidden="true" /> {L("Your profile is complete", "आपकी प्रोफ़ाइल पूरी है", "तुमची प्रोफाइल पूर्ण आहे")}
                  </span>
                ) : (
                  <Link href="/worker-profile" className="inline-flex items-center gap-2 rounded-full border border-[#fcd9a1] bg-[#fff3d6] px-4 py-1.5 text-[13.5px] font-semibold text-[#8a5a00] no-underline">
                    {L(`Profile ${profilePct}% complete — finish it`, `प्रोफ़ाइल ${profilePct}% पूरी — पूरा करें`, `प्रोफाइल ${profilePct}% पूर्ण — पूर्ण करा`)}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#e3eaf5] bg-white px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3 rounded-xl border border-[#fde6b0] bg-[#fff8e6] px-4 py-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0c2] text-[#f5a000]"><FiStar size={20} className="fill-current" aria-hidden="true" /></span>
              <div className="leading-tight">
                <div className="text-[15px] font-bold text-[#0d2250]">{avgRating ?? "—"}</div>
                <div className="text-[12px] text-[#6b7a95]">({reviewCount} {L("Reviews", "रिव्यू", "रिव्ह्यू")})</div>
              </div>
            </div>
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${gpsOn && workerPos ? "border-[#bfe9d1] bg-[#effaf4]" : "border-[#e3eaf5] bg-[#f7f9fd]"}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${gpsOn && workerPos ? "bg-[#d3f3e1] text-[#13783d]" : "bg-[#e9eef8] text-[#6b7a95]"}`}><FiMapPin size={20} aria-hidden="true" /></span>
              <div className="leading-tight">
                <div className="text-[14px] font-bold text-[#0d2250]">{gpsOn && workerPos ? L("Live location on", "लाइव लोकेशन चालू", "लाइव्ह लोकेशन सुरू") : L("Location off", "लोकेशन बंद", "लोकेशन बंद")}</div>
                <div className="text-[12px] text-[#6b7a95]">{city || L("Set your area in profile", "प्रोफ़ाइल में इलाका जोड़ें", "प्रोफाइलमध्ये परिसर जोडा")}</div>
              </div>
            </div>
            <Link href="/worker-profile" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#1a6cf0] px-5 py-3 text-[14px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(26,108,240,0.3)] hover:brightness-95">
              <FiUser size={17} aria-hidden="true" /> {L("View my profile", "अपना प्रोफ़ाइल देखें", "माझी प्रोफाइल पहा")} <FiChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── STAT TILES ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            icon={<FiBriefcase size={22} className="text-[#1a6cf0]" aria-hidden="true" />} iconBg="bg-[#e6efff]"
            label={L("Total jobs done", "कुल काम पूरे किए", "एकूण कामे पूर्ण")}
            value={completed.length}
            sub={completed.length ? L("Payments received", "पेमेंट मिल चुका", "पेमेंट मिळाले") : L("Accept your first job", "पहला काम स्वीकारें", "पहिले काम स्वीकारा")}
            subClass="text-[#0b8a4c]"
          />
          <StatTile
            icon={<span className="text-[22px] font-bold text-[#1a6cf0]">₹</span>} iconBg="bg-[#e6efff]"
            label={L("Total earnings", "कुल कमाई", "एकूण कमाई")}
            value={`₹${totalEarned.toLocaleString("en-IN")}`}
            sub={L("Added to your account", "आपके खाते में जोड़ा गया", "तुमच्या खात्यात जमा")}
            subClass="text-[#0b8a4c]"
          />
          {worker.experienceYears ? (
            <StatTile
              icon={<FiCalendar size={22} className="text-[#1a6cf0]" aria-hidden="true" />} iconBg="bg-[#e6efff]"
              label={L("Experience", "अनुभव", "अनुभव")}
              value={`${worker.experienceYears}+ ${L("years", "साल", "वर्षे")}`}
              sub={worker.skills}
            />
          ) : (
            <StatTile
              icon={<FiStar size={22} className="fill-[#f5a000] text-[#f5a000]" aria-hidden="true" />} iconBg="bg-[#fff0c2]"
              label={L("Average rating", "औसत रेटिंग", "सरासरी रेटिंग")}
              value={avgRating ?? "—"}
              sub={`${reviewCount} ${L("employer reviews", "नियोक्ता रिव्यू", "मालक रिव्ह्यू")}`}
            />
          )}
          {worker.backgroundVerified ? (
            <StatTile
              icon={<FiShield size={22} className="text-[#13a05a]" aria-hidden="true" />} iconBg="bg-[#dff6e8]"
              label={L("Background check", "पृष्ठभूमि जाँच", "पार्श्वभूमी तपासणी")}
              value={<span className="text-[#0b8a4c]">{L("Verified", "सत्यापित", "सत्यापित")} ✓</span>}
              sub={L("Verification passed", "वेरिफिकेशन पास", "पडताळणी पूर्ण")}
              subClass="text-[#0b8a4c]"
            />
          ) : (
            <StatTile
              icon={<FiCalendar size={22} className="text-[#13a05a]" aria-hidden="true" />} iconBg="bg-[#dff6e8]"
              label={L("This week", "इस हफ्ते", "या आठवड्यात")}
              value={`₹${weekEarned.toLocaleString("en-IN")}`}
              sub={L("Last 7 days", "पिछले 7 दिन", "मागील 7 दिवस")}
            />
          )}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ═════════ LEFT COLUMN ═════════ */}
          <div className="min-w-0 space-y-5">

            {/* ── WORK AVAILABLE TODAY ── */}
            <section className={`${CARD} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6efff] text-[#1a6cf0]"><FiBriefcase size={24} aria-hidden="true" /></span>
                  <div>
                    <h2 className="m-0 text-[19px] font-bold text-[#0d2250]">{L("Work available today", "आज के लिए उपलब्ध काम", "आजसाठी उपलब्ध काम")}</h2>
                    <p className="m-0 text-[13px] text-[#6b7a95]">{L("Best matches for your skills", "आपके कौशल के अनुसार सबसे बेहतर काम", "तुमच्या कौशल्यानुसार सर्वोत्तम कामे")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {gpsOn && (
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      aria-label={L("Sort by", "क्रम", "क्रम")}
                      className="cursor-pointer rounded-lg border border-[#dbe4f0] bg-white px-2.5 py-1.5 text-[12.5px] text-[#0d2250] outline-none focus:border-[#1a6cf0]"
                    >
                      <option value="distance">{L("Closest", "सबसे पास", "जवळचे")}</option>
                      <option value="pay">{L("Highest pay", "सबसे ज़्यादा वेतन", "सर्वाधिक वेतन")}</option>
                    </select>
                  )}
                  <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-full border border-[#bcd3ff] bg-[#eaf1ff] px-4 py-2 text-[13px] font-semibold text-[#1a4fb0] no-underline hover:bg-[#dbe8ff]">
                    <FiPlus size={14} aria-hidden="true" /> {L("See more work", "और काम देखें", "आणखी कामे पहा")}
                  </Link>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {!gpsOn ? (
                  <div className="rounded-xl border border-dashed border-[#c5d5ee] bg-[#f7faff] p-7 text-center">
                    <FiMapPin size={30} className="mx-auto mb-2 text-[#1a6cf0]" aria-hidden="true" />
                    <div className="font-semibold text-[#0d2250]">{t.enableToSee}</div>
                    <button onClick={enableGPS} className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1a6cf0] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(26,108,240,0.3)] hover:brightness-95">
                      <FiMapPin size={16} aria-hidden="true" /> {L("Enable Location Now", "अभी लोकेशन चालू करें", "आता लोकेशन सुरू करा")}
                    </button>
                  </div>
                ) : !available ? (
                  <div className="rounded-xl border border-dashed border-[#c5d5ee] bg-[#f7faff] p-7 text-center">
                    <div className="font-semibold text-[#0d2250]">{L("You are set to Not Available", "आप उपलब्ध नहीं हैं", "तुम्ही उपलब्ध नाही")}</div>
                    <button onClick={toggleAvailable} className="mt-3 cursor-pointer rounded-xl bg-[#1a6cf0] px-5 py-2 text-[13px] font-semibold text-white">
                      {L("Go Available", "उपलब्ध हों", "उपलब्ध व्हा")}
                    </button>
                  </div>
                ) : sortedFeed.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#c5d5ee] bg-[#f7faff] p-7 text-center text-[#6b7a95]">
                    <div className="font-semibold text-[#0d2250]">{hiddenCount > 0 ? L("More Jobs Hidden", "और नौकरियां छिपी हैं", "आणखी नोकऱ्या लपलेल्या आहेत") : t.noJobsNearby}</div>
                    <p className="m-0 mt-1 text-[12.5px]">
                      {hiddenCount > 0
                        ? L(`${hiddenCount} more employers are hiring beyond ${radius} km.`, `${hiddenCount} और नियोक्ता ${radius} किमी के बाहर भर्ती कर रहे हैं।`, `${hiddenCount} आणखी नियोक्ते ${radius} किमीच्या बाहेर भरती करत आहेत.`)
                        : L("Check back soon or browse all open jobs.", "जल्द फिर देखें या सभी खुली नौकरियां देखें।", "लवकरच पुन्हा पहा किंवा सर्व खुल्या नोकऱ्या पहा.")}
                    </p>
                    {hiddenCount > 0 && nextRadius && (
                      <button onClick={() => setRadius(nextRadius)} className="mt-3 cursor-pointer rounded-xl bg-[#1a6cf0] px-4 py-2 text-[12.5px] font-semibold text-white">
                        {L(`Expand to ${nextRadius} km`, `${nextRadius} किमी तक बढ़ाएं`, `${nextRadius} किमी पर्यंत वाढवा`)}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {sortedFeed.map(({ job, dist }) => {
                      const title = job.jobTitle?.[language] || job.jobTitle?.en || "";
                      const skills = job.skills?.[language] || job.skills?.en || "";
                      return (
                        <article key={job._id} className="rounded-xl border border-[#d4e2f8] bg-[#f6faff] p-4">
                          <div className="flex flex-wrap items-start gap-3.5">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1a6cf0] text-[24px]" aria-hidden="true">{tradeEmoji(job.jobTitle?.en || title)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="m-0 text-[16px] font-bold text-[#0d2250]">{title}</h3>
                                {job.isUrgent && <span className="rounded-md bg-[#1a6cf0] px-2 py-0.5 text-[11px] font-bold text-white">{t.urgent}</span>}
                              </div>
                              {skills && <p className="m-0 mt-1 text-[12.5px] text-[#6b7a95]">{skills}</p>}
                              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#bcd3ff] bg-white px-2.5 py-1 text-[#0d2250]">
                                  <span className="flex h-5 w-5 items-center justify-center rounded bg-[#e6efff] text-[11px] text-[#1a6cf0]">₹</span>
                                  {Number(job.salary).toLocaleString("en-IN")} <span className="font-normal text-[#6b7a95]">{job.paymentMethod}</span>
                                </span>
                                {dist !== null && (
                                  <span className="rounded-lg border border-[#bfe9d1] bg-[#effaf4] px-2.5 py-1 text-[#0b8a4c]">{dist.toFixed(1)} {t.kmAway}</span>
                                )}
                                <span className="inline-flex items-center gap-1 truncate text-[12px] font-normal text-[#6b7a95]">
                                  <FiMapPin size={12} aria-hidden="true" /> {job.location?.[language] || job.location?.en}
                                </span>
                              </div>
                            </div>
                            <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:flex-col sm:items-stretch">
                              <Link href={`/jobs/${job._id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1a6cf0] px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(26,108,240,0.3)] hover:brightness-95">
                                {L("View details", "विवरण देखें", "तपशील पहा")} <FiChevronRight size={15} aria-hidden="true" />
                              </Link>
                              <button
                                onClick={() => acceptJob(job)}
                                disabled={!!acceptingId}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-[13px] font-semibold transition ${acceptingId === job._id ? "border-[#cdd8ec] bg-[#eef2f9] text-[#8a96ae]" : "border-[#1a6cf0] bg-white text-[#1a4fb0] hover:bg-[#eaf1ff]"} ${acceptingId ? "cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {acceptingId === job._id ? t.accepting : L("Accept Gig", "काम लें", "काम घ्या")}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {hiddenCount > 0 && nextRadius && (
                      <button onClick={() => setRadius(nextRadius)} className="w-full cursor-pointer rounded-xl border border-dashed border-[#c5d5ee] bg-[#f7faff] px-4 py-2.5 text-[13px] font-semibold text-[#1a4fb0] hover:bg-[#eaf1ff]">
                        {L(`${hiddenCount} more jobs beyond ${radius} km — expand to ${nextRadius} km`, `${radius} किमी के बाहर ${hiddenCount} और काम — ${nextRadius} किमी तक बढ़ाएं`, `${radius} किमीच्या बाहेर ${hiddenCount} आणखी कामे — ${nextRadius} किमी पर्यंत वाढवा`)}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Skills */}
              {skillList.length > 0 && (
                <div className="mt-6">
                  <h3 className="m-0 mb-3 text-[17px] font-bold text-[#0d2250]">{L("Your skills", "आपके कौशल", "तुमची कौशल्ये")}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {skillList.map((s) => (
                      <Link key={s} href="/worker-profile" className="flex items-center gap-3 rounded-xl border border-[#e3eaf5] bg-[#fbfcff] p-3.5 no-underline hover:bg-[#f2f7ff]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff3d6] text-[22px]" aria-hidden="true">{tradeEmoji(s)}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#0d2250]">{s}</span>
                        <FiChevronRight size={16} className="shrink-0 text-[#8a96ae]" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── DOCUMENTS (only when an admin has reviewed some) ── */}
            {docs.length > 0 && (
              <section className={`${CARD} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#dff6e8] text-[#13a05a]"><FiShield size={24} aria-hidden="true" /></span>
                    <div>
                      <h2 className="m-0 text-[18px] font-bold text-[#0d2250]">{L("ID & document verification", "सरकारी पहचान और दस्तावेज़ सत्यापन", "ओळख आणि कागदपत्र पडताळणी")}</h2>
                      <p className="m-0 text-[13px] text-[#6b7a95]">{allDocsVerified ? L("All your documents are verified. You are ready to work.", "सभी दस्तावेज़ों की पुष्टि हो चुकी है। अब आप काम के लिए तैयार हैं।", "सर्व कागदपत्रांची पुष्टी झाली आहे. आता तुम्ही कामासाठी तयार आहात.") : L("Some documents are pending review.", "कुछ दस्तावेज़ों की जाँच बाकी है।", "काही कागदपत्रांची तपासणी बाकी आहे.")}</p>
                    </div>
                  </div>
                  {allDocsVerified && <span className="rounded-full bg-[#dff6e8] px-4 py-1.5 text-[13px] font-bold text-[#0b8a4c]">{L("All approved", "सभी स्वीकृत", "सर्व मंजूर")}</span>}
                </div>
                <div className="mt-4 space-y-3">
                  {docs.map((d) => (
                    <div key={d.title} className={`flex items-center gap-3.5 rounded-xl border-2 p-3.5 ${d.verified ? "border-[#bfe9d1] bg-[#f3fbf7]" : "border-[#fde6b0] bg-[#fffaf0]"}`}>
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${d.verified ? "bg-[#d3f3e1] text-[#13a05a]" : "bg-[#fff0c2] text-[#d97706]"}`}><FiFileText size={22} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-bold text-[#0d2250]">{d.title}</div>
                        {d.detail && <div className="truncate text-[12px] text-[#6b7a95]">{d.detail}</div>}
                      </div>
                      <span className={`shrink-0 text-[14px] font-bold ${d.verified ? "text-[#0b8a4c]" : "text-[#b45309]"}`}>
                        {d.verified ? <>{L("Verified", "सत्यापित", "सत्यापित")} ✓</> : L("Pending", "बाकी", "प्रलंबित")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── EMPLOYER FEEDBACK ── */}
            <section className={`${CARD} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-[18px] font-bold text-[#0d2250]">{L("Recent employer feedback", "हाल के नियोक्ता की प्रतिक्रिया", "अलीकडील मालकांचा अभिप्राय")}</h2>
                  <p className="m-0 text-[13px] text-[#6b7a95]">{L("What employers said about your completed jobs", "आपके द्वारा पूरे किए गए कामों पर नियोक्ताओं की राय", "तुम्ही पूर्ण केलेल्या कामांवर मालकांचे मत")}</p>
                </div>
                {reviews.length > 0 && (
                  <Link href="/my-jobs" className="text-[13px] font-semibold text-[#1a4fb0] no-underline hover:underline">
                    {L(`See all ${reviews.length} reviews`, `सभी ${reviews.length} समीक्षाएँ देखें`, `सर्व ${reviews.length} पुनरावलोकने पहा`)} →
                  </Link>
                )}
              </div>
              {reviews.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[#c5d5ee] bg-[#f7faff] p-6 text-center text-[13px] text-[#6b7a95]">
                  {L("Reviews from employers will appear here after you complete jobs.", "काम पूरे करने के बाद नियोक्ताओं के रिव्यू यहाँ दिखेंगे।", "काम पूर्ण केल्यानंतर मालकांचे रिव्ह्यू येथे दिसतील.")}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {reviews.slice(0, 2).map((r) => {
                    const company = r.job?.companyName || L("Employer", "नियोक्ता", "मालक");
                    return (
                      <div key={r._id} className="rounded-xl border border-[#e3eaf5] bg-[#fbfcff] p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6efff] text-[17px] font-bold text-[#1a4fb0]">{company.charAt(0).toUpperCase()}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-[14.5px] font-bold text-[#0d2250]">{company}</div>
                                <div className="text-[12px] text-[#8a96ae]">{r.job?.location?.[language] || r.job?.location?.en} {r.updatedAt ? `• ${ago(r.updatedAt)}` : ""}</div>
                              </div>
                              {Number(r.rating) > 0 && (
                                <span className="inline-flex gap-0.5" aria-label={`${r.rating} / 5`}>
                                  {[1, 2, 3, 4, 5].map((n) => <FiStar key={n} size={15} className={n <= Math.round(Number(r.rating)) ? "fill-[#f5b301] text-[#f5b301]" : "text-[#d5dbe8]"} aria-hidden="true" />)}
                                </span>
                              )}
                            </div>
                            <p className="m-0 mt-2 text-[13.5px] italic leading-relaxed text-[#33415f]">&ldquo;{r.review}&rdquo;</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ═════════ RIGHT COLUMN ═════════ */}
          <aside className="min-w-0 space-y-5">
            {/* Quick start */}
            <section className={`${CARD} p-4 sm:p-5`}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0c2] text-[#f5a000]"><FiZap size={22} className="fill-current" aria-hidden="true" /></span>
                <h2 className="m-0 text-[18px] font-bold text-[#0d2250]">{L("Start work quickly", "जल्दी से काम के लिए", "लवकर कामासाठी")}</h2>
              </div>

              <div className="mt-4 border-t border-[#eef2f8] pt-4">
                <div className="mb-2 text-[13.5px] font-semibold text-[#0d2250]">{L("Availability", "उपलब्धता", "उपलब्धता")}</div>
                <button
                  role="switch"
                  aria-checked={available}
                  onClick={toggleAvailable}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#e3eaf5] bg-[#fbfcff] p-3 text-left"
                >
                  <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${available ? "bg-[#1fb25a]" : "bg-[#c3cddd]"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${available ? "left-[22px]" : "left-0.5"}`} />
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#0d2250]">{available ? L("Available for Work", "काम के लिए उपलब्ध", "कामासाठी उपलब्ध") : L("Not Available", "उपलब्ध नहीं", "उपलब्ध नाही")}</span>
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[13.5px] font-semibold text-[#0d2250]">{L("Job search distance", "काम खोजने की दूरी", "काम शोधण्याचे अंतर")}</div>
                <div className="flex flex-wrap gap-2">
                  {RADII.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold transition ${radius === r ? "border-[#1a6cf0] bg-[#1a6cf0] text-white" : "border-[#bcd3ff] bg-[#f2f7ff] text-[#1a4fb0] hover:bg-[#e3eeff]"}`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-[#0d2250]"><FiBriefcase size={15} aria-hidden="true" /> {L("Join work today", "तुरंत जॉइन करने के लिए", "लगेच कामावर रुजू होण्यासाठी")}</div>
                {gpsOn ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-[#bfe9d1] bg-[#effaf4] px-4 py-3 text-[13.5px] font-semibold text-[#0b8a4c]">
                    <FiCheckCircle size={18} aria-hidden="true" /> {L("Location on — you're ready", "लोकेशन चालू — आप तैयार हैं", "लोकेशन सुरू — तुम्ही तयार आहात")}
                  </div>
                ) : (
                  <button onClick={enableGPS} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#bfe9d1] bg-[#effaf4] px-4 py-3 text-left text-[13.5px] font-semibold text-[#0b8a4c] hover:bg-[#e2f6ea]">
                    <FiCheckCircle size={18} aria-hidden="true" /> {L("Start work today", "आज ही काम शुरू करें", "आजच काम सुरू करा")}
                  </button>
                )}
              </div>
            </section>

            {/* Service area */}
            <section className={`${CARD} p-4 sm:p-5`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-[17px] font-bold text-[#0d2250]">{L("Service area", "सेवा क्षेत्र", "सेवा क्षेत्र")}{city ? ` (${city})` : ""}</h2>
                <Link href="/worker-profile" className="text-[12.5px] font-semibold text-[#1a4fb0] no-underline hover:underline">{L("Edit", "संपादित करें", "संपादित करा")}</Link>
              </div>
              {areas.length === 0 ? (
                <p className="m-0 mt-3 text-[13px] text-[#6b7a95]">{L("Add your area in your profile to get nearby jobs.", "पास की नौकरियों के लिए प्रोफ़ाइल में अपना इलाका जोड़ें।", "जवळच्या नोकऱ्यांसाठी प्रोफाइलमध्ये परिसर जोडा.")}</p>
              ) : (
                <ul className="m-0 mt-3 list-none space-y-2 p-0">
                  {areas.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 rounded-lg bg-[#f4f6fa] px-3 py-2.5 text-[13.5px] text-[#0d2250]">
                      <FiMapPin size={16} className="shrink-0 text-[#e5334f]" aria-hidden="true" /> <span className="min-w-0">{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="m-0 mt-3 text-[12.5px] text-[#8a96ae]">{L(`Search distance: within ${radius} km`, `खोज की सीमा: ${radius} किमी तक`, `शोध मर्यादा: ${radius} किमी पर्यंत`)}</p>
            </section>

            {/* Help */}
            <section className="rounded-2xl bg-[linear-gradient(160deg,#10285a_0%,#0a1c42_100%)] p-5 text-white shadow-[0_10px_30px_rgba(11,42,92,0.25)]">
              <div className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#7fb2ff] ring-1 ring-white/20"><FiHeadphones size={24} aria-hidden="true" /></span>
                <div>
                  <h2 className="m-0 text-[17px] font-bold">{L("Trouble finding work?", "काम खोजने में दिक्कत?", "काम शोधण्यात अडचण?")}</h2>
                  <p className="m-0 mt-1 text-[13px] text-[#c9d9f3]">
                    {gpsOn
                      ? L(`${alerts.length} new jobs match your profile`, `${alerts.length} नए जॉब आपके प्रोफ़ाइल के अनुसार`, `${alerts.length} नवीन कामे तुमच्या प्रोफाइलनुसार`)
                      : L("Turn on location to see jobs near you", "पास के काम देखने के लिए लोकेशन चालू करें", "जवळची कामे पाहण्यासाठी लोकेशन सुरू करा")}
                  </p>
                </div>
              </div>
              <Link href="/jobs" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#1f8bff] px-4 py-3 text-[14px] font-semibold text-white no-underline hover:brightness-110">
                <FiSearch size={16} aria-hidden="true" /> {L("Browse jobs", "जॉब ब्राउज़ करें", "नोकऱ्या ब्राउझ करा")}
              </Link>
              <Link href="/my-jobs" className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-[14px] font-semibold text-white no-underline hover:bg-white/10">
                <FiCalendar size={16} aria-hidden="true" /> {L("My active contracts", "मेरे सक्रिय कॉन्ट्रैक्ट", "माझे सक्रिय कॉन्ट्रॅक्ट")}
              </Link>
            </section>
          </aside>
        </div>

        {/* ── FOOTER ─────────────────────────── */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3eaf5] pt-4 text-[12.5px] text-[#8a96ae]">
          <span>© {new Date().getFullYear()} HireMate</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/ai-suggestions" className="font-semibold text-[#5b6a85] no-underline hover:underline">{L("Help Center", "सहायता केंद्र", "मदत केंद्र")}</Link>
            <a href="tel:112" className="inline-flex items-center gap-2 rounded-full border border-[#f7b9c4] bg-[#fff1f3] px-4 py-2 text-[12.5px] font-bold text-[#d6203a] no-underline hover:bg-[#ffe4e8]">
              <FiPhoneCall size={14} aria-hidden="true" /> {L("Emergency SOS (112)", "इमरजेंसी SOS (112)", "इमर्जन्सी SOS (112)")}
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}