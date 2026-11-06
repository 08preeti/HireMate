"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  FaBolt,
  FaCar,
  FaHammer,
  FaPaintRoller,
  FaStar,
  FaUtensils,
  FaWrench,
} from "react-icons/fa";
import {
  FiArrowRight,
  FiAward,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiFilter,
  FiMapPin,
  FiNavigation,
  FiPhone,
  FiPlus,
  FiSun,
  FiUsers,
  FiX,
  FiZap,
  FiFileText,
} from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { getEmployerDashboard } from "@/services/employer";
import { getLiveApplications, rateApplication } from "@/services/applications";
import { useAuth } from "@/context/AuthContext";
import { fixLeafletIcons } from "@/lib/leaflet";
import { haversine } from "@/lib/geo";
import { getSeenCount } from "@/lib/seenApplications";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import type { Application, ApplicationStatus, EmployerJob, EmployerJobsSummary, LiveApplication } from "@/types";
import { STATUS_LABEL, STATUS_TONE, jobStatusOf } from "./jobs/jobHelpers";

fixLeafletIcons();

const workerMovingIcon = new L.DivIcon({
  html: `<div class="w-[40px] h-[40px] rounded-full bg-amber-500 border-[3px] border-white shadow-[0_3px_12px_rgba(245,158,11,.5)] flex items-center justify-center text-[20px]">🚗</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: "",
});
const jobLocationIcon = new L.DivIcon({
  html: `<div class="w-[40px] h-[40px] rounded-full bg-danger border-[3px] border-white shadow-[0_3px_12px_rgba(232,0,42,.5)] flex items-center justify-center text-[20px]">🏠</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  className: "",
});

interface StatusStyle {
  label: EmployerKey;
  text: string;
  solid: string;
  soft: string;
  borderL: string;
  borderSoft: string;
  notify: EmployerKey;
}

interface NotificationItem {
  id: number;
  text: EmployerKey;
  cfg: StatusStyle;
  workerName?: string;
  status: ApplicationStatus;
  app: LiveApplication;
}

const STATUS_CONFIG: Record<ApplicationStatus, StatusStyle> = {
  // Full Tailwind class names (not built dynamically) so Tailwind can see them.
  accepted: {
    label: "st_accepted",
    text: "text-brand",
    solid: "bg-brand",
    soft: "bg-brand-light",
    borderL: "border-l-brand",
    borderSoft: "border-brand/[.19]",
    notify: "notify_accepted",
  },
  on_the_way: {
    label: "st_on_the_way",
    text: "text-amber-600",
    solid: "bg-amber-500",
    soft: "bg-amber-50",
    borderL: "border-l-amber-500",
    borderSoft: "border-amber-500/[.19]",
    notify: "notify_on_the_way",
  },
  arrived: {
    label: "st_arrived",
    text: "text-emerald-600",
    solid: "bg-emerald-500",
    soft: "bg-green-50",
    borderL: "border-l-emerald-500",
    borderSoft: "border-emerald-500/[.19]",
    notify: "notify_arrived",
  },
  completed: {
    label: "st_completed",
    text: "text-violet-600",
    solid: "bg-violet-500",
    soft: "bg-violet-50",
    borderL: "border-l-violet-500",
    borderSoft: "border-violet-500/[.19]",
    notify: "notify_completed",
  },
};

const STATUS_ICON: Record<ApplicationStatus, ReactNode> = {
  accepted: <FiCheckCircle />,
  on_the_way: <FiNavigation />,
  arrived: <FiMapPin />,
  completed: <FiAward />,
};

const PIPELINE: ApplicationStatus[] = [
  "accepted",
  "on_the_way",
  "arrived",
  "completed",
];

