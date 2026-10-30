"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiDownload, FiHome, FiPhone, FiPlus, FiSearch } from "react-icons/fi";
import EmployerTopNav from "@/components/layout/EmployerTopNav";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { haversine } from "@/lib/geo";
import { markApplicationsSeen } from "@/lib/seenApplications";
import { getEmployerApplications, rateApplication } from "@/services/applications";
import type { Application, Job, Language, LocalizedText } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────
type Stage = "awaiting" | "confirmed" | "completed" | "rated";
type TabKey = "all" | Stage;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All Applications" },
  { key: "awaiting", label: "Awaiting Call / Review" },
  { key: "confirmed", label: "Confirmed for Today" },
  { key: "completed", label: "Completed & Ready to Rate" },
  { key: "rated", label: "Rated" },
];

const STAGE_BADGE: Record<Stage, { label: string; cls: string }> = {
  awaiting: { label: "Under Review", cls: "bg-slate-100 text-slate-600" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Ready to Rate", cls: "bg-amber-50 text-amber-700" },
  rated: { label: "Rated", cls: "bg-blue-50 text-blue-700" },
};

const SCORES = [
  { value: "5", label: "5.0 - Excellent & Highly Recommended" },
  { value: "4", label: "4.0 - Very Good" },
  { value: "3", label: "3.0 - Good" },
  { value: "2", label: "2.0 - Fair" },
  { value: "1", label: "1.0 - Poor" },
];

const UNIT_LABEL: Record<string, string> = { hour: "hr", day: "day", week: "week", month: "month" };

const loc = (t: LocalizedText | string | undefined, lang: Language): string =>
  !t ? "" : typeof t === "string" ? t : t[lang] || t.en || "";

const stageOf = (a: Application): Stage => {
  if (a.rating) return "rated";
  if (a.status === "completed") return "completed";
  if (a.status === "on_the_way" || a.status === "arrived") return "confirmed";
  return "awaiting";
};

const nameOf = (a: Application) => a.applicantName || a.worker?.name || "Worker";
const phoneOf = (a: Application) => a.applicantContact || a.worker?.phone || a.worker?.contact || "";
const initialsOf = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "W";
const wageOf = (j?: Job) => Number(j?.salary) || 0;
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const unitOf = (j?: Job) => (j?.salaryUnit ? UNIT_LABEL[j.salaryUnit] : "day");
const workerRating = (a: Application) => Number(a.worker?.rating) || 0;
const appCode = (a: Application) => a._id.slice(-6).toUpperCase();
const skillsOf = (a: Application) => (a.worker?.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

const distanceOf = (a: Application): number | null => {
  const c = a.worker?.currentLocation;
  if (!c || a.job?.latitude == null || a.job?.longitude == null) return null;
  return haversine(c.lat, c.lng, a.job.latitude, a.job.longitude);
};

const appliedLabel = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? `Applied today, ${time}`
    : `Applied ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
};

const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

const PREF_KEY = "hm_preferred_workers";
const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
};

const Stars = ({ value, onChange }: { value: number; onChange?: (n: number) => void }) => (
  <span className="inline-flex gap-1 text-[22px] leading-none">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        aria-label={`${n} star`}
        className={`${n <= value ? "text-amber-400" : "text-slate-300"} ${onChange ? "cursor-pointer" : "cursor-default"}`}
      >
        ★
      </button>
    ))}
  </span>
);

// ── Rating panel (own state per application) ────────────────────────────────
interface RatePanelProps {
  a: Application;
  onRated: () => void;
}

function RatePanel({ a, onRated }: RatePanelProps) {
  const draftKey = `hm_rating_draft_${a._id}`;
  const prefId = phoneOf(a) || a._id;
  const draft = typeof window === "undefined" ? null : readJSON<{ rating?: string; notes?: string } | null>(draftKey, null);

  const [rating, setRating] = useState(draft?.rating || "5");
  const [notes, setNotes] = useState(draft?.notes || "");
  const [preferred, setPreferred] = useState(
    () => typeof window !== "undefined" && readJSON<string[]>(PREF_KEY, []).includes(prefId)
  );
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const wage = wageOf(a.job);
  const name = nameOf(a);

  if (a.rating) {
    return (
      <div className="px-6 py-6">
        <h3 className="text-[17px] font-bold text-slate-900">Your rating</h3>
        <div className="mt-3 flex items-center gap-3">
          <Stars value={a.rating} />
          <span className="text-[15px] font-semibold text-slate-700">{a.rating.toFixed(1)} / 5</span>
        </div>
        {a.review && <p className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-[14px] text-slate-700">{a.review}</p>}
      </div>
    );
  }

  const saveDraft = () => {
    writeJSON(draftKey, { rating, notes });
    setSavedMsg("Draft saved");
    window.setTimeout(() => setSavedMsg(""), 2000);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await rateApplication(a._id, { rating: Number(rating), review: notes });
      const pool = readJSON<string[]>(PREF_KEY, []).filter((x) => x !== prefId);
      writeJSON(PREF_KEY, preferred ? [...pool, prefId] : pool);
      window.localStorage.removeItem(draftKey);
      onRated();
    } catch (err) {
      console.error(err);
      alert("Failed to submit rating");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[18px] font-bold text-slate-900">Rate Worker &amp; Close Shift</h3>
          <p className="text-[14px] text-slate-500 mt-0.5">Submit shift feedback to complete this application.</p>
        </div>
        {a.status === "completed" && (
          <span className="shrink-0 rounded-md bg-emerald-50 text-emerald-700 text-[13px] font-medium px-3 py-1.5">Shift Completed</span>
        )}
      </div>

      <label className="block mt-5 text-[14.5px] font-semibold text-slate-800">Performance Score</label>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full h-12 appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14.5px] text-slate-800 outline-none focus:border-red-500"
          >
            {SCORES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <div className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-4 flex items-center justify-between">
          <Stars value={Number(rating)} onChange={(n) => setRating(String(n))} />
          <span className="text-[14.5px] font-semibold text-slate-700">{Number(rating).toFixed(1)} / 5</span>
        </div>
      </div>

      <label className="block mt-5 text-[14.5px] font-semibold text-slate-800">Site Manager Notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder={`How did ${name} perform on this shift?`}
        className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-[14.5px] text-slate-800 outline-none focus:border-red-500"
      />

      <label className="mt-4 flex items-center gap-3 text-[14.5px] text-slate-700 cursor-pointer">
        <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} className="w-[18px] h-[18px] accent-slate-900" />
        Add {name} to my preferred workers for tomorrow
      </label>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 h-[54px] rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-[15.5px] font-semibold cursor-pointer"
        >
          {busy ? "Submitting…" : `Submit Rating${wage ? ` (${money(wage)})` : ""}`}
        </button>
        <button onClick={saveDraft} className="h-[54px] px-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[15px] font-semibold cursor-pointer">
          {savedMsg || "Save as Draft"}
        </button>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Applications() {
  const { language } = useLanguage();
  const { employer } = useAuth();
  const employerId = employer?._id;
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [distance, setDistance] = useState("any");
  const [sort, setSort] = useState("rating");
  const [selectedId, setSelectedId] = useState("");

  // Role guard + 401 handling live in the (employer) layout and the API client.
  const fetchApps = useCallback(() => {
    getEmployerApplications()
      .then((data) => {
        const list = data.applications || [];
        setApps(list);
        markApplicationsSeen(employerId, list.length); // clears the red badge on the dashboard
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, [employerId]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: apps.length, awaiting: 0, confirmed: 0, completed: 0, rated: 0 };
    apps.forEach((a) => { c[stageOf(a)] += 1; });
    return c;
  }, [apps]);

  const jobs = useMemo(() => {
    const map = new Map<string, Job>();
    apps.forEach((a) => { if (a.job) map.set(a.job._id, a.job); });
    return [...map.values()];
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const maxKm = distance === "any" ? Infinity : Number(distance);
    const list = apps.filter((a) => {
      if (tab !== "all" && stageOf(a) !== tab) return false;
      if (roleFilter !== "all" && a.job?._id !== roleFilter) return false;
      const d = distanceOf(a);
      if (d !== null && d > maxKm) return false;
      if (!q) return true;
      return [nameOf(a), phoneOf(a), loc(a.job?.jobTitle, language), a.worker?.skills || ""].join(" ").toLowerCase().includes(q);
    });
    return list.sort((x, y) => {
      if (sort === "newest") return (y.createdAt || "").localeCompare(x.createdAt || "");
      if (sort === "wage") return wageOf(y.job) - wageOf(x.job);
      const v = Number(!!y.worker?.backgroundVerified) - Number(!!x.worker?.backgroundVerified);
      return v || workerRating(y) - workerRating(x);
    });
  }, [apps, tab, roleFilter, distance, query, sort, language]);

  const selected = filtered.find((a) => a._id === selectedId) ?? filtered[0];
  const jobApps = selected?.job ? apps.filter((a) => a.job?._id === selected.job?._id) : [];
  const activeNow = apps.filter((a) => a.status === "on_the_way" || a.status === "arrived").length;
  const jobTitle = loc(selected?.job?.jobTitle, language);
  const jobPlace = loc(selected?.job?.location, language);

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ["Name", "Phone", "Job", "Status", "Rating", "Review", "Wage", "Applied"],
      ...apps.map((a) => [
        nameOf(a), phoneOf(a), loc(a.job?.jobTitle, language), STAGE_BADGE[stageOf(a)].label,
        a.rating ?? "", a.review ?? "", wageOf(a.job) || "", a.createdAt ?? "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const sel = "h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 pr-10 text-[14.5px] text-slate-700 outline-none focus:border-red-500";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-app text-slate-900">
      <EmployerTopNav />

      {/* Breadcrumb strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-8 py-3.5 text-[14.5px] text-slate-500">
          <nav className="flex items-center gap-2 min-w-0">
            <Link href="/employer-dashboard" className="flex items-center gap-1.5 text-slate-500 no-underline hover:text-slate-800"><FiHome /> Home</Link>
            <FiChevronRight className="text-slate-300 shrink-0" />
            <span>Applications</span>
            {selected?.job && (
              <>
                <FiChevronRight className="text-slate-300 shrink-0" />
                <span className="font-semibold text-slate-900 truncate">
                  {jobTitle} (Listing #{selected.job._id.slice(-5).toUpperCase()})
                </span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-4">
            {activeNow > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13.5px] font-medium px-3.5 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live: {activeNow} worker{activeNow > 1 ? "s" : ""} on the way / on site
              </span>
            )}
            {jobPlace && (
              <span className="hidden md:inline text-[14px]">Site: <b className="text-slate-700 font-semibold">{jobPlace}</b></span>
            )}
          </div>
        </div>
      </div>

      <main className="px-4 lg:px-8 pt-8 pb-16">
        {/* Heading */}
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[760px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[30px] lg:text-[34px] font-extrabold tracking-tight">Applications &amp; Candidate Review</h1>
              <span className="rounded-md bg-slate-100 text-slate-600 text-[14px] font-mono px-2.5 py-1">{apps.length} Total</span>
            </div>
            <p className="mt-2 text-[16px] leading-relaxed text-slate-500">
              Review daily-wage applicants, verify credentials, conduct phone verification, and record official performance ratings.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <button onClick={exportCsv} className="h-[50px] px-6 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[15px] font-semibold text-slate-800 flex items-center justify-center gap-2.5 cursor-pointer">
              <FiDownload /> Export Applications Log
            </button>
            <Link href="/post-job" className="h-[50px] px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[15px] font-semibold no-underline flex items-center justify-center gap-2.5">
              <FiPlus /> Post a Replacement Job
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-slate-200 flex gap-8 overflow-x-auto">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative whitespace-nowrap pb-4 pt-1 text-[16px] font-medium cursor-pointer ${on ? "text-red-600 font-semibold" : "text-slate-500 hover:text-slate-800"}`}
              >
                {t.label}
                <span className={`ml-2.5 rounded-md px-2 py-0.5 text-[13px] font-semibold ${on ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                  {counts[t.key]}
                </span>
                {on && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-red-600 rounded-t" />}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_1.1fr_auto] items-center">
          <label className="flex items-center gap-3 h-12 rounded-lg border border-slate-300 px-4 focus-within:border-red-500">
            <FiSearch className="text-slate-400 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or skill" className="flex-1 min-w-0 bg-transparent text-[14.5px] outline-none" />
          </label>
          <div className="relative">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={sel}>
              <option value="all">Role: All jobs</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>Role: {loc(j.jobTitle, language) || "Untitled job"}</option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <div className="relative">
            <select value={distance} onChange={(e) => setDistance(e.target.value)} className={sel}>
              <option value="any">Distance: Any</option>
              <option value="5">Distance: Within 5 km radius</option>
              <option value="10">Distance: Within 10 km radius</option>
              <option value="25">Distance: Within 25 km radius</option>
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14.5px] text-slate-500 whitespace-nowrap">Sort by:</span>
            <div className="relative flex-1">
              <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel}>
                <option value="rating">Top Rated &amp; Verified First</option>
                <option value="newest">Newest First</option>
                <option value="wage">Highest Wage First</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="mt-10 text-slate-500">Loading applications…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            {apps.length === 0 ? "No applications yet. Workers who apply to your jobs will appear here." : "No applicants match these filters."}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.3fr)_minmax(280px,0.7fr)] items-start">
            {/* ── Applicant list ── */}
            <section>
              <div className="flex items-center justify-between px-1 mb-4 text-[13.5px]">
                <span className="font-bold tracking-wider text-slate-500">APPLICANTS ({filtered.length})</span>
                <span className="text-slate-500">{sort === "newest" ? "Sorted by date" : sort === "wage" ? "Sorted by wage" : "Sorted by rating"}</span>
              </div>
              <div className="flex flex-col gap-4">
                {filtered.map((a) => {
                  const active = a._id === selected?._id;
                  const st = stageOf(a);
                  const d = distanceOf(a);
                  const r = workerRating(a);
                  return (
                    <button
                      key={a._id}
                      onClick={() => setSelectedId(a._id)}
                      className={`text-left rounded-xl bg-white p-5 border-2 cursor-pointer transition-colors ${active ? "border-red-300" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="w-[60px] h-[60px] shrink-0 rounded-xl bg-slate-100 text-slate-700 text-[18px] font-bold flex items-center justify-center">
                          {initialsOf(nameOf(a))}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[18px] font-bold truncate">{nameOf(a)}</span>
                            <span className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium ${STAGE_BADGE[st].cls}`}>{STAGE_BADGE[st].label}</span>
                          </div>
                          <div className="text-[15px] text-slate-500 truncate">
                            {skillsOf(a)[0] || loc(a.job?.jobTitle, language) || "Worker"}
                            {d !== null && ` • ${d.toFixed(1)} km`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 text-[14.5px]">
                        <span className="text-slate-500"><span className="text-slate-500">★</span> {r ? r.toFixed(1) : "New"}{a.worker?.totalReviews ? ` (${a.worker.totalReviews} shifts)` : ""}</span>
                        {wageOf(a.job) > 0 && <span className="font-bold">{money(wageOf(a.job))} / {unitOf(a.job)}</span>}
                        {st === "completed" ? (
                          <span className="text-emerald-600 font-medium">Shift completed</span>
                        ) : (
                          <span className="text-slate-500">{phoneOf(a)}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Candidate detail ── */}
            {selected && (
              <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-6 pt-6 pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[14.5px] text-slate-500">
                    <span>Application #APP-{appCode(selected)}</span>
                    <span>{appliedLabel(selected.createdAt)}</span>
                  </div>

                  <div className="mt-5 flex items-start gap-5">
                    <span className="w-[84px] h-[84px] shrink-0 rounded-2xl bg-slate-900 text-white text-[28px] font-bold flex items-center justify-center">
                      {initialsOf(nameOf(selected))}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[26px] font-extrabold leading-tight">{nameOf(selected)}</h2>
                        {selected.worker?.backgroundVerified && (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[14px] font-medium px-2.5 py-0.5">Verified</span>
                        )}
                      </div>
                      <p className="mt-1 text-[15.5px] text-slate-600">
                        Applied for: <b className="text-slate-900 font-semibold">{jobTitle || "—"}</b>
                      </p>
                      <p className="mt-1 text-[15px] text-slate-500">
                        ★ {workerRating(selected) ? workerRating(selected).toFixed(1) : "New"}
                        {selected.worker?.totalReviews ? ` (${selected.worker.totalReviews} shifts)` : ""}
                        {selected.worker?.location && <>  •  {selected.worker.location}</>}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[13.5px] text-slate-500">Worker Contact</div>
                      <div className="text-[21px] font-bold">{phoneOf(selected) ? (/^\+/.test(phoneOf(selected)) ? phoneOf(selected) : `+91 ${phoneOf(selected)}`) : "Not provided"}</div>
                    </div>
                    {phoneOf(selected) && (
                      <div className="flex gap-2.5">
                        <a href={`tel:${phoneOf(selected)}`} className="h-11 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[15px] font-medium text-slate-800 no-underline flex items-center gap-2"><FiPhone /> Call Now</a>
                        <a href={waLink(phoneOf(selected))} target="_blank" rel="noreferrer" className="h-11 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-medium no-underline flex items-center">WhatsApp</a>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {(skillsOf(selected).length > 0 || (selected.worker?.documents?.length ?? 0) > 0) && (
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {skillsOf(selected).map((s) => (
                        <span key={s} className="rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[14.5px] px-3.5 py-2">{s}</span>
                      ))}
                      {selected.worker?.documents?.map((d) => (
                        <span key={d.title} className="rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[14.5px] px-3.5 py-2">
                          {d.title}{d.verified ? " ✓" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wage strip */}
                <div className="bg-slate-50 border-y border-slate-200 px-6 py-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-[14px] text-slate-500">Agreed Wage</div>
                    <div className="text-[19px] font-bold">{wageOf(selected.job) ? `${money(wageOf(selected.job))} / ${unitOf(selected.job)}` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[14px] text-slate-500">Shift Hours</div>
                    <div className="text-[19px] font-bold leading-snug">{selected.job?.dutyTimings || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[14px] text-slate-500">Payout Status</div>
                    <div className={`text-[19px] font-bold ${stageOf(selected) === "rated" ? "text-blue-600" : stageOf(selected) === "completed" ? "text-emerald-600" : "text-slate-500"}`}>
                      {stageOf(selected) === "rated" ? "Rated" : stageOf(selected) === "completed" ? "Ready to Pay" : "Pending shift"}
                    </div>
                  </div>
                </div>

                <RatePanel key={selected._id} a={selected} onRated={fetchApps} />
              </section>
            )}

            {/* ── Right column ── */}
            {selected && (
              <aside className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-bold tracking-wider text-slate-500">SHIFT STAFFING</span>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 text-[13.5px] font-medium px-3 py-1 whitespace-nowrap">
                      {jobApps.filter((x) => stageOf(x) !== "awaiting").length} of {selected.job?.vacancies || jobApps.length} Confirmed
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3.5">
                    {jobApps.map((x) => (
                      <div key={x._id} className="flex items-center justify-between gap-3 text-[15px]">
                        <span className="text-slate-600 truncate">{skillsOf(x)[0] || "Worker"}</span>
                        <span className="font-medium truncate">{nameOf(x)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-900"
                      style={{ width: `${Math.min(100, (jobApps.filter((x) => stageOf(x) !== "awaiting").length / (selected.job?.vacancies || jobApps.length || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-bold tracking-wider text-slate-500">WAGE SUMMARY</span>
                    {selected.job?.paymentMethod && (
                      <span className="text-[14px] font-medium text-emerald-600">● Pay via {selected.job.paymentMethod}</span>
                    )}
                  </div>
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="text-[34px] font-extrabold tracking-tight">
                      {money(jobApps.reduce((sum, x) => sum + wageOf(x.job), 0))}
                    </div>
                    <p className="mt-1 text-[14.5px] text-slate-500">Total wages for this listing&apos;s crew</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
                    {jobApps.map((x) => (
                      <div key={x._id} className="flex items-center justify-between gap-3 text-[15px]">
                        <span className="text-slate-600 truncate">{nameOf(x)}</span>
                        <span className="font-medium">{money(wageOf(x.job))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}