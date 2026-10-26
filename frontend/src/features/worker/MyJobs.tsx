"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  FiCheck, FiCheckCircle, FiChevronDown, FiClock, FiDownload, FiFileText, FiMapPin, FiPlus, FiStar, FiCreditCard,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/context/AuthContext";
import { getMyJobs } from "@/services/workers";
import { toast } from "@/components/ui/Toast";
import type { Application } from "@/types";

type TabKey = "all" | "review" | "completed" | "offers";
type SortKey = "latest" | "oldest" | "pay";

// ── helpers ────────────────────────────────────────────────────────────────
const isDone = (a: Application) => !!a.isCompleted || a.status === "completed";
const isOffer = (a: Application) => !isDone(a) && !!a.status; // employer accepted / worker is on the way
const isReview = (a: Application) => !isDone(a) && !a.status; // applied, waiting on employer

const salaryOf = (a: Application) => {
  const n = Number(String(a.job?.salary ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const stamp = (a: Application) => (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
const digits = (s?: string) => (s || "").replace(/\D/g, "");

const tradeEmoji = (title = "") => {
  const t = title.toLowerCase();
  if (/driv|चालक|ड्रायव्हर/.test(t)) return "🚗";
  if (/chef|cook|कुक|रसोई|स्वयंपाक/.test(t)) return "👨‍🍳";
  if (/plumb|नल/.test(t)) return "🔧";
  if (/electric|बिजली|वीज/.test(t)) return "⚡";
  if (/clean|सफाई|स्वच्छ/.test(t)) return "🧹";
  if (/paint|पेंट|रंग/.test(t)) return "🎨";
  if (/guard|security|सुरक्षा/.test(t)) return "💂";
  if (/carpent|बढ़ई|सुतार/.test(t)) return "🪚";
  return "💼";
};

const contractId = (a: Application) => {
  const en = a.job?.jobTitle?.en || "JB";
  return `#HM-${en.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "JB"}-${a._id.slice(-4).toUpperCase()}`;
};

function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── small presentational pieces ────────────────────────────────────────────
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FiStar key={n} size={size} className={n <= Math.round(value) ? "fill-[#f5b301] text-[#f5b301]" : "text-[#d5dbe8]"} aria-hidden="true" />
      ))}
    </span>
  );
}