function RatingModal({
  app,
  onDone,
}: {
  app: Application;
  onDone: () => void;
}) {
  const { tr } = useEmployerT();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await rateApplication(app._id, { rating, review });
      onDone();
    } catch {
      alert(tr("failedSave"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.5)] z-[9999] flex items-center justify-center p-5">
      <div className="bg-white rounded-[20px] p-7 w-full max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,.2)]">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-violet-50 text-violet-500 text-[22px] flex items-center justify-center">
          <FaStar />
        </div>
        <div className="font-bold text-[18px] text-center mb-1">
          {tr("rateTheWorker")}
        </div>
        <div className="text-[13px] text-slate-500 text-center mb-5">
          {app.worker?.name || app.applicantName}
        </div>
        <div className="flex justify-center gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n} star`}
              className={`text-[30px] bg-transparent cursor-pointer transition-all duration-150 ${n <= rating ? "text-amber-400 scale-110" : "text-slate-200"}`}
            >
              <FaStar />
            </button>
          ))}
        </div>
        <textarea
          placeholder={tr("reviewPlaceholder")}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="w-full p-3 rounded-[10px] border border-slate-200 text-[13px] resize-none mb-4 box-border outline-none focus:border-brand"
          rows={3}
        />
        <div className="flex gap-2.5">
          <button
            onClick={onDone}
            className="flex-1 p-3 bg-slate-100 rounded-[10px] cursor-pointer text-[14px] font-semibold"
          >
            {tr("skip")}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-[2] p-3 bg-brand text-white rounded-[10px] cursor-pointer text-[14px] font-semibold"
          >
            {saving ? tr("saving") : tr("submitRating")}
          </button>
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
  tile: string; // icon tile colours
  bar: string; // progress bar colour
  badge: string;
  badgeTone: string;
  value: ReactNode;
  label: string;
  pct: number;
  foot: string;
  link?: { href: string; text: string; tone: string };
}

