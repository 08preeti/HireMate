"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { FaBolt, FaCar, FaHammer, FaPaintRoller, FaStar, FaUtensils, FaWrench } from "react-icons/fa";
import {
  FiArrowRight, FiAward, FiBell, FiBriefcase, FiCalendar, FiCheckCircle, FiFilter, FiMapPin, FiNavigation,
  FiPhone, FiPlus, FiSun, FiUsers, FiX, FiZap, FiFileText,
} from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { getEmployerDashboard } from "@/services/employer";
import { getLiveApplications, rateApplication } from "@/services/applications";
import { useAuth } from "@/context/AuthContext";
import { fixLeafletIcons } from "@/lib/leaflet";
import { haversine } from "@/lib/geo";
import { getSeenCount } from "@/lib/seenApplications";
import type { Application, ApplicationStatus, Job } from "@/types";


fixLeafletIcons();

const workerMovingIcon = new L.DivIcon({
  html: `<div class="w-[40px] h-[40px] rounded-full bg-amber-500 border-[3px] border-white shadow-[0_3px_12px_rgba(245,158,11,.5)] flex items-center justify-center text-[20px]">🚗</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: "",
});
const jobLocationIcon = new L.DivIcon({
  html: `<div class="w-[40px] h-[40px] rounded-full bg-danger border-[3px] border-white shadow-[0_3px_12px_rgba(232,0,42,.5)] flex items-center justify-center text-[20px]">🏠</div>`,
  iconSize: [40, 40], iconAnchor: [20, 40], className: "",
});

interface StatusStyle {
  label: string;
  text: string;
  solid: string;
  soft: string;
  borderL: string;
  borderSoft: string;
  notify: string;
}

interface NotificationItem {
  id: number;
  text: string;
  cfg: StatusStyle;
  jobTitle?: string;
  workerName?: string;
  status: ApplicationStatus;
  app: Application;
}

const STATUS_CONFIG: Record<ApplicationStatus, StatusStyle> = {
  // Full Tailwind class names (not built dynamically) so Tailwind can see them.
  accepted:   { label: "Worker Accepted Job", text: "text-brand",       solid: "bg-brand",       soft: "bg-brand-light", borderL: "border-l-brand",       borderSoft: "border-brand/[.19]",       notify: "A worker accepted your job!" },
  on_the_way: { label: "Worker On the Way",   text: "text-amber-600",   solid: "bg-amber-500",   soft: "bg-amber-50",    borderL: "border-l-amber-500",   borderSoft: "border-amber-500/[.19]",   notify: "Worker is on the way to you!" },
  arrived:    { label: "Worker Arrived",      text: "text-emerald-600", solid: "bg-emerald-500", soft: "bg-green-50",    borderL: "border-l-emerald-500", borderSoft: "border-emerald-500/[.19]", notify: "Worker has arrived!" },
  completed:  { label: "Job Completed",       text: "text-violet-600",  solid: "bg-violet-500",  soft: "bg-violet-50",   borderL: "border-l-violet-500",  borderSoft: "border-violet-500/[.19]",  notify: "Job done! Please rate the worker." },
};

const STATUS_ICON: Record<ApplicationStatus, ReactNode> = {
  accepted: <FiCheckCircle />,
  on_the_way: <FiNavigation />,
  arrived: <FiMapPin />,
  completed: <FiAward />,
};

const PIPELINE: ApplicationStatus[] = ["accepted", "on_the_way", "arrived", "completed"];

function RatingModal({ app, onDone }: { app: Application; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await rateApplication(app._id, { rating, review });
      onDone();
    } catch { alert("Failed to save"); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.5)] z-[9999] flex items-center justify-center p-5">
      <div className="bg-white rounded-[20px] p-7 w-full max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,.2)]">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-violet-50 text-violet-500 text-[22px] flex items-center justify-center"><FaStar /></div>
        <div className="font-bold text-[18px] text-center mb-1">Rate the Worker</div>
        <div className="text-[13px] text-slate-500 text-center mb-5">{app.worker?.name || app.applicantName}</div>
        <div className="flex justify-center gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`} className={`text-[30px] bg-transparent cursor-pointer transition-all duration-150 ${n <= rating ? "text-amber-400 scale-110" : "text-slate-200"}`}><FaStar /></button>
          ))}
        </div>
        <textarea placeholder="Write a review (optional)" value={review} onChange={(e) => setReview(e.target.value)} className="w-full p-3 rounded-[10px] border border-slate-200 text-[13px] resize-none mb-4 box-border outline-none focus:border-brand" rows={3} />
        <div className="flex gap-2.5">
          <button onClick={onDone} className="flex-1 p-3 bg-slate-100 rounded-[10px] cursor-pointer text-[14px] font-semibold">Skip</button>
          <button onClick={submit} disabled={saving} className="flex-[2] p-3 bg-brand text-white rounded-[10px] cursor-pointer text-[14px] font-semibold">{saving ? "Saving…" : "Submit Rating"}</button>
        </div>
      </div>
    </div>
  );
}

