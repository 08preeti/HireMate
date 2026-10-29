"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Poppins } from "next/font/google";
import {
  FiArrowRight, FiBookmark, FiBox, FiBriefcase, FiChevronDown, FiCoffee, FiCreditCard, FiDroplet, FiHome, FiLayers,
  FiMapPin, FiNavigation, FiPenTool, FiPhoneCall, FiSearch, FiSettings, FiShare2, FiShield, FiSliders, FiStar, FiSun,
  FiTool, FiTruck, FiUsers, FiWind, FiX, FiZap,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { haversine } from "@/lib/geo";
import { getJobs } from "@/services/jobs";
import type { Job, Language, LatLng } from "@/types";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const SAVED_KEY = "hm_saved_jobs";
const RADIUS_OPTIONS = [0, 5, 10, 25, 50] as const; // 0 = any distance
type SortKey = "default" | "pay" | "near";

// Trade -> icon
const getJobIcon = (title?: string): IconType => {
  const t = (title || "").toLowerCase();
  if (t.includes("electric") || t.includes("weld")) return FiZap;
  if (t.includes("driver") || t.includes("auto")) return FiTruck;
  if (t.includes("plumb")) return FiDroplet;
  if (t.includes("clean") || t.includes("sweep")) return FiWind;
  if (t.includes("cook") || t.includes("chef") || t.includes("waiter")) return FiCoffee;
  if (t.includes("security") || t.includes("guard")) return FiShield;
  if (t.includes("helper") || t.includes("labour")) return FiUsers;
  if (t.includes("deliver")) return FiBox;
  if (t.includes("paint")) return FiPenTool;
  if (t.includes("carpenter")) return FiTool;
  if (t.includes("maid") || t.includes("house")) return FiHome;
  if (t.includes("garden") || t.includes("mali")) return FiSun;
  if (t.includes("mason") || t.includes("construct")) return FiLayers;
  if (t.includes("mechanic")) return FiSettings;
  return FiBriefcase;
};

const BANNERS = [
  "bg-[linear-gradient(120deg,#0f3a73,#1a6cf0)]",
  "bg-[linear-gradient(120deg,#0b2a5c,#3b82f6)]",
  "bg-[linear-gradient(120deg,#1e3a8a,#0ea5e9)]",
  "bg-[linear-gradient(120deg,#312e81,#6366f1)]",
  "bg-[linear-gradient(120deg,#134e4a,#14b8a6)]",
  "bg-[linear-gradient(120deg,#7c2d12,#f59e0b)]",
];

// Pay period guessed from the amount (same rule the app always used)
function payPeriod(salary: number | string | undefined, language: Language) {
  const s = Number(salary);
  if (s <= 2000) return { title: language === "hi" ? "दैनिक वेतन" : language === "mr" ? "दैनिक वेतन" : "Daily Pay", per: language === "hi" ? "/दिन" : language === "mr" ? "/दिवस" : "/day" };
  if (s <= 20000) return { title: language === "hi" ? "मासिक वेतन" : language === "mr" ? "मासिक वेतन" : "Monthly Pay", per: language === "hi" ? "/महीना" : language === "mr" ? "/महिना" : "/month" };
  return { title: language === "hi" ? "काम का वेतन" : language === "mr" ? "कामाचे वेतन" : "Contract Pay", per: language === "hi" ? "/काम" : language === "mr" ? "/काम" : "/job" };
}

// WhatsApp share
function shareOnWhatsApp(job: Job, language: Language): void {
  const title    = job.jobTitle?.[language] || job.jobTitle?.en || "Job";
  const location = job.location?.[language] || job.location?.en || "";
  const salary   = job.salary ? `₹${job.salary}` : "";
  const text     = `🔔 *${title}* नोकरी उपलब्ध!\n📍 ${location}\n💰 ${salary}\n\nHireMate वर पहा: https://hiremate-brown.vercel.app/jobs`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export default function Jobs() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [area, setArea]       = useState("");
  const [radius, setRadius]   = useState<number>(0);
  const [filterUrgent, setFilterUrgent]       = useState(false);
  const [filterPayment, setFilterPayment]     = useState("");
  const [filterMinSalary, setFilterMinSalary] = useState(0);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort]       = useState<SortKey>("default");
  const [moreOpen, setMoreOpen] = useState(false);
  const [pos, setPos]         = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [saved, setSaved]     = useState<string[]>([]);

  const router                = useRouter();
  const params                = useSearchParams();
  const { role, worker }      = useAuth();
  const { language }          = useLanguage();
  const t                     = translations[language];
  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  useEffect(() => {
    getJobs()
      .then((data) => { setJobs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // The top-bar search sends people here as /jobs?q=...
  const q = params.get("q") ?? "";
  useEffect(() => { setSearch(q); }, [q]);

  // Saved jobs live in this browser
  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); } catch { /* ignore */ }
  }, []);
  const toggleSaved = (id: string) =>
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

  const allowLocation = () => {
    if (!navigator.geolocation) { setGeoError(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoError(false); setRadius((r) => (r === 0 ? 10 : r)); },
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const distOf = (job: Job): number | null =>
    pos && job.latitude && job.longitude ? haversine(pos.lat, pos.lng, job.latitude, job.longitude) : null;

  const filtered = jobs
    .filter((job) => {
      if (search) {
        const s = search.toLowerCase();
        const hay = [job.jobTitle?.[language], job.jobTitle?.en, job.location?.[language], job.location?.en, job.skills?.[language], job.skills?.en]
          .map((x) => (x || "").toLowerCase());
        if (!hay.some((h) => h.includes(s))) return false;
      }
      if (area) {
        const a = area.toLowerCase();
        if (![job.location?.[language], job.location?.en].some((x) => (x || "").toLowerCase().includes(a))) return false;
      }
      if (radius > 0) {
        const d = distOf(job);
        if (d !== null && d > radius) return false;
      }
      if (filterUrgent && !job.isUrgent) return false;
      if (filterPayment && job.paymentMethod !== filterPayment) return false;
      if (filterMinSalary > 0 && Number(job.salary) < filterMinSalary) return false;
      if (savedOnly && !saved.includes(job._id)) return false;
      return true;
    })
    .sort(
      sort === "pay" ? (a, b) => Number(b.salary || 0) - Number(a.salary || 0)
      : sort === "near" ? (a, b) => (distOf(a) ?? 9999) - (distOf(b) ?? 9999)
      : () => 0
    );

  const urgentCount = jobs.filter((j) => j.isUrgent).length;
  const hasFilters = !!(filterUrgent || filterPayment || filterMinSalary > 0 || savedOnly || area || sort !== "default");
  const clearAll = () => { setFilterUrgent(false); setFilterPayment(""); setFilterMinSalary(0); setSavedOnly(false); setArea(""); setSort("default"); };

  if (loading) return (
    <div className={`${poppins.className} p-10 text-center text-[16px] text-gray-500`}>{t.loading}</div>
  );

  const chip = "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition";
  const idle = "border-[#e3eaf5] bg-white text-[#0d2250] hover:border-[#bcd0f1]";

  return (
    <div className={`${poppins.className} mx-auto max-w-[1180px] px-4 py-5 text-[#0d2250] sm:px-6`}>

      {/* ── Title + location/radius ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[clamp(24px,2.4vw,32px)] font-extrabold leading-tight">{t.availableJobs}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff6e8] px-3 py-1 text-[12px] font-semibold text-[#13783d]">
              <span className="h-2 w-2 rounded-full bg-[#1fb25a]" /> {jobs.length} {L("Jobs Open", "नौकरियां खुली", "नोकऱ्या खुल्या")}
            </span>
          </div>
          <p className="mt-1 text-[14px] text-[#5b6a85]">{L("Find jobs near you and start earning today.", "अपने पास की नौकरी खोजें और आज ही कमाना शुरू करें।", "जवळची नोकरी शोधा आणि आजच कमवायला सुरुवात करा.")}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-[#e3eaf5] bg-white px-4 py-2.5 text-[13px] font-semibold shadow-sm focus-within:border-[#1a6cf0]">
            <FiMapPin size={17} className="shrink-0 text-[#1a4fb0]" aria-hidden="true" />
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={worker?.location || L("Area, e.g. Nashik", "इलाका, जैसे नासिक", "परिसर, उदा. नाशिक")}
              aria-label={L("Area", "इलाका", "परिसर")}
              className="w-[170px] bg-transparent font-semibold text-[#0d2250] outline-none placeholder:font-medium placeholder:text-[#8a97b0]"
            />
          </label>
          <label className="relative flex items-center gap-2.5 rounded-xl border border-[#e3eaf5] bg-white px-4 py-2.5 text-[13px] font-semibold shadow-sm">
            <FiNavigation size={17} className="shrink-0 text-[#1a4fb0]" aria-hidden="true" />
            <select
              value={radius}
              onChange={(e) => { setRadius(Number(e.target.value)); if (!pos && Number(e.target.value) > 0) allowLocation(); }}
              className="cursor-pointer appearance-none bg-transparent pr-6 font-semibold outline-none"
              aria-label={L("Distance", "दूरी", "अंतर")}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r === 0 ? L("Any distance", "कोई भी दूरी", "कोणतेही अंतर") : `${L("Within", "के अंदर", "आत")} ${r} km`}</option>
              ))}
            </select>
            <FiChevronDown size={15} className="pointer-events-none absolute right-3.5" aria-hidden="true" />
          </label>
        </div>
      </div>

      {/* In-page search: visitors always, workers on small screens (they have the top-bar search on desktop) */}
      <label className={`mb-4 flex items-center gap-2.5 rounded-xl border border-[#e3eaf5] bg-white px-4 py-2.5 shadow-sm focus-within:border-[#1a6cf0] ${role === "worker" ? "md:hidden" : ""}`}>
        <FiSearch size={17} className="shrink-0 text-[#8a97b0]" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={L("Search jobs…", "नौकरी खोजें…", "नोकरी शोधा…")}
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#8a97b0]"
        />
      </label>

      {/* ── Filter chips ── */}
      <div className="relative mb-5 flex flex-wrap items-center gap-2.5">
        <button onClick={clearAll} className={`${chip} ${!hasFilters && !search ? "border-[#0b2a5c] bg-[#0b2a5c] text-white" : idle}`}>
          <FiBriefcase size={15} aria-hidden="true" /> {L("All Jobs", "सभी नौकरियां", "सर्व नोकऱ्या")} ({jobs.length})
        </button>
        <button onClick={() => setFilterUrgent((v) => !v)} className={`${chip} ${filterUrgent ? "border-[#f0264a] bg-[#f0264a] text-white" : "border-[#ffd3da] bg-[#fff1f3] text-[#d6203a]"}`}>
          <FiZap size={15} aria-hidden="true" /> {L("Urgent Hiring", "तत्काल भर्ती", "तातडीची भरती")} <span className="font-bold">{urgentCount}</span>
        </button>
        <button onClick={() => setFilterPayment((v) => (v === "Cash" ? "" : "Cash"))} className={`${chip} ${filterPayment === "Cash" ? "border-[#1fb25a] bg-[#e6f8ee] text-[#13783d]" : idle}`}>
          <span className="text-[14px]">💵</span> {L("Cash Pay", "नकद भुगतान", "रोख पेमेंट")}
        </button>
        <button onClick={() => setFilterMinSalary((v) => (v === 500 ? 0 : 500))} className={`${chip} ${filterMinSalary === 500 ? "border-[#1a6cf0] bg-[#eaf2ff] text-[#1a4fb0]" : idle}`}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dff6e8] text-[12px] font-bold text-[#13783d]">₹</span> ₹500+
        </button>
        <button onClick={() => setFilterMinSalary((v) => (v === 1000 ? 0 : 1000))} className={`${chip} ${filterMinSalary === 1000 ? "border-[#1a6cf0] bg-[#eaf2ff] text-[#1a4fb0]" : idle}`}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dff6e8] text-[12px] font-bold text-[#13783d]">₹</span> ₹1000+
        </button>

        <div className="relative ml-auto">
          <button onClick={() => setMoreOpen((v) => !v)} className={`${chip} ${moreOpen || savedOnly || filterPayment === "UPI" || sort !== "default" ? "border-[#1a6cf0]" : ""} bg-white text-[#0d2250]`} aria-expanded={moreOpen}>
            <FiSliders size={15} aria-hidden="true" /> {L("More Filters", "और फ़िल्टर", "आणखी फिल्टर")} <FiChevronDown size={15} aria-hidden="true" />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 z-[50] mt-2 w-[280px] rounded-2xl border border-[#e3eaf5] bg-white p-4 shadow-[0_16px_40px_rgba(20,50,110,0.16)]">
                <div className="mb-3">
                  <div className="mb-1.5 text-[12px] font-semibold text-[#6b7a95]">{L("Payment", "भुगतान", "पेमेंट")}</div>
                  <div className="flex gap-2">
                    {["", "Cash", "UPI"].map((p) => (
                      <button key={p || "any"} onClick={() => setFilterPayment(p)} className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-[12.5px] font-semibold ${filterPayment === p ? "border-[#1a6cf0] bg-[#eaf2ff] text-[#1a4fb0]" : "border-[#e3eaf5] text-[#5b6a85]"}`}>
                        {p || L("Any", "कोई भी", "कोणतेही")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="mb-1.5 text-[12px] font-semibold text-[#6b7a95]">{L("Sort by", "क्रम", "क्रम")}</div>
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-full cursor-pointer rounded-lg border border-[#e3eaf5] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#1a6cf0]">
                    <option value="default">{L("Recommended", "अनुशंसित", "शिफारस केलेले")}</option>
                    <option value="pay">{L("Highest pay", "सबसे ज़्यादा वेतन", "सर्वाधिक वेतन")}</option>
                    <option value="near" disabled={!pos}>{L("Nearest first", "सबसे पास", "जवळचे आधी")}{!pos ? ` (${L("needs location", "लोकेशन चाहिए", "लोकेशन हवे")})` : ""}</option>
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} className="h-4 w-4 accent-[#1a6cf0]" />
                  {L(`Saved jobs only (${saved.length})`, `सेव की गई नौकरियां (${saved.length})`, `सेव्ह केलेल्या नोकऱ्या (${saved.length})`)}
                </label>
                {hasFilters && (
                  <button onClick={clearAll} className="mt-3 flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-[#d6203a]">
                    <FiX size={14} aria-hidden="true" /> {L("Clear all filters", "सभी फ़िल्टर हटाएं", "सर्व फिल्टर काढा")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#cfdcf2] bg-white p-10 text-center text-[#6b7a95]">
          <FiSearch size={34} className="mx-auto mb-3 text-[#1a6cf0]" aria-hidden="true" />
          <div className="font-semibold text-[#0d2250]">{t.noJobs}</div>
          {(hasFilters || search || radius > 0) && (
            <button onClick={() => { clearAll(); setSearch(""); setRadius(0); }} className="mt-3 cursor-pointer text-[13px] font-semibold text-[#1a6cf0]">
              {L("Clear filters", "फ़िल्टर हटाएं", "फिल्टर काढा")}
            </button>
          )}
        </div>
      )}

      {/* ── Job cards ── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((job) => {
          const title = job.jobTitle?.[language] || job.jobTitle?.en;
          const Icon = getJobIcon(job.jobTitle?.en || title);
          const banner = BANNERS[(job._id.charCodeAt(job._id.length - 1) || 0) % BANNERS.length];
          const tags = (job.skills?.[language] || job.skills?.en || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);
          const dist = distOf(job);
          const pay = payPeriod(job.salary, language);
          const isSaved = saved.includes(job._id);
          return (
            <article key={job._id} className="flex flex-col rounded-2xl border border-[#e6ecf5] bg-white p-3.5 shadow-[0_6px_24px_rgba(20,50,110,0.06)] transition hover:shadow-[0_10px_30px_rgba(20,50,110,0.12)]">
              {/* Banner */}
              <div className={`relative flex h-[92px] items-center justify-end overflow-hidden rounded-xl pr-6 ${banner}`}>
                <div className="pointer-events-none absolute -left-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                <Icon size={46} className="relative text-white/90" aria-hidden="true" />
                <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white ${job.isUrgent ? "bg-[#f0264a]" : "bg-[#1fb25a]"}`}>
                  {job.isUrgent ? <><FiZap size={13} aria-hidden="true" /> {L("Urgent Hiring", "तत्काल भर्ती", "तातडीची भरती")}</> : L("Open Now", "अभी खुला", "आता खुले")}
                </span>
                {job.paymentMethod && (
                  <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/35 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">{job.paymentMethod}</span>
                )}
              </div>

              <div className="flex-1 px-1 pt-3">
                <h3 className="text-[18px] font-extrabold leading-snug">{title}</h3>
                <div className="mt-1 flex items-start gap-1.5 text-[13px] text-[#5b6a85]">
                  <FiMapPin size={15} className="mt-0.5 shrink-0 text-[#e8334f]" aria-hidden="true" />
                  <span>{job.location?.[language] || job.location?.en}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6b7a95]">
                  {dist !== null && <span className="inline-flex items-center gap-1.5"><FiNavigation size={13} aria-hidden="true" /> {dist.toFixed(1)} km {t.kmAway}</span>}
                  {(job.rating ?? 0) > 0 && <span className="inline-flex items-center gap-1.5 text-[#8a5a00]"><FiStar size={13} aria-hidden="true" /> {job.rating} ({job.totalReviews} {t.reviews})</span>}
                </div>

                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map((tag) => <span key={tag} className="rounded-lg bg-[#eef4ff] px-2.5 py-1 text-[11.5px] font-medium text-[#1a4fb0]">{tag}</span>)}
                  </div>
                )}

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#eef2f8] pt-3">
                  <div>
                    <div className="text-[12px] text-[#6b7a95]">{pay.title}</div>
                    <div className="text-[24px] font-extrabold leading-tight text-[#e8334f]">₹{job.salary}<span className="ml-1 text-[12px] font-medium text-[#6b7a95]">{pay.per}</span></div>
                  </div>
                  {job.paymentMethod && (
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold ${job.paymentMethod === "Cash" ? "bg-[#e6f8ee] text-[#13783d]" : "bg-[#eaf2ff] text-[#1a4fb0]"}`}>
                      {job.paymentMethod === "UPI" ? <FiCreditCard size={14} aria-hidden="true" /> : <span aria-hidden="true">💵</span>} {job.paymentMethod}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2 px-1">
                <button onClick={() => router.push(`/jobs/${job._id}`)} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0b2a5c] py-3 text-[14px] font-semibold text-white transition hover:bg-[#0a2350]">
                  {t.viewDetails} <FiArrowRight size={15} aria-hidden="true" />
                </button>
                <button onClick={() => toggleSaved(job._id)} aria-pressed={isSaved} aria-label={L("Save job", "नौकरी सेव करें", "नोकरी सेव्ह करा")} className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-xl border ${isSaved ? "border-[#1a6cf0] bg-[#eaf2ff] text-[#1a6cf0]" : "border-[#dbe4f0] text-[#0d2250] hover:bg-[#f2f7ff]"}`}>
                  <FiBookmark size={18} className={isSaved ? "fill-current" : ""} />
                </button>
                {job.contactInfo && (
                  <a href={`tel:${job.contactInfo}`} aria-label={L("Call Employer", "कॉल करें", "कॉल करा")} className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-[#dbe4f0] text-[#13783d] no-underline hover:bg-[#f2fbf6]">
                    <FiPhoneCall size={17} />
                  </a>
                )}
                <button onClick={() => shareOnWhatsApp(job, language)} aria-label={L("Share on WhatsApp", "WhatsApp पर शेयर करें", "WhatsApp वर शेअर करा")} className="flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-xl border border-[#dbe4f0] text-[#25a244] hover:bg-[#f2fbf6]">
                  <FiShare2 size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Location banner ── */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#d6e4fb] bg-[#eef5ff] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a4fb0] text-white"><FiMapPin size={22} aria-hidden="true" /></span>
          <div>
            <h2 className="text-[14.5px] font-bold">
              {pos ? L("Location is on", "लोकेशन चालू है", "लोकेशन सुरू आहे") : L("Enable Location for Better Job Matches", "बेहतर नौकरी के लिए लोकेशन चालू करें", "चांगल्या नोकऱ्यांसाठी लोकेशन सुरू करा")}
            </h2>
            <p className="text-[12.5px] text-[#5b6a85]">
              {geoError
                ? L("We couldn't get your location. Check your browser's permission and try again.", "लोकेशन नहीं मिल सकी। ब्राउज़र की अनुमति जांचें।", "लोकेशन मिळाले नाही. ब्राउझर परवानगी तपासा.")
                : pos
                  ? L("Distances are now shown on each job.", "अब हर नौकरी पर दूरी दिख रही है।", "आता प्रत्येक नोकरीवर अंतर दिसत आहे.")
                  : L("Turn on location to see nearby jobs and distances.", "पास की नौकरियां और दूरी देखने के लिए लोकेशन चालू करें।", "जवळच्या नोकऱ्या आणि अंतर पाहण्यासाठी लोकेशन सुरू करा.")}
            </p>
          </div>
        </div>
        {!pos && (
          <button onClick={allowLocation} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfdcf2] bg-white px-6 py-2.5 text-[14px] font-semibold text-[#0d2250] shadow-sm hover:bg-[#f7faff]">
            <FiMapPin size={16} className="text-[#1a4fb0]" aria-hidden="true" /> {L("Allow Location", "लोकेशन की अनुमति दें", "लोकेशनला परवानगी द्या")}
          </button>
        )}
      </div>
    </div>
  );
}