function Kpi({
  icon,
  tile,
  bar,
  badge,
  badgeTone,
  value,
  label,
  pct,
  foot,
  link,
}: KpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-5 flex flex-col">
      <div className="flex items-start justify-between">
        <span
          className={`w-11 h-11 rounded-xl text-[20px] flex items-center justify-center ${tile}`}
        >
          {icon}
        </span>
        <span
          className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${badgeTone}`}
        >
          {badge}
        </span>
      </div>
      <div className="mt-4 text-[30px] font-extrabold text-slate-900 leading-none">
        {value}
      </div>
      <div className="mt-1.5 text-[14px] text-slate-500">{label}</div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-slate-500">
        <span className="min-w-0">{foot}</span>
        {link && (
          <Link
            href={link.href}
            className={`font-bold no-underline shrink-0 ${link.tone}`}
          >
            {link.text} →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function EmployerDashboard() {
  const { employer } = useAuth();
  const { tr, trp, rich, loc } = useEmployerT();
  // Latest translators for the 5-second polling callback (it is created only once).
  const trRef = useRef(tr);
  trRef.current = tr;
  const locRef = useRef(loc);
  locRef.current = loc;
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [stats, setStats] = useState<EmployerJobsSummary | null>(null);
  const [totalApps, setTotalApps] = useState(0);
  // null until read from the browser, so the badge never flashes the full total.
  const [seenApps, setSeenApps] = useState<number | null>(null);
  const [liveApps, setLiveApps] = useState<LiveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifs] = useState<NotificationItem[]>([]);
  const [ratingApp, setRatingApp] = useState<LiveApplication | null>(null);
  const [selectedApp, setSelectedApp] = useState<LiveApplication | null>(null);
  const [tab, setTab] = useState<JobTab>("all");
  const [query, setQuery] = useState("");
  const prevStatuses = useRef<Record<string, ApplicationStatus | undefined>>(
    {},
  );

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
      setStats(data.stats ?? null);
    } catch {
      // keep the empty state; an expired session is handled centrally
    } finally {
      setLoading(false);
    }
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
          setNotifs((n) =>
            [
              {
                id: Date.now() + Math.random(),
                text: STATUS_CONFIG[curr].notify,
                cfg: STATUS_CONFIG[curr],
                workerName: app.worker?.name || app.applicantName,
                status: curr,
                app,
              },
              ...n,
            ].slice(0, 5),
          );
          if (curr === "completed") setRatingApp(app);
          if (Notification.permission === "granted")
            new Notification(
              `HireMate — ${trRef.current(STATUS_CONFIG[curr].label)}`,
              {
                body: `${app.worker?.name || trRef.current("worker")} · ${locRef.current(app.job?.jobTitle)}`,
              },
            );
        }
        prevStatuses.current[app._id] = curr;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchLive();
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission();
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, [fetchDashboard, fetchLive]);

  const activeJobs = stats?.activeJobs ?? jobs.filter((j) => j.status === "active").length;
  const closedJobs = stats?.closedJobs ?? 0;
  const onSite = liveApps.filter(
    (a) => a.status === "arrived" || a.status === "completed",
  ).length;
  const completed = liveApps.filter((a) => a.status === "completed").length;

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (tab === "active" && j.status !== "active") return false;
      if (tab === "closed" && j.status === "active") return false;
      if (!q) return true;
      return `${j.jobTitle?.en ?? ""} ${j.location?.en ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, tab, query]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? tr("greet_morning")
      : hour < 17
        ? tr("greet_afternoon")
        : tr("greet_evening");
  const name = employer?.companyName?.trim();
  const payLabel = (m: string) =>
    m === "Cash" || m === "UPI" ? tr(`pay_${m}` as EmployerKey) : m;
  const initialsOf = (n?: string) =>
    (n || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const modals = (
    <>
      {ratingApp && (
        <RatingModal
          app={ratingApp}
          onDone={() => {
            setRatingApp(null);
            fetchDashboard();
            fetchLive();
          }}
        />
      )}

      {/* Worker tracking modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-[8888] bg-[rgba(0,0,0,.5)] flex items-end">
          <div className="bg-white w-full rounded-tl-3xl rounded-tr-3xl overflow-hidden h-[85vh] flex flex-col">
            <div className="py-3.5 px-5 flex justify-between items-center border-b border-b-slate-100">
              <div>
                <div className="font-bold text-[16px] flex items-center gap-2">
                  <FiMapPin className="text-blue-600" />{" "}
                  {tr("liveWorkerLocation")}
                </div>
                <div className="text-[13px] text-slate-500">
                  {selectedApp.worker?.name} · {loc(selectedApp.job?.jobTitle)}
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="bg-slate-100 rounded-lg py-1.5 px-3.5 cursor-pointer font-semibold flex items-center gap-1.5"
              >
                <FiX /> {tr("close")}
              </button>
            </div>
            {selectedApp.status && STATUS_CONFIG[selectedApp.status] && (
              <div
                className={`py-2 px-5 flex items-center gap-2 text-[13px] ${STATUS_CONFIG[selectedApp.status].soft}`}
              >
                <span
                  className={`text-[18px] ${STATUS_CONFIG[selectedApp.status].text}`}
                >
                  {STATUS_ICON[selectedApp.status]}
                </span>
                <span
                  className={`font-semibold ${STATUS_CONFIG[selectedApp.status].text}`}
                >
                  {tr(STATUS_CONFIG[selectedApp.status].label)}
                </span>
                {selectedApp.worker?.currentLocation?.lat &&
                  selectedApp.job?.latitude && (
                    <span className="text-slate-500 ml-auto">
                      {tr("kmAway", {
                        n: haversine(
                          selectedApp.worker.currentLocation.lat,
                          selectedApp.worker.currentLocation.lng,
                          selectedApp.job.latitude,
                          selectedApp.job.longitude ?? 0,
                        ).toFixed(1),
                      })}
                    </span>
                  )}
              </div>
            )}
            <div className="flex-1 min-h-[0px]">
              {selectedApp.job?.latitude ? (
                <MapContainer
                  center={
                    selectedApp.worker?.currentLocation?.lat
                      ? [
                          selectedApp.worker.currentLocation.lat,
                          selectedApp.worker.currentLocation.lng,
                        ]
                      : [
                          selectedApp.job.latitude,
                          selectedApp.job.longitude ?? 0,
                        ]
                  }
                  zoom={14}
                  className="h-full w-full"
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker
                    position={[
                      selectedApp.job.latitude,
                      selectedApp.job.longitude ?? 0,
                    ]}
                    icon={jobLocationIcon}
                  >
                    <Popup>
                      🏠 {tr("yourLocation")}
                      <br />
                      {loc(selectedApp.job.location)}
                    </Popup>
                  </Marker>
                  {selectedApp.worker?.currentLocation?.lat && (
                    <Marker
                      position={[
                        selectedApp.worker.currentLocation.lat,
                        selectedApp.worker.currentLocation.lng,
                      ]}
                      icon={workerMovingIcon}
                    >
                      <Popup>🚗 {selectedApp.worker.name}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  {tr("noLocation")}
                </div>
              )}
            </div>
            <div className="pt-4 px-5 pb-6 border-t border-t-slate-100 flex justify-between items-center">
              <div>
                <div className="font-bold">
                  {selectedApp.worker?.name || selectedApp.applicantName}
                </div>
                <div className="text-[13px] text-slate-500 flex items-center gap-1.5">
                  <FiPhone />{" "}
                  {selectedApp.worker?.phone || selectedApp.applicantContact}
                </div>
              </div>
              {selectedApp.status === "completed" && (
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setRatingApp(selectedApp);
                  }}
                  className="py-2.5 px-[18px] bg-violet-500 text-white rounded-[10px] cursor-pointer font-semibold text-[13px] flex items-center gap-2"
                >
                  <FaStar /> {tr("rateWorkerBtn")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <EmployerShell
      search={query}
      onSearch={setQuery}
      applicationBadge={newApps}
      hasUnread={notifications.length > 0}
    >
      {modals}

      {loading ? (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-pulse">
          <div className="h-[130px] rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[190px] rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-[280px] rounded-2xl bg-slate-200" />
        </div>
      ) : (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#E6EFFD,#D9E6FB)] border border-blue-100 px-6 py-6 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="absolute -right-10 -bottom-16 w-64 h-64 rounded-full bg-white/40" />
            <div className="relative">
              <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold text-[#0F1F4B] flex items-center gap-2.5 flex-wrap">
                {greeting}
                {name ? `, ${name}` : ""}! <FiSun className="text-amber-400" />
              </h1>
              <p className="m-0 mt-2 text-[15px] text-slate-700">
                {liveApps.length > 0
                  ? rich("hero_live", {
                      workers: trp("workersCount", liveApps.length),
                      jobs: trp("activeJobsCount", activeJobs),
                    })
                  : activeJobs > 0
                    ? rich("hero_open", {
                        jobs: trp("activeJobsCount", activeJobs),
                      })
                    : tr("hero_empty")}
              </p>
              {liveApps.length > 0 && (
                <p className="m-0 mt-0.5 text-[13px] text-slate-500">
                  {tr("hero_reached", { onSite, total: liveApps.length })}
                </p>
              )}
            </div>
            <div className="relative flex flex-wrap gap-3">
              <Link
                href="/applications"
                className="flex items-center gap-2 bg-white border border-blue-300 text-blue-600 no-underline rounded-xl px-5 py-2.5 font-bold text-[13px]"
              >
                <FiFileText /> {tr("applications")}
              </Link>
              <Link
                href="/post-job"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white no-underline rounded-xl px-5 py-2.5 font-bold text-[13px] shadow-[0_4px_12px_rgba(37,99,235,.3)]"
              >
                <FiPlus /> {tr("postNewJob")}
              </Link>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi
              icon={<FiUsers />}
              tile="bg-blue-50 text-blue-600"
              bar="bg-blue-500"
              badge={tr("kpi_onSite", { n: onSite })}
              badgeTone="bg-emerald-50 text-emerald-600"
              value={liveApps.length}
              label={tr("kpi_activeWorkers")}
              pct={liveApps.length ? (onSite / liveApps.length) * 100 : 0}
              foot={
                liveApps.length
                  ? tr("kpi_stillOnWay", { n: liveApps.length - onSite })
                  : tr("kpi_noWorkers")
              }
            />
            <Kpi
              icon={<FiCalendar />}
              tile="bg-violet-50 text-violet-600"
              bar="bg-violet-500"
              badge={tr("kpi_closed", { n: closedJobs })}
              badgeTone="bg-amber-50 text-amber-600"
              value={activeJobs}
              label={tr("kpi_activeJobs")}
              pct={jobs.length ? (activeJobs / jobs.length) * 100 : 0}
              foot={tr("kpi_postedTotal", { n: jobs.length })}
              link={{
                href: "#jobs",
                text: tr("kpi_viewAll"),
                tone: "text-violet-600",
              }}
            />
            <Kpi
              icon={<FiFileText />}
              tile="bg-red-50 text-red-500"
              bar="bg-red-500"
              badge={tr("kpi_applicants")}
              badgeTone="bg-red-50 text-red-500"
              value={totalApps}
              label={tr("kpi_totalApplicants")}
              pct={totalApps ? 100 : 0}
              foot={tr("kpi_acrossJobs")}
              link={{
                href: "/applications",
                text: tr("kpi_review"),
                tone: "text-red-500",
              }}
            />
            <Kpi
              icon={<FiCheckCircle />}
              tile="bg-emerald-50 text-emerald-600"
              bar="bg-emerald-500"
              badge={tr("kpi_today")}
              badgeTone="bg-emerald-50 text-emerald-600"
              value={completed}
              label={tr("kpi_jobsCompleted")}
              pct={liveApps.length ? (completed / liveApps.length) * 100 : 0}
              foot={completed ? tr("kpi_rateWorkers") : tr("kpi_noneFinished")}
            />
          </div>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
              {(
                [
                  { label: "kpi_activeJobs", value: stats.activeJobs, href: "/employer-jobs" },
                  { label: "ds_filledJobs", value: stats.filledJobs, href: "/employer-jobs" },
                  { label: "ds_completedJobs", value: stats.completedJobs, href: "/employer-jobs" },
                  { label: "kpi_totalApplicants", value: stats.totalApplications, href: "/applications" },
                  { label: "ds_pending", value: stats.pendingApplications, href: "/applications?tab=new" },
                  { label: "ds_confirmed", value: stats.confirmedWorkers, href: "/applications?tab=confirmed" },
                  { label: "ds_available", value: stats.availableVacancies, href: "/employer-jobs" },
                ] as { label: EmployerKey; value: number; href: string }[]
              ).map((t) => (
                <Link key={t.label} href={t.href} className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] px-4 py-3 no-underline">
                  <span className="block text-[22px] font-extrabold text-[#0F1F4B] leading-none">{t.value}</span>
                  <span className="mt-1 block text-[12px] text-slate-500">{tr(t.label)}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Quick worker request */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <FiZap className="text-amber-400 text-[26px]" />
              <span className="text-[12px] font-extrabold text-[#0F1F4B] leading-tight uppercase tracking-wide">
                {tr("quick_1")}
                <br />
                {tr("quick_2")}
              </span>
            </div>
            <div className="flex-1 flex flex-wrap gap-2.5">
              {QUICK_TRADES.map((t) => (
                <Link
                  key={t.skill}
                  href={`/post-job?skill=${encodeURIComponent(t.skill)}`}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 no-underline px-4 py-2.5 text-[12px] font-semibold"
                >
                  <span className="text-slate-500">{t.icon}</span>{" "}
                  {tr(`trade_${t.skill}` as EmployerKey)}
                </Link>
              ))}
              <Link
                href="/post-job"
                className="flex items-center rounded-xl bg-blue-50 text-blue-600 no-underline px-4 py-2.5 text-[12px] font-bold ml-auto"
              >
                {tr("customSpec")}
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
            {/* Jobs */}
            <section
              id="jobs"
              className="flex flex-col gap-4 min-w-0 scroll-mt-20"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-[18px] font-extrabold text-[#0F1F4B] flex items-center gap-3">
                  {tr("yourJobs")}
                  <span className="text-[11px] font-bold rounded-full bg-blue-50 text-blue-600 px-2.5 py-1">
                    {tr("activeCount", { n: activeJobs })}
                  </span>
                </h2>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600">
                  <FiFilter className="text-slate-400" />
                  <select
                    value={tab}
                    onChange={(e) => setTab(e.target.value as JobTab)}
                    className="bg-transparent outline-none font-semibold cursor-pointer"
                  >
                    <option value="all">
                      {tr("filter_all", { n: jobs.length })}
                    </option>
                    <option value="active">
                      {tr("filter_active", { n: activeJobs })}
                    </option>
                    <option value="closed">
                      {tr("filter_closed", { n: jobs.length - activeJobs })}
                    </option>
                  </select>
                </label>
              </div>

              {jobs.length === 0 ? (
                <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-10 text-center">
                  <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 text-blue-600 text-[26px] flex items-center justify-center">
                    <FiBriefcase />
                  </span>
                  <div className="font-bold text-slate-900">{tr("noJobs")}</div>
                  <div className="text-[13px] text-slate-500 mt-1 mb-4">
                    {tr("noJobsSub")}
                  </div>
                  <Link
                    href="/post-job"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white no-underline rounded-xl px-5 py-2.5 font-bold text-[13px]"
                  >
                    <FiPlus /> {tr("postFirst")}
                  </Link>
                </div>
              ) : visibleJobs.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center text-[13px] text-slate-500">
                  {tr("noMatch")}
                </div>
              ) : (
                visibleJobs.map((job) => {
                  return (
                    <div
                      key={job._id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span
                            className={`rounded-md px-2.5 py-1 ${STATUS_TONE[jobStatusOf(job.status)]}`}
                          >
                            {tr(STATUS_LABEL[jobStatusOf(job.status)])}
                          </span>
                          {job.isUrgent && (
                            <span className="rounded-md px-2.5 py-1 bg-amber-50 text-amber-700">
                              {tr("tag_urgent")}
                            </span>
                          )}
                          {job.paymentMethod && (
                            <span className="rounded-md px-2.5 py-1 bg-blue-50 text-blue-600">
                              {payLabel(job.paymentMethod)}
                            </span>
                          )}
                        </div>
                        <h3 className="m-0 mt-2.5 text-[16px] font-extrabold text-[#0F1F4B] leading-snug">
                          {loc(job.jobTitle)}
                        </h3>
                        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500">
                          <FiMapPin className="text-slate-400 shrink-0" />{" "}
                          <span className="truncate">{loc(job.location)}</span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-slate-500">
                          <span>
                            {tr("dailyWage")}{" "}
                            <b className="text-slate-900 text-[14px] ml-1">
                              ₹{job.salary}
                            </b>{" "}
                            <span className="text-slate-400">
                              {tr("perWorker")}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                            <FiUsers />{" "}
                            {trp("applicants", job.applicationCount || 0)}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                            {tr("jm_total")}: {job.stats.totalVacancies} · {tr("jm_confirmedW")}: {job.stats.confirmedWorkers} · {tr("jm_available")}: {job.stats.availableVacancies}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        <Link
                          href={`/applications?job=${job._id}`}
                          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white no-underline rounded-xl px-5 py-2.5 font-bold text-[13px]"
                        >
                          {tr("viewApplicants")} <FiArrowRight />
                        </Link>
                        <Link
                          href={`/employer-jobs/${job._id}`}
                          className="flex items-center justify-center border border-slate-300 text-slate-700 no-underline rounded-xl px-5 py-2 font-semibold text-[13px] hover:bg-slate-50"
                        >
                          {tr("jm_view")}
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}

              {/* More hands CTA */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 text-[18px] flex items-center justify-center shrink-0">
                  <FiPlus />
                </span>
                <div className="flex-1">
                  <div className="font-bold text-[14px] text-[#0F1F4B]">
                    {tr("moreHands")}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    {tr("moreHandsSub")}
                  </div>
                </div>
                <Link
                  href="/post-job"
                  className="rounded-lg bg-blue-50 text-blue-600 no-underline px-4 py-2 text-[12px] font-bold text-center"
                >
                  {tr("postAJob")}
                </Link>
              </div>
            </section>

            {/* Right column */}
            <aside className="flex flex-col gap-5">
              <section
                id="workers"
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] overflow-hidden scroll-mt-20"
              >
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="m-0 text-[18px] font-extrabold text-[#0F1F4B] flex items-center gap-2.5">
                    {tr("liveRollCall")}{" "}
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                  </h2>
                  <span className="text-[12px] font-bold text-blue-600">
                    {tr("nActive", { n: liveApps.length })}
                  </span>
                </div>
                {liveApps.length === 0 ? (
                  <p className="m-0 px-5 pb-6 text-[13px] text-slate-500 leading-relaxed">
                    {tr("rollEmpty")}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {liveApps.map((app) => {
                      const st =
                        app.status && STATUS_CONFIG[app.status]
                          ? app.status
                          : "accepted";
                      const sc = STATUS_CONFIG[st];
                      const live = !!app.worker?.currentLocation?.lat;
                      const wname = app.worker?.name || app.applicantName;
                      return (
                        <button
                          key={app._id}
                          onClick={() => setSelectedApp(app)}
                          className="w-full text-left flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50"
                        >
                          <span className="relative w-11 h-11 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[13px] font-bold flex items-center justify-center shrink-0">
                            {initialsOf(wname)}
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${live ? "bg-emerald-500" : "bg-slate-300"}`}
                            />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-[13px] text-slate-900 truncate">
                              {wname}
                            </span>
                            <span className="block text-[11px] text-slate-500 truncate">
                              {loc(app.job?.jobTitle)}
                            </span>
                          </span>
                          <span className="text-right shrink-0">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${sc.soft} ${sc.text}`}
                            >
                              {tr(`stShort_${st}` as EmployerKey)}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1">
                              {live ? tr("liveGps") : tr("noGps")} ·{" "}
                              {tr("track")}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-5">
                <h2 className="m-0 mb-4 text-[15px] font-extrabold text-[#0F1F4B] flex items-center gap-2">
                  <FiBell className="text-blue-600" /> {tr("recentActivity")}
                </h2>
                {notifications.length === 0 ? (
                  <p className="m-0 text-[13px] text-slate-500 leading-relaxed">
                    {tr("activityEmpty")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl bg-slate-50 border-l-4 ${n.cfg.borderL} px-3.5 py-3 flex items-start gap-2.5`}
                      >
                        <span className={`text-[17px] mt-0.5 ${n.cfg.text}`}>
                          {STATUS_ICON[n.status]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-bold text-[13px] ${n.cfg.text}`}
                          >
                            {tr(n.text)}
                          </div>
                          <div className="text-[12px] text-slate-500 mt-0.5 truncate">
                            {n.workerName} · {loc(n.app.job?.jobTitle)}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedApp(n.app);
                              setNotifs((x) => x.filter((i) => i.id !== n.id));
                            }}
                            className={`mt-2 text-white rounded-lg px-3 py-1 text-[11px] font-bold cursor-pointer ${n.cfg.solid}`}
                          >
                            {tr("track")}
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            setNotifs((x) => x.filter((i) => i.id !== n.id))
                          }
                          aria-label={tr("dismiss")}
                          className="text-slate-400 text-[16px] cursor-pointer"
                        >
                          <FiX />
                        </button>
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