type JobTab = "all" | "active" | "closed";

const QUICK_TRADES = [
  { skill: "Driver", icon: <FaCar /> },
  { skill: "Electrician", icon: <FaBolt /> },
  { skill: "Plumber", icon: <FaWrench /> },
  { skill: "Cook", icon: <FaUtensils /> },
  { skill: "Carpenter", icon: <FaHammer /> },
  { skill: "Painter", icon: <FaPaintRoller /> },
];

interface KpiProps {
  icon: ReactNode;
  tile: string;          // icon tile colours
  bar: string;           // progress bar colour
  badge: string;
  badgeTone: string;
  value: ReactNode;
  label: string;
  pct: number;
  foot: string;
  link?: { href: string; text: string; tone: string };
}

function Kpi({ icon, tile, bar, badge, badgeTone, value, label, pct, foot, link }: KpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-5 flex flex-col">
      <div className="flex items-start justify-between">
        <span className={`w-11 h-11 rounded-xl text-[20px] flex items-center justify-center ${tile}`}>{icon}</span>
        <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${badgeTone}`}>{badge}</span>
      </div>
      <div className="mt-4 text-[30px] font-extrabold text-slate-900 leading-none">{value}</div>
      <div className="mt-1.5 text-[14px] text-slate-500">{label}</div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-slate-500">
        <span className="min-w-0">{foot}</span>
        {link && <Link href={link.href} className={`font-bold no-underline shrink-0 ${link.tone}`}>{link.text} →</Link>}
      </div>
    </div>
  );
}

export default function EmployerDashboard() {
  const { employer } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  // null until read from the browser, so the badge never flashes the full total.
  const [seenApps, setSeenApps] = useState<number | null>(null);
  const [liveApps, setLiveApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifs] = useState<NotificationItem[]>([]);
  const [ratingApp, setRatingApp] = useState<Application | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [tab, setTab] = useState<JobTab>("all");
  const [query, setQuery] = useState("");
  const prevStatuses = useRef<Record<string, ApplicationStatus | undefined>>({});

  useEffect(() => {
    setSeenApps(getSeenCount(employer?._id));
  }, [employer?._id]);

  // Only applications that arrived since the employer last opened the Applications page.
  const newApps = seenApps === null ? 0 : Math.max(0, totalApps - seenApps);

  // The (employer) layout guards the route and the API client signs out on 401.
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await getEmployerDashboard();
      setJobs(data.jobs || []);
      setTotalApps(data.totalApplications || 0);
    } catch {
      // keep the empty state; an expired session is handled centrally
    } finally { setLoading(false); }
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const data = await getLiveApplications();
      const apps = data.applications || [];
      setLiveApps(apps);
      apps.forEach((app) => {
        const prev = prevStatuses.current[app._id];
        const curr = app.status;
        if (prev && curr && prev !== curr && STATUS_CONFIG[curr]) {
          setNotifs((n) => [{ id: Date.now() + Math.random(), text: STATUS_CONFIG[curr].notify, cfg: STATUS_CONFIG[curr], jobTitle: app.job?.jobTitle?.en, workerName: app.worker?.name || app.applicantName, status: curr, app }, ...n].slice(0, 5));
          if (curr === "completed") setRatingApp(app);
          if (Notification.permission === "granted") new Notification(`HireMate — ${STATUS_CONFIG[curr].label}`, { body: `${app.worker?.name || "Worker"} · ${app.job?.jobTitle?.en}` });
        }
        prevStatuses.current[app._id] = curr;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard(); fetchLive();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, [fetchDashboard, fetchLive]);

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const closedJobs = jobs.length - activeJobs;
  const onSite = liveApps.filter((a) => a.status === "arrived" || a.status === "completed").length;
  const completed = liveApps.filter((a) => a.status === "completed").length;

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (tab === "active" && j.status !== "active") return false;
      if (tab === "closed" && j.status === "active") return false;
      if (!q) return true;
      return `${j.jobTitle?.en ?? ""} ${j.location?.en ?? ""}`.toLowerCase().includes(q);
    });
  }, [jobs, tab, query]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = employer?.companyName?.trim();
  const initialsOf = (n?: string) => (n || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const modals = (
    <>
      {ratingApp && <RatingModal app={ratingApp} onDone={() => { setRatingApp(null); fetchDashboard(); fetchLive(); }} />}

      {/* Worker tracking modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-[8888] bg-[rgba(0,0,0,.5)] flex items-end">
          <div className="bg-white w-full rounded-tl-3xl rounded-tr-3xl overflow-hidden h-[85vh] flex flex-col">
            <div className="py-3.5 px-5 flex justify-between items-center border-b border-b-slate-100">
              <div>
                <div className="font-bold text-[16px] flex items-center gap-2"><FiMapPin className="text-blue-600" /> Live Worker Location</div>
                <div className="text-[13px] text-slate-500">{selectedApp.worker?.name} · {selectedApp.job?.jobTitle?.en}</div>
              </div>
              <button onClick={() => setSelectedApp(null)} className="bg-slate-100 rounded-lg py-1.5 px-3.5 cursor-pointer font-semibold flex items-center gap-1.5"><FiX /> Close</button>
            </div>
            {selectedApp.status && STATUS_CONFIG[selectedApp.status] && (
              <div className={`py-2 px-5 flex items-center gap-2 text-[13px] ${STATUS_CONFIG[selectedApp.status].soft}`}>
                <span className={`text-[18px] ${STATUS_CONFIG[selectedApp.status].text}`}>{STATUS_ICON[selectedApp.status]}</span>
                <span className={`font-semibold ${STATUS_CONFIG[selectedApp.status].text}`}>{STATUS_CONFIG[selectedApp.status].label}</span>
                {selectedApp.worker?.currentLocation?.lat && selectedApp.job?.latitude && (
                  <span className="text-slate-500 ml-auto">
                    {haversine(selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng, selectedApp.job.latitude, (selectedApp.job.longitude ?? 0)).toFixed(1)} km away
                  </span>
                )}
              </div>
            )}
            <div className="flex-1 min-h-[0px]">
              {selectedApp.job?.latitude ? (
                <MapContainer center={selectedApp.worker?.currentLocation?.lat ? [selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng] : [selectedApp.job.latitude, (selectedApp.job.longitude ?? 0)]} zoom={14} className="h-full w-full">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[selectedApp.job.latitude, (selectedApp.job.longitude ?? 0)]} icon={jobLocationIcon}>
                    <Popup>🏠 Your Location<br />{selectedApp.job.location?.en}</Popup>
                  </Marker>
                  {selectedApp.worker?.currentLocation?.lat && (
                    <Marker position={[selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng]} icon={workerMovingIcon}>
                      <Popup>🚗 {selectedApp.worker.name}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No location data</div>
              )}
            </div>
            <div className="pt-4 px-5 pb-6 border-t border-t-slate-100 flex justify-between items-center">
              <div>
                <div className="font-bold">{selectedApp.worker?.name || selectedApp.applicantName}</div>
                <div className="text-[13px] text-slate-500 flex items-center gap-1.5"><FiPhone /> {selectedApp.worker?.phone || selectedApp.applicantContact}</div>
              </div>
              {selectedApp.status === "completed" && (
                <button onClick={() => { setSelectedApp(null); setRatingApp(selectedApp); }} className="py-2.5 px-[18px] bg-violet-500 text-white rounded-[10px] cursor-pointer font-semibold text-[13px] flex items-center gap-2"><FaStar /> Rate Worker</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <EmployerShell search={query} onSearch={setQuery} applicationBadge={newApps} hasUnread={notifications.length > 0}>
      {modals}

      {loading ? (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-pulse">
          <div className="h-[130px] rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[190px] rounded-2xl bg-slate-200" />)}</div>
          <div className="h-[280px] rounded-2xl bg-slate-200" />
        </div>
      ) : (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">

          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#E6EFFD,#D9E6FB)] border border-blue-100 px-6 py-6 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="absolute -right-10 -bottom-16 w-64 h-64 rounded-full bg-white/40" />
            <div className="relative">
              <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold text-[#0F1F4B] flex items-center gap-2.5 flex-wrap">
                {greeting}{name ? `, ${name}` : ""}! <FiSun className="text-amber-400" />
              </h1>
              <p className="m-0 mt-2 text-[15px] text-slate-700">
                {liveApps.length > 0
                  ? <>You have <b>{liveApps.length} worker{liveApps.length > 1 ? "s" : ""}</b> active across <b>{activeJobs} active job{activeJobs === 1 ? "" : "s"}</b>.</>
                  : activeJobs > 0
                    ? <>You have <b>{activeJobs} active job{activeJobs > 1 ? "s" : ""}</b> open for applicants.</>
                    : "Post a job to start receiving applicants."}
              </p>
              {liveApps.length > 0 && <p className="m-0 mt-0.5 text-[13px] text-slate-500">{onSite} of {liveApps.length} have reached the site.</p>}
            </div>
            <div className="relative flex flex-wrap gap-3">
              <Link href="/applications" className="flex items-center gap-2 bg-white border border-blue-300 text-blue-600 no-underline rounded-xl px-5 py-2.5 font-bold text-[13px]"><FiFileText /> Applications</Link>
              <Link href="/post-job" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white no-underline rounded-xl px-5 py-2.5 font-bold text-[13px] shadow-[0_4px_12px_rgba(37,99,235,.3)]"><FiPlus /> Post New Job</Link>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi
              icon={<FiUsers />} tile="bg-blue-50 text-blue-600" bar="bg-blue-500"
              badge={`${onSite} on site`} badgeTone="bg-emerald-50 text-emerald-600"
              value={liveApps.length} label="Active Workers Today"
              pct={liveApps.length ? (onSite / liveApps.length) * 100 : 0}
              foot={liveApps.length ? `${liveApps.length - onSite} still on the way` : "No workers active yet"}
            />
            <Kpi
              icon={<FiCalendar />} tile="bg-violet-50 text-violet-600" bar="bg-violet-500"
              badge={`${closedJobs} closed`} badgeTone="bg-amber-50 text-amber-600"
              value={activeJobs} label="Active Jobs"
              pct={jobs.length ? (activeJobs / jobs.length) * 100 : 0}
              foot={`${jobs.length} posted in total`}
              link={{ href: "#jobs", text: "View All", tone: "text-violet-600" }}
            />
            <Kpi
              icon={<FiFileText />} tile="bg-red-50 text-red-500" bar="bg-red-500"
              badge="Applicants" badgeTone="bg-red-50 text-red-500"
              value={totalApps} label="Total Applicants"
              pct={totalApps ? 100 : 0}
              foot="Across all your jobs"
              link={{ href: "/applications", text: "Review", tone: "text-red-500" }}
            />
            <Kpi
              icon={<FiCheckCircle />} tile="bg-emerald-50 text-emerald-600" bar="bg-emerald-500"
              badge="Today" badgeTone="bg-emerald-50 text-emerald-600"
              value={completed} label="Jobs Completed"
              pct={liveApps.length ? (completed / liveApps.length) * 100 : 0}
              foot={completed ? "Rate your workers" : "None finished yet"}
            />
          </div>

          {/* Quick worker request */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <FiZap className="text-amber-400 text-[26px]" />
              <span className="text-[12px] font-extrabold text-[#0F1F4B] leading-tight uppercase tracking-wide">1-Click Quick<br />Worker Request!</span>
            </div>
            <div className="flex-1 flex flex-wrap gap-2.5">
              {QUICK_TRADES.map((t) => (
                <Link key={t.skill} href={`/post-job?skill=${encodeURIComponent(t.skill)}`} className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 no-underline px-4 py-2.5 text-[12px] font-semibold">
                  <span className="text-slate-500">{t.icon}</span> {t.skill}
                </Link>
              ))}
              <Link href="/post-job" className="flex items-center rounded-xl bg-blue-50 text-blue-600 no-underline px-4 py-2.5 text-[12px] font-bold ml-auto">Custom Job Spec</Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">

            {/* Jobs */}
            <section id="jobs" className="flex flex-col gap-4 min-w-0 scroll-mt-20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-[18px] font-extrabold text-[#0F1F4B] flex items-center gap-3">
                  Your Job Postings
                  <span className="text-[11px] font-bold rounded-full bg-blue-50 text-blue-600 px-2.5 py-1">{activeJobs} Active</span>
                </h2>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600">
                  <FiFilter className="text-slate-400" />
                  <select value={tab} onChange={(e) => setTab(e.target.value as JobTab)} className="bg-transparent outline-none font-semibold cursor-pointer">
                    <option value="all">Filter: All ({jobs.length})</option>
                    <option value="active">Filter: Active ({activeJobs})</option>
                    <option value="closed">Filter: Closed ({closedJobs})</option>
                  </select>
                </label>
              </div>

              {jobs.length === 0 ? (
                <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-10 text-center">
                  <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 text-blue-600 text-[26px] flex items-center justify-center"><FiBriefcase /></span>
                  <div className="font-bold text-slate-900">No jobs posted yet</div>
                  <div className="text-[13px] text-slate-500 mt-1 mb-4">Post your first job and workers can apply right away.</div>
                  <Link href="/post-job" className="inline-flex items-center gap-2 bg-blue-600 text-white no-underline rounded-xl px-5 py-2.5 font-bold text-[13px]"><FiPlus /> Post your first job</Link>
                </div>
              ) : visibleJobs.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center text-[13px] text-slate-500">No jobs match your search or filter.</div>
              ) : visibleJobs.map((job) => {
                const active = job.status === "active";
                return (
                  <div key={job._id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className={`rounded-md px-2.5 py-1 ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active ? "● Active" : "Closed"}</span>
                        {job.isUrgent && <span className="rounded-md px-2.5 py-1 bg-amber-50 text-amber-700">Urgent</span>}
                        {job.paymentMethod && <span className="rounded-md px-2.5 py-1 bg-blue-50 text-blue-600">{job.paymentMethod}</span>}
                      </div>
                      <h3 className="m-0 mt-2.5 text-[16px] font-extrabold text-[#0F1F4B] leading-snug">{job.jobTitle?.en}</h3>
                      <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500"><FiMapPin className="text-slate-400 shrink-0" /> <span className="truncate">{job.location?.en}</span></div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-slate-500">
                        <span>Daily Wage <b className="text-slate-900 text-[14px] ml-1">₹{job.salary}</b> <span className="text-slate-400">/worker</span></span>
                        <span className="flex items-center gap-1.5 text-blue-600 font-semibold"><FiUsers /> {job.applicationCount || 0} applicant{(job.applicationCount || 0) === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    <Link href="/applications" className="shrink-0 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white no-underline rounded-xl px-5 py-2.5 font-bold text-[13px]">View Applicants <FiArrowRight /></Link>
                  </div>
                );
              })}

              {/* More hands CTA */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 text-[18px] flex items-center justify-center shrink-0"><FiPlus /></span>
                <div className="flex-1">
                  <div className="font-bold text-[14px] text-[#0F1F4B]">Need more hands for tomorrow or weekend shifts?</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Post a new job and workers can apply right away.</div>
                </div>
                <Link href="/post-job" className="rounded-lg bg-blue-50 text-blue-600 no-underline px-4 py-2 text-[12px] font-bold text-center">+ Post a Job</Link>
              </div>
            </section>

            {/* Right column */}
            <aside className="flex flex-col gap-5">
              <section id="workers" className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] overflow-hidden scroll-mt-20">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="m-0 text-[18px] font-extrabold text-[#0F1F4B] flex items-center gap-2.5">
                    Live Roll Call <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                  </h2>
                  <span className="text-[12px] font-bold text-blue-600">{liveApps.length} active</span>
                </div>
                {liveApps.length === 0 ? (
                  <p className="m-0 px-5 pb-6 text-[13px] text-slate-500 leading-relaxed">When a worker accepts one of your jobs they appear here with live status and location.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {liveApps.map((app) => {
                      const st = (app.status && STATUS_CONFIG[app.status]) ? app.status : "accepted";
                      const sc = STATUS_CONFIG[st];
                      const live = !!app.worker?.currentLocation?.lat;
                      const wname = app.worker?.name || app.applicantName;
                      return (
                        <button key={app._id} onClick={() => setSelectedApp(app)} className="w-full text-left flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50">
                          <span className="relative w-11 h-11 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[13px] font-bold flex items-center justify-center shrink-0">
                            {initialsOf(wname)}
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${live ? "bg-emerald-500" : "bg-slate-300"}`} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-[13px] text-slate-900 truncate">{wname}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{app.job?.jobTitle?.en}</span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${sc.soft} ${sc.text}`}>{sc.label.replace("Worker ", "")}</span>
                            <span className="block text-[10px] text-slate-400 mt-1">{live ? "Live GPS" : "No GPS"} · Track →</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-5">
                <h2 className="m-0 mb-4 text-[15px] font-extrabold text-[#0F1F4B] flex items-center gap-2"><FiBell className="text-blue-600" /> Recent Activity</h2>
                {notifications.length === 0 ? (
                  <p className="m-0 text-[13px] text-slate-500 leading-relaxed">Updates appear here when a worker accepts, sets off, arrives or finishes a job.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {notifications.map((n) => (
                      <div key={n.id} className={`rounded-xl bg-slate-50 border-l-4 ${n.cfg.borderL} px-3.5 py-3 flex items-start gap-2.5`}>
                        <span className={`text-[17px] mt-0.5 ${n.cfg.text}`}>{STATUS_ICON[n.status]}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-[13px] ${n.cfg.text}`}>{n.text}</div>
                          <div className="text-[12px] text-slate-500 mt-0.5 truncate">{n.workerName} · {n.jobTitle}</div>
                          <button onClick={() => { setSelectedApp(n.app); setNotifs((x) => x.filter((i) => i.id !== n.id)); }} className={`mt-2 text-white rounded-lg px-3 py-1 text-[11px] font-bold cursor-pointer ${n.cfg.solid}`}>Track →</button>
                        </div>
                        <button onClick={() => setNotifs((x) => x.filter((i) => i.id !== n.id))} aria-label="Dismiss" className="text-slate-400 text-[16px] cursor-pointer"><FiX /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      )}
    </EmployerShell>
  );
}