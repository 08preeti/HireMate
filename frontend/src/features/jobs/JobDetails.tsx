"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft, FiCheck, FiCheckCircle, FiCheckSquare, FiClock, FiFlag, FiHeadphones, FiMapPin, FiNavigation, FiPhone, FiSettings, FiShield, FiSquare, FiStar, FiTool, FiUsers, FiZap, FiDollarSign, FiFileText, FiVolume2,
} from "react-icons/fi";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LOGIN } from "@/config/routes";
import { haversine } from "@/lib/geo";
import { speakWithEnd, stopSpeaking } from "@/lib/speech";
import { ApiError } from "@/services/api";
import { getJob, reportJob } from "@/services/jobs";
import { applyToJob } from "@/services/applications";
import type { Job, LocalizedText } from "@/types";

const digits = (s?: string) => (s || "").replace(/\D/g, "");
const inr = (v: number | string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString("en-IN")}` : v ? `₹${v}` : "—";
};

const tradeEmoji = (title = "") => {
  const t = title.toLowerCase();
  if (/mechanic|मैकेनिक|मेकॅनिक/.test(t)) return "🔧";
  if (/driv|चालक|ड्रायव्हर/.test(t)) return "🚗";
  if (/chef|cook|कुक|रसोई|स्वयंपाक/.test(t)) return "👨‍🍳";
  if (/plumb|नल/.test(t)) return "🚰";
  if (/electric|बिजली|वीज/.test(t)) return "⚡";
  if (/clean|सफाई|स्वच्छ/.test(t)) return "🧹";
  if (/paint|पेंट|रंग/.test(t)) return "🎨";
  if (/guard|security|सुरक्षा/.test(t)) return "💂";
  return "💼";
};

const SKILL_STYLES = [
  { icon: FiTool, bg: "bg-[#e6efff]", fg: "text-[#1f6bff]" },
  { icon: FiSettings, bg: "bg-[#ffece6]", fg: "text-[#e5532d]" },
  { icon: FiZap, bg: "bg-[#e3f8ee]", fg: "text-[#10b981]" },
  { icon: FiCheckSquare, bg: "bg-[#fff6df]", fg: "text-[#e08a00]" },
];

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="m-0 mb-3 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#0b1b3d]">
      <span className="text-[#e5532d]">{icon}</span> {children}
    </h2>
  );
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();
  const { worker } = useAuth();
  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", message: "" });
  const [reportForm, setReportForm] = useState({ reason: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Optional employer details may be a plain string or a per-language object.
  const loc = (v?: string | LocalizedText) => (typeof v === "string" ? v : v?.[language] || v?.en || "");
  const speechLang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";

  // Stop any audio when leaving the page.
  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    getJob(id)
      .then((data) => { setJob(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const submitApplication = async (body: { applicantName: string; applicantContact?: string; message?: string }) => {
    if (!job) return;
    setSubmitting(true);
    try {
      await applyToJob(job._id, body);
      toast(t.appliedSuccess, "success");
      setShowApply(false);
      setAppliedSuccess(true);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error submitting application", "error");
    }
    setSubmitting(false);
  };

  // 1-tap apply: use the worker's saved profile. Only ask for details if the profile has none.
  const handleApplyClick = () => {
    if (!worker) { router.push(ROLE_LOGIN.worker); return; }
    const phone = worker.phone || worker.contact || "";
    if (worker.name && phone) {
      void submitApplication({ applicantName: worker.name, applicantContact: phone });
      return;
    }
    setForm((f) => ({ ...f, name: f.name || worker.name || "", contact: f.contact || phone }));
    setShowApply(true);
  };

  const handleApplyForm = () => {
    if (!form.name || !form.contact) return alert("Name and phone required");
    void submitApplication({ applicantName: form.name, applicantContact: form.contact, message: form.message });
  };

  const handleReport = async () => {
    if (!job) return;
    if (!reportForm.reason) return alert("Please select a reason");
    setReporting(true);
    try {
      await reportJob(job._id, { reason: reportForm.reason, reporterPhone: reportForm.phone });
      setReportDone(true);
      setTimeout(() => { setShowReport(false); setReportDone(false); }, 2000);
    } catch { alert("Could not submit report"); }
    setReporting(false);
  };

  const title = job?.jobTitle?.[language] || job?.jobTitle?.en || "";
  const location = job?.location?.[language] || job?.location?.en || "";
  const skillList = useMemo(
    () => (job?.skills?.[language] || job?.skills?.en || "").split(/[,،;、]/).map((s) => s.trim()).filter(Boolean),
    [job, language]
  );
  const distanceKm = useMemo(() => {
    const me = worker?.currentLocation;
    if (!me || job?.latitude == null || job?.longitude == null) return null;
    return haversine(me.lat, me.lng, job.latitude, job.longitude);
  }, [worker, job]);

  const postedAgo = (() => {
    if (!job?.createdAt) return "";
    const mins = Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
    if (mins < 60) return rtf.format(-Math.max(mins, 1), "minute");
    if (mins < 1440) return rtf.format(-Math.round(mins / 60), "hour");
    return rtf.format(-Math.round(mins / 1440), "day");
  })();

  if (loading) return <div className="p-10 text-center">{t.loading}</div>;
  if (!job) return <div className="p-10 text-center">{t.jobNotFound}</div>;

  const REPORT_REASONS = {
    en: ["Fake job / fraud", "Wrong salary shown", "Employer not responding", "Job already filled", "Inappropriate content"],
    hi: ["फर्जी नौकरी / धोखा", "गलत वेतन दिखाया", "नियोक्ता जवाब नहीं दे रहा", "नौकरी पहले ही भर गई", "अनुचित सामग्री"],
    mr: ["बनावट नोकरी / फसवणूक", "चुकीचा पगार दाखवला", "नियोक्ता प्रतिसाद देत नाही", "नोकरी आधीच भरली", "अयोग्य सामग्री"],
  };
  const reasons = REPORT_REASONS[language] || REPORT_REASONS.en;

  const phoneDigits = digits(job.contactInfo);
  const waHref = phoneDigits
    ? `https://wa.me/${phoneDigits.length === 10 ? "91" + phoneDigits : phoneDigits}?text=${encodeURIComponent(L(`Hello, I saw the ${title} job on HireMate.`, `नमस्ते, मैंने हायरमेट पर ${title} काम देखा।`, `नमस्कार, मी हायरमेटवर ${title} काम पाहिले.`))}`
    : null;
  const mapsHref =
    job.latitude != null && job.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
      : location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null;
  const unitLabel = {
    hour: L("/ Hour", "/ घंटा", "/ तास"),
    day: L("/ Day (Daily)", "/ दिन (रोज़ाना)", "/ दिवस (दैनिक)"),
    week: L("/ Week", "/ सप्ताह", "/ आठवडा"),
    month: L("/ Month", "/ माह", "/ महिना"),
  }[job.salaryUnit ?? "day"];
  const salaryNum = Number(String(job.salary ?? "").replace(/[^\d.]/g, ""));
  const estMonthly = job.salaryUnit === "day" && salaryNum > 0 ? salaryNum * 26 : null;
  const payMethod = (job.paymentMethod || "").toLowerCase();
  const payLine = payMethod === "cash"
    ? L("Instant Cash in Hand", "तुरंत नकद हाथ में", "त्वरित रोख हातात")
    : payMethod === "upi"
      ? L("Instant UPI Payment", "तुरंत UPI भुगतान", "त्वरित UPI पेमेंट")
      : job.paymentMethod ? `${L("Payment:", "भुगतान:", "पेमेंट:")} ${job.paymentMethod}` : "";
  const dailyNote = job.salaryUnit === "day" ? ` ${L("(Daily at end of work)", "(रोज़ काम के अंत में)", "(रोज कामाच्या शेवटी)")}` : "";

  const [titleMain, titleSub] = (() => {
    const m = title.match(/^(.*?)\s*(\(.+\))\s*$/);
    return m ? [m[1], m[2]] : [title, ""];
  })();
  const category = loc(job.category) || skillList[0] || "";
  const landmarks = (job.landmarks || []).map(loc).filter(Boolean);
  const perks = loc(job.perks);
  const busStop = loc(job.busStop);
  const toolsProvided = loc(job.toolsProvided);

  // Everything the audio guide reads out, in the worker's language.
  const buildSpeech = () => {
    const parts = [
      title,
      job.companyName,
      salaryNum > 0 ? L(`Wage ${salaryNum} rupees${job.salaryUnit ? " per " + job.salaryUnit : ""}.`, `वेतन ${salaryNum} रुपये${job.salaryUnit ? " " + { hour: "प्रति घंटा", day: "प्रति दिन", week: "प्रति सप्ताह", month: "प्रति माह" }[job.salaryUnit] : ""}।`, `मजुरी ${salaryNum} रुपये${job.salaryUnit ? " " + { hour: "प्रति तास", day: "प्रति दिवस", week: "प्रति आठवडा", month: "प्रति महिना" }[job.salaryUnit] : ""}.`) : "",
      location && L(`Location: ${location}.`, `जगह: ${location}।`, `ठिकाण: ${location}.`),
      skillList.length ? L(`Skills needed: ${skillList.join(", ")}.`, `ज़रूरी हुनर: ${skillList.join(", ")}।`, `आवश्यक कौशल्ये: ${skillList.join(", ")}.`) : "",
      job.dutyTimings && L(`Duty timings: ${job.dutyTimings}.`, `काम का समय: ${job.dutyTimings}।`, `कामाची वेळ: ${job.dutyTimings}.`),
      perks && L(`Perks: ${perks}.`, `सुविधाएँ: ${perks}।`, `सुविधा: ${perks}.`),
      toolsProvided && L(`Tools: ${toolsProvided}.`, `औज़ार: ${toolsProvided}।`, `अवजारे: ${toolsProvided}.`),
      loc(job.description),
      L("To apply, press the red Apply Now button.", "आवेदन के लिए लाल बटन दबाएँ।", "अर्जासाठी लाल बटण दाबा."),
    ];
    return parts.filter(Boolean).join(" ");
  };
  const toggleAudio = (text: string) => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    if (speakWithEnd(text, speechLang, () => setSpeaking(false))) setSpeaking(true);
    else toast(L("Audio isn't supported on this device.", "इस डिवाइस पर ऑडियो उपलब्ध नहीं है।", "या डिव्हाइसवर ऑडिओ उपलब्ध नाही."), "info");
  };

  const jobCode = `#HM-JOB-${job._id.slice(-4).toUpperCase()}`;

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f6f8fc] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[780px]">
        {/* Voice guide */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f3cf62] bg-[#fff6d6] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f59e0b] text-white"><FiVolume2 size={22} aria-hidden="true" /></span>
            <div className="min-w-0 leading-tight">
              <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#a15c00]">{L("Voice Guide (Audio Assistance)", "वॉइस गाइड (ऑडियो सहायता)", "व्हॉइस गाइड (ऑडिओ मदत)")}</div>
              <div className="mt-0.5 text-[14.5px] font-semibold text-[#3b2a00]">{L("Press the yellow button — the full job details will be read aloud to you!", "पीला बटन दबाएँ — पूरी जानकारी आपको बोलकर सुनाई जाएगी!", "पिवळे बटण दाबा — संपूर्ण माहिती तुम्हाला वाचून दाखवली जाईल!")}</div>
            </div>
          </div>
          <button
            onClick={() => toggleAudio(buildSpeech())}
            aria-pressed={speaking}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_14px_rgba(245,158,11,0.4)] hover:bg-[#d98a07]"
          >
            {speaking ? <FiSquare size={15} aria-hidden="true" /> : <FiVolume2 size={17} aria-hidden="true" />}
            {speaking ? L("Stop Audio", "ऑडियो रोकें", "ऑडिओ थांबवा") : L("Listen to Full Job (Audio)", "पूरा काम सुनें (ऑडियो)", "संपूर्ण काम ऐका (ऑडिओ)")}
          </button>
        </div>

        {/* Top row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <Link href="/jobs" className="flex items-center gap-1.5 font-medium text-[#1a4fc4] no-underline hover:underline">
            <FiArrowLeft size={15} aria-hidden="true" /> {L("Back to All Jobs", "सभी नौकरियों पर वापस", "सर्व नोकऱ्यांकडे परत")}
          </Link>
          <div className="flex items-center gap-2 text-[#5b6a88]">
            <span className="rounded-md bg-[#e9eef8] px-2 py-0.5 font-mono text-[11.5px] font-semibold text-[#33415f]">{jobCode}</span>
            {postedAgo && <span>• {L("Posted", "पोस्ट किया", "पोस्ट केले")} {postedAgo}</span>}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e6ecf5] bg-white shadow-[0_4px_20px_rgba(20,50,110,0.07)]">
          {/* Urgent banner */}
          {job.isUrgent && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#e11d2e] to-[#c8102e] px-5 py-2.5 text-white">
              <div className="flex items-center gap-2.5">
                <span className="rounded bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#e11d2e]">🚨 {t.urgent.toUpperCase()}</span>
                <span className="text-[14px] font-bold">{L("URGENT HIRING TODAY", "आज तुरंत भर्ती", "आज तातडीची भरती")}</span>
              </div>
              {typeof job.vacancies === "number" && job.vacancies > 0 ? (
                <span className="rounded-full bg-black/20 px-3 py-0.5 text-[12px] font-semibold">
                  {job.vacancies} {L("vacancy available", "पद उपलब्ध", "जागा उपलब्ध")}
                </span>
              ) : typeof job.applicationCount === "number" ? (
                <span className="rounded-full bg-black/20 px-3 py-0.5 text-[12px] font-semibold">
                  {job.applicationCount} {L("applied so far", "आवेदन आ चुके", "अर्ज आले")}
                </span>
              ) : null}
            </div>
          )}

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-5 px-6 py-6">
            <div className="flex min-w-0 flex-1 gap-4">
              <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b5bff] to-[#2a3fd1] text-[30px] shadow-[0_6px_14px_rgba(59,91,255,0.35)]" aria-hidden="true">
                {tradeEmoji(job.jobTitle?.en || title)}
              </span>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap gap-2">
                  {category && <span className="rounded-md border border-[#bcd3ff] bg-[#eaf1ff] px-2 py-0.5 text-[11.5px] font-semibold text-[#1a4fc4]">{category}</span>}
                  <button
                    onClick={() => toggleAudio([title, job.companyName, salaryNum > 0 ? inr(job.salary) : ""].filter(Boolean).join(". "))}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#f3cf62] bg-[#fff6d6] px-2 py-0.5 text-[11.5px] font-semibold text-[#a15c00]"
                  >
                    {L("Listen", "सुनें", "ऐका")} <FiVolume2 size={12} aria-hidden="true" />
                  </button>
                </div>
                <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-tight text-[#0b1b3d]">
                  {titleMain}{titleSub && <span className="ml-1.5 text-[19px] font-semibold text-[#6b7894]">{titleSub}</span>}
                </h1>
                {(job.companyName || job.ownerName) && (
                  <p className="m-0 mt-2 flex flex-wrap items-center gap-x-2 text-[13.5px] text-[#5b6a88]">
                    {job.companyName && <span className="font-bold text-[#0b1b3d]">{job.companyName}</span>}
                    {job.companyName && job.ownerName && <span className="text-[#c3cbdb]">|</span>}
                    {job.ownerName && <span>{L("Owner:", "मालिक:", "मालक:")} {job.ownerName}</span>}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {job.employerVerified && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#a7e8c8] bg-[#ecfdf5] px-2 py-0.5 text-[12px] font-semibold text-[#047857]">
                      <FiCheckCircle size={12} aria-hidden="true" /> {L("Verified Employer", "सत्यापित नियोक्ता", "सत्यापित नियोक्ता")} ✓
                    </span>
                  )}
                  {(job.rating ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#fcd9a1] bg-[#fff7e8] px-2 py-0.5 text-[12px] font-semibold text-[#b45309]">
                      <FiStar size={12} className="fill-[#f5b301] text-[#f5b301]" aria-hidden="true" /> {Number(job.rating).toFixed(1)}
                      {job.totalReviews ? <span className="font-normal text-[#8a6a2a]"> ({L("Rated by", "रेटिंग:", "रेटिंग:")} {job.totalReviews} {L("workers", "कामगार", "कामगार")})</span> : null}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full rounded-xl border-2 border-[#2bb59a]/60 bg-[#f1fbf8] px-5 py-3.5 text-right sm:w-auto sm:min-w-[220px]">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5b6a88]">{L("Guaranteed Wage Rate", "गारंटीड वेतन दर", "हमी मजुरी दर")}</div>
              <div className="mt-0.5 text-[32px] font-extrabold leading-tight text-[#e8002a]">
                {inr(job.salary)}
                {job.salaryUnit && <span className="ml-1.5 text-[14px] font-bold text-[#33415f]">{unitLabel}</span>}
              </div>
              {payLine && (
                <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[12.5px] font-medium text-[#047857]">
                  <FiDollarSign size={13} aria-hidden="true" /> {payLine}{dailyNote}
                </div>
              )}
              {estMonthly !== null && (
                <div className="mt-0.5 text-[11.5px] text-[#8a96ae]">{L("Estimated Monthly:", "अनुमानित मासिक:", "अंदाजे मासिक:")} {inr(estMonthly)}</div>
              )}
            </div>
          </div>

          {/* Escrow strip */}
          <div className="space-y-3 border-y border-[#d8f1e8] bg-[#f1fbf8] px-6 py-4">
            {perks && (
              <div className="flex items-center gap-2.5 text-[14.5px] font-bold text-[#0b3a2e]">
                <span className="text-[20px]" aria-hidden="true">🍲</span>
                <span>{L("Free Perks:", "मुफ़्त सुविधाएँ:", "मोफत सुविधा:")} {perks}</span>
              </div>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#bcd3ff] bg-white px-3 py-1 text-[12px] font-semibold text-[#1a4fc4]">
              <FiShield size={13} className="text-[#e5532d]" aria-hidden="true" />
              {L("100% HireMate Escrow Protection (Work complete = payment guaranteed)", "100% हायरमेट एस्क्रो सुरक्षा (काम पूरा = भुगतान की गारंटी)", "100% हायरमेट एस्क्रो सुरक्षा (काम पूर्ण = पेमेंट हमी)")}
            </span>
          </div>

          {/* Location */}
          <div className="px-6 py-6">
            <SectionTitle icon={<FiMapPin size={15} aria-hidden="true" />}>{L("Job Location & Landmarks", "काम की जगह", "कामाचे ठिकाण")}</SectionTitle>
            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
              <div className="rounded-xl border border-[#e6ecf5] bg-[#fbfcfe] p-4">
                <div className="text-[15px] font-semibold text-[#0b1b3d]">{location || "—"}</div>
                {landmarks.length > 0 && (
                  <div className="mt-2.5 flex flex-col items-start gap-2">
                    {landmarks.map((lm, i) => (
                      <span
                        key={`${lm}-${i}`}
                        className={`rounded-md border px-2.5 py-1 text-[12.5px] font-medium ${i === 0 ? "border-[#f3cf62] bg-[#fff6d6] text-[#7a4a00]" : "border-[#e1e6f0] bg-[#eef1f7] text-[#33415f]"}`}
                      >
                        {i === 0 && <FiMapPin size={12} className="mr-1.5 inline text-[#e5532d]" aria-hidden="true" />}{lm}
                      </span>
                    ))}
                  </div>
                )}
                {(distanceKm !== null || busStop) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#edf1f7] pt-3 text-[12.5px]">
                    {distanceKm !== null && (
                      <span className="flex items-center gap-1.5 font-medium text-[#047857]">
                        <FiNavigation size={13} aria-hidden="true" />
                        {distanceKm.toFixed(1)} km {L("from your location", "आपकी जगह से", "तुमच्या ठिकाणापासून")} ({Math.max(1, Math.round(distanceKm * 11))} min {L("walk", "पैदल", "चालत")})
                      </span>
                    )}
                    {busStop && <span className="text-[#5b6a88]">• {busStop}</span>}
                  </div>
                )}
              </div>
              {mapsHref && (
                <div className="flex flex-col justify-between rounded-xl border border-[#bcd3ff] bg-[#f0f6ff] p-4">
                  <div>
                    <div className="text-[12.5px] font-bold text-[#0b1b3d]">{L("Live Job Location", "काम की लोकेशन", "कामाचे लोकेशन")}</div>
                    <p className="m-0 mt-1 text-[12px] leading-snug text-[#3b6bd6]">{L("Need directions? Tap below to open Google Maps.", "रास्ता चाहिए? Google Maps खोलने के लिए नीचे दबाएँ।", "मार्ग हवा? Google Maps उघडण्यासाठी खाली दाबा.")}</p>
                  </div>
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[#1f6bff] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1a4fc4] no-underline hover:bg-[#eaf1ff]">
                    <FiNavigation size={14} aria-hidden="true" /> {L("View Route on Map", "मैप पर रास्ता देखें", "नकाशावर मार्ग पहा")}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {skillList.length > 0 && (
            <div className="border-t border-[#edf1f7] px-6 py-6">
              <SectionTitle icon={<FiTool size={15} aria-hidden="true" />}>{L("Required Work & Skills", "ज़रूरी काम और हुनर", "आवश्यक काम आणि कौशल्ये")}</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {skillList.map((s, i) => {
                  const st = SKILL_STYLES[i % SKILL_STYLES.length];
                  const Icon = st.icon;
                  return (
                    <div key={`${s}-${i}`} className="flex items-center gap-3 rounded-xl border border-[#e6ecf5] bg-white p-3.5">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${st.bg} ${st.fg}`}><Icon size={18} aria-hidden="true" /></span>
                      <span className="text-[13.5px] font-semibold leading-snug text-[#0b1b3d]">{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Duty timings & tools */}
          {(job.dutyTimings || toolsProvided) && (
            <div className={`grid gap-3 px-6 pb-6 sm:grid-cols-2 ${skillList.length ? "" : "border-t border-[#edf1f7] pt-6"}`}>
              {job.dutyTimings && (
                <div className="flex gap-3 rounded-xl border border-[#e6ecf5] bg-white p-4">
                  <span className="text-[28px] leading-none" aria-hidden="true">⏰</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-[#33415f]">{L("Duty Timings:", "काम का समय:", "कामाची वेळ:")}</div>
                    <div className="mt-0.5 text-[15px] font-extrabold text-[#1a3fb4]">{job.dutyTimings}</div>
                    {loc(job.dutyNote) && <div className="mt-0.5 text-[11.5px] text-[#8a96ae]">{loc(job.dutyNote)}</div>}
                  </div>
                </div>
              )}
              {toolsProvided && (
                <div className="flex gap-3 rounded-xl border border-[#e6ecf5] bg-white p-4">
                  <span className="text-[28px] leading-none" aria-hidden="true">🧰</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-[#33415f]">{L("Tools Provided:", "औज़ार उपलब्ध:", "अवजारे उपलब्ध:")}</div>
                    <div className="mt-0.5 text-[15px] font-extrabold text-[#047857]">{toolsProvided}</div>
                    {loc(job.toolsNote) && <div className="mt-0.5 text-[11.5px] text-[#8a96ae]">{loc(job.toolsNote)}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {(job.description?.[language] || job.description?.en) && (
            <div className="border-t border-[#edf1f7] px-6 py-6">
              <SectionTitle icon={<FiFileText size={15} aria-hidden="true" />}>{L("Job Details", "काम का विवरण", "कामाचा तपशील")}</SectionTitle>
              <p className="m-0 whitespace-pre-line rounded-xl border border-[#e6ecf5] bg-[#fbfcfe] p-4 text-[14px] leading-relaxed text-[#1f2a44]">
                {job.description?.[language] || job.description?.en}
              </p>
            </div>
          )}

          {/* Instant connect */}
          <div className="border-t border-[#edf1f7] bg-[#fafbfe] px-6 py-6">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5b6a88]">{L("Instant Connect (Instant Apply & Call)", "तुरंत जुड़ें (आवेदन और कॉल)", "त्वरित संपर्क (अर्ज आणि कॉल)")}</div>
            <h2 className="m-0 mb-4 mt-1 text-[17px] font-bold text-[#0b1b3d]">{L("Interested? Accept this job with 1-Tap", "रुचि है? 1-टैप में यह काम स्वीकारें", "आवड आहे? 1-टॅपमध्ये हे काम स्वीकारा")}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={handleApplyClick}
                disabled={submitting}
                className="flex min-h-[68px] cursor-pointer items-center justify-center gap-3.5 rounded-2xl bg-gradient-to-r from-[#e3202f] to-[#e11d48] px-5 py-3.5 text-white shadow-[0_10px_24px_rgba(225,29,72,0.35)] transition hover:brightness-110 disabled:opacity-70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#0b1b3d]/70 bg-white text-[#16a34a]"><FiCheck size={24} strokeWidth={4} aria-hidden="true" /></span>
                <span className="text-left leading-tight">
                  <span className="block text-[19px] font-extrabold tracking-tight">{submitting ? "…" : L("Apply Now (1-Tap Apply)", "अभी आवेदन करें (1-टैप)", "आता अर्ज करा (1-टॅप)")}</span>
                  <span className="block text-[11.5px] font-medium opacity-95">{L("Direct apply with profile (No forms)", "प्रोफ़ाइल से सीधे आवेदन (कोई फ़ॉर्म नहीं)", "प्रोफाइलवरून थेट अर्ज (फॉर्म नाही)")}</span>
                </span>
              </button>

              {waHref ? (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex min-h-[68px] items-center justify-center gap-3.5 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#2fd573] px-5 py-3.5 text-white no-underline shadow-[0_10px_24px_rgba(34,197,94,0.35)] transition hover:brightness-105">
                  <span className="text-[30px] leading-none" aria-hidden="true">💬</span>
                  <span className="text-left leading-tight">
                    <span className="block text-[19px] font-extrabold tracking-tight">{L("Speak on WhatsApp", "WhatsApp पर बात करें", "WhatsApp वर बोला")}</span>
                    <span className="block text-[11.5px] font-medium opacity-95">{L("Send Voice Message (No typing)", "वॉइस मैसेज भेजें (टाइपिंग नहीं)", "व्हॉइस मेसेज पाठवा (टायपिंग नाही)")}</span>
                  </span>
                </a>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {job.contactInfo ? (
                <a href={`tel:${job.contactInfo}`} className="flex items-center gap-2 rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#0b1b3d] no-underline hover:bg-[#f6f8fc]">
                  <FiPhone size={15} className="text-[#e11d2e]" aria-hidden="true" /> {L("Call Directly", "सीधे कॉल करें", "थेट कॉल करा")} ({job.contactInfo})
                </a>
              ) : <span />}
              <button
                onClick={() => { if (!worker) { router.push(ROLE_LOGIN.worker); return; } setShowReport(true); }}
                className="flex cursor-pointer items-center gap-1.5 bg-transparent px-1 py-2 text-[13px] text-[#5b6a88] hover:text-[#e11d2e]"
              >
                <FiFlag size={14} className="text-[#e11d2e]" aria-hidden="true" /> {L("Report this job", "इस नौकरी की शिकायत करें", "ही नोकरी रिपोर्ट करा")}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#bcd3ff] bg-[#f0f6ff] px-4 py-3 text-[12.5px] leading-snug text-[#1a3a8a]">
              <FiShield size={18} className="mt-0.5 shrink-0 text-[#e5532d]" aria-hidden="true" />
              <span>
                <b>{L("HireMate Security Pledge:", "हायरमेट सुरक्षा वचन:", "हायरमेट सुरक्षा वचन:")}</b>{" "}
                {L("If an employer delays wage payout after job completion, HireMate's Guarantee Fund directly disburses the payment to your bank account.", "काम पूरा होने के बाद नियोक्ता भुगतान में देरी करे तो हायरमेट का गारंटी फंड सीधे आपके बैंक खाते में भुगतान करेगा।", "काम पूर्ण झाल्यानंतर मालकाने मजुरी उशिरा दिल्यास हायरमेटचा गॅरंटी फंड थेट तुमच्या बँक खात्यात पेमेंट करेल.")}
              </span>
            </div>
          </div>
        </div>

        {/* Trust tiles */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: FiClock, tone: "bg-[#e3f8ee] text-[#10b981]", h: L("Instant Payout", "तुरंत भुगतान", "त्वरित पेमेंट"), s: L("Work finished = payment released", "काम पूरा = भुगतान जारी", "काम पूर्ण = पेमेंट जारी") },
            { icon: FiUsers, tone: "bg-[#eaf1ff] text-[#1f6bff]", h: L("Escrow Protected", "एस्क्रो सुरक्षित", "एस्क्रो सुरक्षित"), s: L("Wage held safely by HireMate", "वेतन हायरमेट के पास सुरक्षित", "मजुरी हायरमेटकडे सुरक्षित") },
            { icon: FiHeadphones, tone: "bg-[#ffece6] text-[#e5532d]", h: L("Help & Support", "सहायता", "मदत"), s: L("Ask HireMate Assistant anytime", "कभी भी हायरमेट असिस्टेंट से पूछें", "केव्हाही हायरमेट असिस्टंटला विचारा"), href: "/ai-suggestions" },
          ].map(({ icon: Icon, tone, h, s, href }) => {
            const body = (
              <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={18} aria-hidden="true" /></span>
                <span className="leading-tight">
                  <span className="block text-[13px] font-semibold text-[#0b1b3d]">{h}</span>
                  <span className="block text-[11.5px] text-[#8a96ae]">{s}</span>
                </span>
              </>
            );
            const cls = "flex items-center gap-3 rounded-xl border border-[#e6ecf5] bg-white p-3.5 no-underline";
            return href ? <Link key={h} href={href} className={cls}>{body}</Link> : <div key={h} className={cls}>{body}</div>;
          })}
        </div>
      </div>

      {/* Apply Modal (only when the worker's profile has no name / phone) */}
      {showApply && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.45)] flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px]">
            <h3 className="mt-0 mx-0 mb-4 text-[17px] font-bold">{t.applyNow}: {title}</h3>
            <input placeholder={t.yourName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-2.5 box-border" />
            <input placeholder={t.phoneNumber} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-2.5 box-border" />
            <textarea placeholder={t.message} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-3.5 box-border resize-none" />
            <div className="flex gap-2.5">
              <button onClick={() => setShowApply(false)} className="flex-1 py-[11px] px-0 bg-gray-100 rounded-[10px] font-semibold cursor-pointer">{t.cancel}</button>
              <button onClick={handleApplyForm} disabled={submitting} className="flex-[2] py-[11px] px-0 bg-danger text-white rounded-[10px] font-bold cursor-pointer">{submitting ? "..." : t.apply}</button>
            </div>
          </div>
        </div>
      )}

      {/* Applied Success Screen */}
      {appliedSuccess && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.5)] flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-[20px] p-8 w-full max-w-[380px] text-center">
            <div className="text-[64px] mb-4">🎉</div>
            <div className="text-[22px] font-extrabold text-emerald-500 mb-2">
              {L("Application Sent!", "आवेदन भेज दिया!", "अर्ज पाठवला!")}
            </div>
            <div className="text-[14px] text-gray-500 mb-2 leading-[1.6]">
              {language === "hi" ? `${job.companyName || "नियोक्ता"} को आपका आवेदन मिल गया है।` : language === "mr" ? `${job.companyName || "नियोक्ता"} ला तुमचा अर्ज मिळाला आहे.` : `Your application has been sent to ${job.companyName || "the employer"}.`}
            </div>
            <div className="text-[13px] text-brand font-semibold mb-6 bg-brand-light rounded-[10px] py-2.5 px-3.5">
              📞 {L("The employer will call you soon", "नियोक्ता जल्द कॉल करेगा", "नियोक्ता लवकरच कॉल करेल")}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setAppliedSuccess(false)} className="flex-1 py-[13px] px-0 bg-gray-100 rounded-xl font-semibold cursor-pointer">
                {L("Close", "बंद करें", "बंद करा")}
              </button>
              <button onClick={() => router.push("/my-jobs")} className="flex-[2] py-[13px] px-0 bg-brand text-white rounded-xl font-bold text-[15px] cursor-pointer">
                {L("View My Jobs", "मेरे काम देखें", "माझी कामे पहा")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,.45)] flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px]">
            {reportDone ? (
              <div className="text-center py-5 px-0">
                <div className="text-[48px] mb-3">✅</div>
                <div className="font-bold text-[16px]">{L("Report submitted!", "रिपोर्ट दर्ज हुई!", "तक्रार नोंदवली!")}</div>
                <div className="text-[13px] text-gray-500 mt-1.5">{L("We will review this job.", "हम इसकी जांच करेंगे।", "आम्ही तपासणी करू.")}</div>
              </div>
            ) : (
              <>
                <h3 className="mt-0 mx-0 mb-1.5 text-[17px] font-bold">🚩 {L("Report Job", "नौकरी की शिकायत", "नोकरी रिपोर्ट")}</h3>
                <p className="text-[13px] text-gray-500 mt-0 mx-0 mb-4">{L("Select the reason:", "समस्या का कारण चुनें:", "समस्येचे कारण निवडा:")}</p>

                {reasons.map((r, i) => (
                  <button key={i} onClick={() => setReportForm({ ...reportForm, reason: r })}
                    className={`w-full py-2.5 px-3.5 rounded-[10px] text-[14px] cursor-pointer text-left mb-2 border-[1.5px] ${reportForm.reason === r ? "bg-red-100 border-danger text-danger font-semibold" : "bg-gray-50 border-gray-200 text-gray-700 font-normal"}`}>
                    {reportForm.reason === r ? "● " : "○ "}{r}
                  </button>
                ))}

                <input
                  placeholder={L("Your phone number (optional)", "आपका फ़ोन नंबर (वैकल्पिक)", "तुमचा फोन नंबर (पर्यायी)")}
                  value={reportForm.phone}
                  onChange={(e) => setReportForm({ ...reportForm, phone: e.target.value })}
                  className="w-full py-[11px] px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] mb-3.5 box-border"
                />

                <div className="flex gap-2.5">
                  <button onClick={() => setShowReport(false)} className="flex-1 py-[11px] px-0 bg-gray-100 rounded-[10px] font-semibold cursor-pointer">{t.cancel}</button>
                  <button onClick={handleReport} disabled={reporting || !reportForm.reason}
                    className={`flex-[2] py-[11px] px-0 text-white rounded-[10px] font-bold ${reportForm.reason ? "bg-danger cursor-pointer" : "bg-gray-400 cursor-not-allowed"}`}>
                    {reporting ? "..." : L("Submit Report", "शिकायत करें", "तक्रार करा")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}