function StatCard({ label, iconBg, iconColor, icon, children }: { label: string; iconBg: string; iconColor: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e6ecf5] bg-white p-5 shadow-[0_2px_10px_rgba(20,50,110,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#5b6a88]">{label}</div>
          {children}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function TrackerStep({ state, n, text }: { state: "done" | "current" | "todo"; n: number; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
          state === "done" ? "bg-[#10b981]" : state === "current" ? "bg-[#f59e0b]" : "bg-[#d9dfeb]"
        }`}
      >
        {state === "done" ? <FiCheck size={14} aria-hidden="true" /> : n}
      </span>
      <span className={`text-[14px] ${state === "done" ? "font-medium text-[#0b1b3d]" : state === "current" ? "font-semibold text-[#d97706]" : "text-[#8a96ae]"}`}>{text}</span>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────
export default function MyJobs() {
  const [jobs, setJobs] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const { language } = useLanguage();
  const t = translations[language];
  const { worker } = useAuth();
  const phone = worker?.phone;

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  useEffect(() => {
    if (!phone) return;
    getMyJobs(phone)
      .then((data) => setJobs(data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [phone]);

  const jt = (a: Application) => a.job?.jobTitle?.[language] || a.job?.jobTitle?.en || "";
  const jl = (a: Application) => a.job?.location?.[language] || a.job?.location?.en || "";

  // ── numbers for the stat cards ──
  const stats = useMemo(() => {
    const done = jobs.filter(isDone);
    const active = jobs.filter((a) => !isDone(a));
    const rated = done.filter((a) => (a.rating ?? 0) > 0);
    const avg = rated.length ? rated.reduce((s, a) => s + (a.rating || 0), 0) / rated.length : null;
    const latestActive = [...active].sort((a, b) => stamp(b) - stamp(a))[0];
    return {
      active, done, rated: rated.length, avg,
      earned: done.reduce((s, a) => s + salaryOf(a), 0),
      review: active.filter(isReview).length,
      latestActive,
    };
  }, [jobs]);

  const counts: Record<TabKey, number> = {
    all: jobs.length,
    review: jobs.filter(isReview).length,
    completed: stats.done.length,
    offers: jobs.filter(isOffer).length,
  };

  const visible = useMemo(() => {
    const list = jobs.filter((a) => (tab === "all" ? true : tab === "review" ? isReview(a) : tab === "completed" ? isDone(a) : isOffer(a)));
    return [...list].sort((a, b) => (sort === "pay" ? salaryOf(b) - salaryOf(a) : sort === "oldest" ? stamp(a) - stamp(b) : stamp(b) - stamp(a)));
  }, [jobs, tab, sort]);

  const timeAgo = (iso?: string) => {
    if (!iso) return "";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
    if (mins < 60) return rtf.format(-Math.max(mins, 1), "minute");
    if (mins < 1440) return rtf.format(-Math.round(mins / 60), "hour");
    return rtf.format(-Math.round(mins / 1440), "day");
  };
  const dateOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

  // ── actions ──
  const downloadStatement = () => {
    const rows = [["Contract ID", "Job", "Employer", "Location", "Amount (INR)", "Status", "Rating", "Last updated"]];
    jobs.forEach((a) =>
      rows.push([contractId(a), jt(a), a.job?.companyName || "", jl(a), String(salaryOf(a)), isDone(a) ? "Completed" : isOffer(a) ? "Offer" : "Applied", String(a.rating ?? ""), dateOf(a.updatedAt)])
    );
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    download("hiremate-statement.csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
  };

  const downloadReceipt = (a: Application) => {
    const lines = [
      "HIREMATE — PAYMENT RECEIPT", "",
      `Contract ID : ${contractId(a)}`,
      `Worker      : ${worker?.name ?? ""}`,
      `Job         : ${jt(a)}`,
      `Employer    : ${a.job?.companyName ?? ""}`,
      `Location    : ${jl(a)}`,
      `Amount      : ${inr(salaryOf(a))}`,
      `Payment     : ${a.job?.paymentMethod ?? "HireMate Escrow"}`,
      `Completed   : ${dateOf(a.updatedAt)}`,
    ];
    download(`receipt-${contractId(a).slice(1)}.txt`, lines.join("\r\n"), "text/plain;charset=utf-8");
  };

  const withdraw = (a: Application) => {
    if (!window.confirm(L(`Withdraw your application for ${jt(a)}?`, `${jt(a)} का आवेदन वापस लें?`, `${jt(a)} साठीचा अर्ज मागे घ्यायचा?`))) return;
    // TODO: the backend has no "withdraw application" endpoint yet — wire it here once it exists.
    toast(L("Withdrawing isn't available yet.", "आवेदन वापस लेना अभी उपलब्ध नहीं है।", "अर्ज मागे घेणे अजून उपलब्ध नाही."), "info");
  };

  const whatsappHref = (a: Application, text: string) => {
    const d = digits(a.job?.contactInfo);
    if (!d) return null;
    return `https://wa.me/${d.length === 10 ? "91" + d : d}?text=${encodeURIComponent(text)}`;
  };

  const payTag = (a: Application, done: boolean) => {
    const m = (a.job?.paymentMethod || "").toLowerCase();
    if (done) return m === "upi" ? L("Paid via UPI Instant", "UPI से तुरंत भुगतान", "UPI ने त्वरित पेमेंट") : L("Paid via HireMate Escrow", "हायरमेट एस्क्रो से भुगतान", "हायरमेट एस्क्रोद्वारे पेमेंट");
    if (m === "upi") return L("UPI Instant", "UPI तुरंत", "UPI त्वरित");
    if (m === "cash") return L("Cash Payment", "नकद भुगतान", "रोख पेमेंट");
    return L("Direct Bank Transfer", "सीधे बैंक ट्रांसफर", "थेट बँक ट्रान्सफर");
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: L("All Jobs", "सभी काम", "सर्व कामे") },
    { key: "review", label: L("In Review / Applied", "समीक्षा / आवेदित", "पुनरावलोकन / अर्ज") },
    { key: "completed", label: L("Completed", "पूर्ण", "पूर्ण") },
    { key: "offers", label: L("Direct Offers", "सीधे ऑफर", "थेट ऑफर") },
  ];

  const hub = worker?.location?.split(",")[0]?.trim();

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
      {/* ───── Page header ───── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[26px] font-bold tracking-tight text-[#0b1b3d] sm:text-[30px]">
              {L("My Jobs & Work History", "मेरे काम और इतिहास", "माझी कामे आणि इतिहास")}
            </h1>
            {hub && <span className="rounded-full bg-[#e6efff] px-3 py-1 text-[13px] font-semibold text-[#1a4fc4]">{hub} Hub</span>}
          </div>
          <p className="mb-0 mt-2 text-[15px] text-[#5b6a88]">
            {L("Manage active assignments, application status, wage receipts, and employer ratings.", "सक्रिय काम, आवेदन की स्थिति, वेतन रसीदें और नियोक्ता रेटिंग प्रबंधित करें।", "सक्रिय कामे, अर्जाची स्थिती, मजुरी पावत्या आणि मालक रेटिंग व्यवस्थापित करा.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadStatement}
            disabled={jobs.length === 0}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0b1b3d] shadow-[0_1px_3px_rgba(20,50,110,0.06)] hover:bg-[#f6f8fc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload size={16} aria-hidden="true" /> {L("Download Statement", "स्टेटमेंट डाउनलोड", "स्टेटमेंट डाउनलोड")}
          </button>
          <Link href="/jobs" className="flex items-center gap-2 rounded-xl bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(31,107,255,0.3)] hover:bg-[#1859d6]">
            <FiPlus size={17} aria-hidden="true" /> {L("Find New Jobs", "नए काम खोजें", "नवीन कामे शोधा")}
          </Link>
        </div>
      </div>

      {/* ───── Stat cards ───── */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={L("Active & Applied", "सक्रिय और आवेदित", "सक्रिय आणि अर्ज")} iconBg="#fff6df" iconColor="#e08a00" icon={<FiClock size={22} aria-hidden="true" />}>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-bold leading-none text-[#0b1b3d]">{stats.active.length}</span>
            <span className="text-[14px] text-[#8a96ae]">{L("Job In-Review", "समीक्षा में", "पुनरावलोकनात")}</span>
          </div>
          {stats.latestActive ? (
            <div className="mt-3 flex items-center gap-2 truncate text-[13.5px] font-semibold text-[#d97706]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#f59e0b]" />
              <span className="truncate">{jt(stats.latestActive)} • {inr(salaryOf(stats.latestActive))}/mo</span>
            </div>
          ) : (
            <div className="mt-3 text-[13.5px] text-[#8a96ae]">{L("Nothing pending", "कुछ लंबित नहीं", "काही प्रलंबित नाही")}</div>
          )}
        </StatCard>

        <StatCard label={L("Completed Jobs", "पूर्ण काम", "पूर्ण कामे")} iconBg="#e3f8ee" iconColor="#10b981" icon={<FiCheckCircle size={22} aria-hidden="true" />}>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-bold leading-none text-[#0b1b3d]">{stats.done.length}</span>
            <span className="text-[14px] text-[#8a96ae]">{L("Gigs Done", "काम पूरे", "कामे पूर्ण")}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-[#059669]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#10b981]" /> {L("100% Payout Released", "100% भुगतान जारी", "100% पेमेंट जारी")}
          </div>
        </StatCard>

        <StatCard label={L("Total Earned", "कुल कमाई", "एकूण कमाई")} iconBg="#e6efff" iconColor="#1f6bff" icon={<FiCreditCard size={22} aria-hidden="true" />}>
          <div className="mt-2 text-[32px] font-bold leading-none text-[#0b1b3d]">{inr(stats.earned)}</div>
          <div className="mt-3 text-[13.5px] text-[#5b6a88]">{L("Direct to Bank & UPI", "सीधे बैंक और UPI में", "थेट बँक आणि UPI मध्ये")}</div>
        </StatCard>

        <StatCard label={L("Overall Rating", "कुल रेटिंग", "एकूण रेटिंग")} iconBg="#fff6df" iconColor="#f5b301" icon={<FiStar size={22} className="fill-current" aria-hidden="true" />}>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[32px] font-bold leading-none text-[#0b1b3d]">{stats.avg !== null ? stats.avg.toFixed(1) : "—"}</span>
            <FiStar size={20} className="fill-[#f5b301] text-[#f5b301]" aria-hidden="true" />
          </div>
          <div className="mt-3 text-[13.5px] leading-snug text-[#5b6a88]">
            {L(`Based on ${stats.rated} employer reviews`, `${stats.rated} नियोक्ता समीक्षाओं पर आधारित`, `${stats.rated} मालक पुनरावलोकनांवर आधारित`)}
          </div>
        </StatCard>
      </div>

      {/* ───── Tabs + sort ───── */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ecf5]">
        <div role="tablist" className="-mb-px flex flex-wrap gap-1">
          {tabs.map((x) => {
            const active = tab === x.key;
            return (
              <button
                key={x.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(x.key)}
                className={`cursor-pointer rounded-t-lg px-4 py-3 text-[14.5px] ${active ? "bg-[#e6efff] font-semibold text-[#1a4fc4]" : "font-medium text-[#33415f] hover:text-[#1a4fc4]"}`}
              >
                {x.label} ({counts[x.key]})
              </button>
            );
          })}
        </div>
        <label className="mb-2 flex items-center gap-2 text-[13.5px] text-[#8a96ae]">
          {L("Sort:", "क्रम:", "क्रम:")}
          <span className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer appearance-none rounded-lg border border-[#dde4f0] bg-white py-2 pl-3.5 pr-9 text-[14px] text-[#0b1b3d] outline-none focus:border-[#1f6bff]"
            >
              <option value="latest">{L("Latest First", "नवीनतम पहले", "नवीन आधी")}</option>
              <option value="oldest">{L("Oldest First", "पुराने पहले", "जुने आधी")}</option>
              <option value="pay">{L("Highest Pay", "सबसे ज़्यादा वेतन", "सर्वाधिक पगार")}</option>
            </select>
            <FiChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5b6a88]" aria-hidden="true" />
          </span>
        </label>
      </div>

      {/* ───── Job cards ───── */}
      <div className="mt-6 space-y-5">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#cfd8e8] bg-white p-12 text-center text-[16px] text-[#5b6a88]">
            {!loaded && phone ? L("Loading your jobs…", "आपके काम लोड हो रहे हैं…", "तुमची कामे लोड होत आहेत…") : t.noJobsApplied}
          </div>
        )}

        {visible.map((a) => {
          const done = isDone(a);
          const offer = isOffer(a);
          const title = jt(a);
          const pay = salaryOf(a);
          const wa = whatsappHref(a, L(`Hello, I'm ${worker?.name ?? ""}. Regarding the ${title} job on HireMate.`, `नमस्ते, मैं ${worker?.name ?? ""} हूँ। हायरमेट पर ${title} काम के बारे में।`, `नमस्कार, मी ${worker?.name ?? ""}. हायरमेटवरील ${title} कामाबद्दल.`));
          const emoji = tradeEmoji(a.job?.jobTitle?.en || title);

          if (done) {
            return (
              <article key={a._id} className="rounded-2xl border border-[#e6ecf5] bg-white p-6 shadow-[0_2px_10px_rgba(20,50,110,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-[#fff3e6] text-[30px]" aria-hidden="true">{emoji}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="m-0 text-[21px] font-semibold text-[#0b1b3d]">{title}</h3>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a7e8c8] bg-[#ecfdf5] px-3 py-1 text-[13px] font-medium text-[#047857]">
                          <FiCheckCircle size={14} aria-hidden="true" /> {L("Status: Completed", "स्थिति: पूर्ण", "स्थिती: पूर्ण")}
                          {(a.rating ?? 0) > 0 && <FiStar size={13} className="fill-[#f5b301] text-[#f5b301]" aria-hidden="true" />}
                        </span>
                      </div>
                      {jl(a) && (
                        <div className="mt-2 flex items-center gap-2 text-[14.5px] text-[#33415f]">
                          <FiMapPin size={15} className="shrink-0 text-[#e11d48]" aria-hidden="true" /> {jl(a)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[28px] font-bold leading-none text-[#e8002a]">{inr(pay)}</div>
                    <span className="mt-3 inline-block rounded-md border border-[#a7e8c8] bg-[#ecfdf5] px-3 py-1 text-[12.5px] font-medium text-[#047857]">{payTag(a, true)}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-5 py-4">
                  {(a.rating ?? 0) > 0 ? <Stars value={a.rating!} size={18} /> : <span className="text-[13.5px] text-[#8a96ae]">{L("Awaiting employer rating", "नियोक्ता रेटिंग की प्रतीक्षा", "मालकाच्या रेटिंगची प्रतीक्षा")}</span>}
                  {a.review && (
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[14.5px] italic text-[#1f2a44]">&ldquo;{a.review}&rdquo;</p>
                      <p className="m-0 mt-1 text-[12.5px] text-[#8a96ae]">
                        — {a.job?.companyName || L("Employer", "नियोक्ता", "मालक")}{a.updatedAt ? ` • ${L("Completed on", "पूर्ण हुआ", "पूर्ण झाले")} ${dateOf(a.updatedAt)}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] pt-4">
                  <div className="text-[13.5px] text-[#5b6a88]">
                    {L("Contract ID:", "कॉन्ट्रैक्ट ID:", "कॉन्ट्रॅक्ट ID:")} <span className="ml-1 font-mono font-bold text-[#0b1b3d]">{contractId(a)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button onClick={() => downloadReceipt(a)} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#dde4f0] bg-white px-4 py-2 text-[14px] font-medium text-[#0b1b3d] hover:bg-[#f6f8fc]">
                      <FiFileText size={15} aria-hidden="true" /> {L("Receipt Slip", "रसीद", "पावती")}
                    </button>
                    <a
                      href={wa ?? (digits(a.job?.contactInfo) ? `tel:${a.job?.contactInfo}` : undefined)}
                      target={wa ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[#e6efff] px-4 py-2 text-[14px] font-semibold text-[#1a4fc4] no-underline hover:bg-[#d6e5ff]"
                    >
                      {L("Book Again / Contact", "फिर बुक करें / संपर्क", "पुन्हा बुक करा / संपर्क")}
                    </a>
                  </div>
                </div>
              </article>
            );
          }

          // ── active / applied card ──
          const accent = offer ? "bg-[#1f6bff]" : "bg-[#f59e0b]";
          return (
            <article key={a._id} className={`overflow-hidden rounded-2xl border bg-white shadow-[0_2px_10px_rgba(20,50,110,0.05)] ${offer ? "border-[#bcd3ff]" : "border-[#cfe0ff]"}`}>
              <div className={`h-[5px] w-full ${accent}`} />
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-[#eaf1ff] text-[30px]" aria-hidden="true">{emoji}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="m-0 text-[21px] font-semibold text-[#0b1b3d]">{title}</h3>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium ${offer ? "border-[#bcd3ff] bg-[#eaf1ff] text-[#1a4fc4]" : "border-[#fcd9a1] bg-[#fff7e8] text-[#b45309]"}`}>
                          <span className={`h-2 w-2 rounded-full ${offer ? "bg-[#1f6bff]" : "bg-[#f59e0b]"}`} />
                          {offer ? L("Offer • Accepted by employer", "ऑफर • नियोक्ता ने स्वीकारा", "ऑफर • मालकाने स्वीकारले") : L("Applied • Employer Reviewing", "आवेदित • नियोक्ता समीक्षा में", "अर्ज • मालक पाहत आहे")}
                        </span>
                      </div>
                      {jl(a) && (
                        <div className="mt-2 flex items-center gap-2 text-[14.5px] text-[#33415f]">
                          <FiMapPin size={15} className="shrink-0 text-[#e11d48]" aria-hidden="true" /> {jl(a)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[28px] font-bold leading-none text-[#0b1b3d]">
                      {inr(pay)}<span className="ml-1 text-[14px] font-normal text-[#5b6a88]">/{L("month", "माह", "महिना")}</span>
                    </div>
                    <span className="mt-3 inline-block rounded-md border border-[#a7e8c8] bg-[#ecfdf5] px-3 py-1 text-[12.5px] font-medium text-[#047857]">{payTag(a, false)}</span>
                  </div>
                </div>

                {/* Status tracker */}
                <div className="mt-5 rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-[#0b1b3d]">{L("Application Status Tracker", "आवेदन स्थिति ट्रैकर", "अर्ज स्थिती ट्रॅकर")}</span>
                    {a.updatedAt && <span className="text-[13px] text-[#5b6a88]">{L("Updated", "अपडेट", "अपडेट")} {timeAgo(a.updatedAt)}</span>}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <TrackerStep n={1} state="done" text={L("Applied", "आवेदित", "अर्ज केला")} />
                    <TrackerStep n={2} state={offer ? "done" : "current"} text={L("Profile Viewed", "प्रोफ़ाइल देखी गई", "प्रोफाइल पाहिली")} />
                    <TrackerStep n={3} state={offer ? "done" : "todo"} text={L("Job Offer", "जॉब ऑफर", "जॉब ऑफर")} />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] pt-4">
                  <div className="text-[14px] text-[#5b6a88]">
                    {L("Employer:", "नियोक्ता:", "मालक:")} <span className="ml-1 font-semibold text-[#0b1b3d]">{a.job?.companyName || "—"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => withdraw(a)} className="cursor-pointer bg-transparent px-2 py-2 text-[14px] font-medium text-[#33415f] hover:text-[#d6203a]">
                      {L("Withdraw", "वापस लें", "मागे घ्या")}
                    </button>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-[#047857]">
                        <FaWhatsapp size={16} aria-hidden="true" /> {L("Chat on WhatsApp", "WhatsApp पर चैट", "WhatsApp वर चॅट")}
                      </a>
                    )}
                    {a.job?._id && (
                      <Link href={`/jobs/${a.job._id}`} className="rounded-lg bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white no-underline hover:bg-[#1859d6]">
                        {L("View Application", "आवेदन देखें", "अर्ज पहा")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}