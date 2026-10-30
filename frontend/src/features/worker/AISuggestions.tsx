"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  FaBolt,
  FaBoxOpen,
  FaBroom,
  FaBuilding,
  FaCar,
  FaCogs,
  FaHammer,
  FaHome,
  FaLeaf,
  FaPaintRoller,
  FaRobot,
  FaShieldAlt,
  FaUtensils,
  FaWrench,
} from "react-icons/fa";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiHelpCircle,
  FiInfo,
  FiLoader,
  FiMapPin,
  FiMic,
  FiNavigation,
  FiTrendingUp,
  FiVolume2,
  FiZap,
} from "react-icons/fi";
import WorkerShell from "@/components/layout/WorkerShell";
import { matchSkill } from "@/components/ui/VoiceSearch";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { getAiSuggestions, getCareerTips } from "@/services/ai";
import { getJobs } from "@/services/jobs";
import type { AiSuggestion, Language } from "@/types";

interface SkillChip {
  icon: ReactNode;
  value: string;
  en: string;
  hi: string;
  mr: string;
}

// `value` is what the backend matches on — keep these strings as they are.
const SKILL_CHIPS: SkillChip[] = [
  { icon: <FaCar />, value: "Driver", en: "Driver", hi: "ड्राइवर", mr: "चालक" },
  {
    icon: <FaBolt />,
    value: "Electrician",
    en: "Electrician",
    hi: "इलेक्ट्रीशियन",
    mr: "इलेक्ट्रिशियन",
  },
  {
    icon: <FaWrench />,
    value: "Plumber",
    en: "Plumber",
    hi: "प्लम्बर",
    mr: "प्लंबर",
  },
  {
    icon: <FaUtensils />,
    value: "Cook",
    en: "Cook",
    hi: "रसोइया",
    mr: "स्वयंपाकी",
  },
  {
    icon: <FaHammer />,
    value: "Carpenter",
    en: "Carpenter",
    hi: "बढ़ई",
    mr: "सुतार",
  },
  {
    icon: <FaPaintRoller />,
    value: "Painter",
    en: "Painter",
    hi: "पेंटर",
    mr: "रंगारी",
  },
  {
    icon: <FaBroom />,
    value: "Cleaner",
    en: "Cleaner",
    hi: "सफाईकर्मी",
    mr: "सफाई कामगार",
  },
  {
    icon: <FaShieldAlt />,
    value: "Security Guard",
    en: "Security Guard",
    hi: "गार्ड",
    mr: "सुरक्षारक्षक",
  },
  {
    icon: <FaBoxOpen />,
    value: "Delivery Boy",
    en: "Delivery Partner",
    hi: "डिलीवरी",
    mr: "डिलिव्हरी",
  },
  {
    icon: <FaCogs />,
    value: "Mechanic",
    en: "Mechanic",
    hi: "मैकेनिक",
    mr: "मेकॅनिक",
  },
  {
    icon: <FaBuilding />,
    value: "Mason",
    en: "Mason",
    hi: "राजमिस्त्री",
    mr: "गवंडी",
  },
  {
    icon: <FaHome />,
    value: "House Maid",
    en: "House Help",
    hi: "घरेलू काम",
    mr: "घरकाम",
  },
  {
    icon: <FaLeaf />,
    value: "Gardener",
    en: "Gardener",
    hi: "माली",
    mr: "माळी",
  },
];

// Expected minimum pay. `daily` is the per-day equivalent used to compare against a job's pay.
const WAGES = [
  {
    id: "600",
    daily: 600,
    label: { en: "₹600 / day", hi: "₹600 / दिन", mr: "₹600 / दिवस" },
  },
  {
    id: "800",
    daily: 800,
    popular: true,
    label: { en: "₹800 / day", hi: "₹800 / दिन", mr: "₹800 / दिवस" },
  },
  {
    id: "1000",
    daily: 1000,
    label: { en: "₹1,000+ / day", hi: "₹1,000+ / दिन", mr: "₹1,000+ / दिवस" },
  },
  {
    id: "18000",
    daily: Math.round(18000 / 26),
    label: {
      en: "₹18,000+ / month",
      hi: "₹18,000+ / माह",
      mr: "₹18,000+ / महिना",
    },
  },
] as const;

const labelData = {
  en: {
    title: "AI Job Suggestions",
    badge: "Smart Blue-Collar Matching Engine",
    subtitle:
      "Tell us your skill and preferred city area — our smart engine instantly matches you with top-paying, fair wage jobs today.",
    activeJobs: "Active Daily Jobs",
    voiceGuide: "VOICE GUIDE (AUDIO ASSISTANCE)",
    voiceGuideText:
      "Press the yellow button to speak your preferred job or listen to matches!",
    listen: "Listen / Voice Search",
    listening: "Listening…",
    quickPrompt: "Quick Voice Prompt:",
    promptText: "Find cook jobs near Nashik above ₹800",
    tryPrompt: "Try Prompt",
    selectSkill: "Select your trade / skill",
    selectHint: "Select primary craft",
    yourSkill: "Your primary skill",
    yourCity: "Your city or area",
    gps: "Use GPS Auto-Detect",
    gpsFail: "Could not detect your location. Please type it.",
    within: "Within 5 km",
    cityPlaceholder: "e.g. Nashik, Mumbai, Pune…",
    skillPlaceholder: "e.g. Electrician, Cook, Driver…",
    wage: "Expected minimum daily / monthly rate",
    popular: "Popular",
    getJobs: "Get My Job Suggestions",
    finding: "Finding best matches…",
    careerTips: "Career Tips for You",
    applicationTip: "Application tip",
    whyMatch: "Why this match",
    applyNow: "Apply Now",
    browseAll: "View all available jobs",
    noJobs: "No matching jobs right now",
    noJobsDesc: "New jobs are added daily — check back soon!",
    topMatches: "Top Instant AI Matches for",
    matchRate: "Match Rate",
    sortedBy: "Sorted by: Best Match",
    match: "MATCH",
    urgent: "URGENT",
    urgentNote: "Employer needs someone immediately",
    pay: "Offered pay",
    meetsRate: "Meets your rate",
    belowRate: "Below your rate",
    free: "100% Free for Workers",
    instant: "Instant Results",
    location: "Location-Based",
    help: "Need Help?",
    assistant: "Ask HireMate Assistant",
    heard: "Heard:",
    errorSkill: "Please select or enter your skill.",
    errorCity: "Please enter your location.",
    errorServer: "Could not reach the server. Is the backend running?",
    errorVoice: "Voice is not supported in this browser.",
    found: "best matches for",
    in: "in",
    worker: "Worker",
  },
  hi: {
    title: "AI नौकरी सुझाव",
    badge: "स्मार्ट ब्लू-कॉलर मैचिंग इंजन",
    subtitle:
      "अपना कौशल और पसंदीदा क्षेत्र बताएं — हमारा स्मार्ट इंजन आज ही आपको अच्छी कमाई वाली, उचित मजदूरी की नौकरियां खोजेगा।",
    activeJobs: "सक्रिय दैनिक नौकरियां",
    voiceGuide: "वॉइस गाइड (ऑडियो सहायता)",
    voiceGuideText: "पीला बटन दबाकर अपना पसंदीदा काम बोलें या मैच सुनें!",
    listen: "सुनें / वॉइस सर्च",
    listening: "सुन रहा है…",
    quickPrompt: "त्वरित वॉइस प्रॉम्प्ट:",
    promptText: "नासिक के पास ₹800 से ऊपर कुक की नौकरी खोजें",
    tryPrompt: "आज़माएं",
    selectSkill: "अपना कौशल चुनें",
    selectHint: "मुख्य काम चुनें",
    yourSkill: "आपका मुख्य कौशल",
    yourCity: "आपका शहर या क्षेत्र",
    gps: "GPS से स्थान पता करें",
    gpsFail: "स्थान पता नहीं चला। कृपया खुद लिखें।",
    within: "5 किमी के भीतर",
    cityPlaceholder: "जैसे: नासिक, मुंबई, पुणे…",
    skillPlaceholder: "जैसे: इलेक्ट्रीशियन, रसोइया, ड्राइवर…",
    wage: "अपेक्षित न्यूनतम दैनिक / मासिक दर",
    popular: "लोकप्रिय",
    getJobs: "मेरे लिए नौकरियां खोजें",
    finding: "सबसे अच्छे मिलान खोज रहे हैं…",
    careerTips: "आपके लिए करियर टिप्स",
    applicationTip: "आवेदन टिप",
    whyMatch: "यह मिलान क्यों",
    applyNow: "अभी आवेदन करें",
    browseAll: "सभी उपलब्ध नौकरियां देखें",
    noJobs: "अभी कोई मिलती नौकरी नहीं",
    noJobsDesc: "नई नौकरियां रोज़ जोड़ी जाती हैं — जल्द वापस आएं!",
    topMatches: "के लिए शीर्ष AI मिलान,",
    matchRate: "मिलान दर",
    sortedBy: "क्रम: सर्वश्रेष्ठ मिलान",
    match: "मिलान",
    urgent: "तत्काल",
    urgentNote: "नियोक्ता को अभी किसी की जरूरत है",
    pay: "प्रस्तावित वेतन",
    meetsRate: "आपकी दर पूरी",
    belowRate: "आपकी दर से कम",
    free: "कामगारों के लिए 100% मुफ्त",
    instant: "तुरंत परिणाम",
    location: "स्थान आधारित",
    help: "मदद चाहिए?",
    assistant: "HireMate सहायक से पूछें",
    heard: "सुना:",
    errorSkill: "कृपया अपना कौशल चुनें।",
    errorCity: "कृपया अपना स्थान दर्ज करें।",
    errorServer: "सर्वर से कनेक्ट नहीं हो सका।",
    errorVoice: "इस ब्राउज़र में वॉइस सपोर्ट नहीं है।",
    found: "सबसे अच्छे मिलान",
    in: "में",
    worker: "कामगार",
  },
  mr: {
    title: "AI नोकरी सूचना",
    badge: "स्मार्ट ब्लू-कॉलर मॅचिंग इंजिन",
    subtitle:
      "तुमचे कौशल्य आणि आवडते क्षेत्र सांगा — आमचे स्मार्ट इंजिन आजच चांगली कमाई आणि योग्य मजुरीच्या नोकऱ्या शोधेल.",
    activeJobs: "सक्रिय दैनिक नोकऱ्या",
    voiceGuide: "व्हॉइस गाइड (ऑडिओ मदत)",
    voiceGuideText: "पिवळे बटण दाबा आणि तुमचे आवडते काम बोला किंवा जुळणी ऐका!",
    listen: "ऐका / व्हॉइस सर्च",
    listening: "ऐकत आहे…",
    quickPrompt: "झटपट व्हॉइस प्रॉम्प्ट:",
    promptText: "नाशिक जवळ ₹800 पेक्षा जास्त स्वयंपाकी नोकरी शोधा",
    tryPrompt: "वापरून पहा",
    selectSkill: "तुमचे कौशल्य निवडा",
    selectHint: "मुख्य काम निवडा",
    yourSkill: "तुमचे मुख्य कौशल्य",
    yourCity: "तुमचे शहर किंवा क्षेत्र",
    gps: "GPS ने ठिकाण शोधा",
    gpsFail: "ठिकाण सापडले नाही. कृपया स्वतः टाका.",
    within: "5 किमी आत",
    cityPlaceholder: "उदा: नाशिक, मुंबई, पुणे…",
    skillPlaceholder: "उदा: इलेक्ट्रिशियन, स्वयंपाकी, चालक…",
    wage: "अपेक्षित किमान दैनिक / मासिक दर",
    popular: "लोकप्रिय",
    getJobs: "माझ्यासाठी नोकऱ्या शोधा",
    finding: "सर्वोत्तम जुळणी शोधत आहे…",
    careerTips: "तुमच्यासाठी करिअर टिप्स",
    applicationTip: "अर्ज टिप",
    whyMatch: "ही जुळणी का",
    applyNow: "आता अर्ज करा",
    browseAll: "सर्व उपलब्ध नोकऱ्या पहा",
    noJobs: "सध्या कोणतीही जुळणारी नोकरी नाही",
    noJobsDesc: "नवीन नोकऱ्या रोज जोडल्या जातात — लवकरच परत या!",
    topMatches: "साठी सर्वोत्तम AI जुळणी,",
    matchRate: "जुळणी दर",
    sortedBy: "क्रम: सर्वोत्तम जुळणी",
    match: "जुळणी",
    urgent: "तातडीचे",
    urgentNote: "नियोक्त्याला आत्ता कोणी हवे आहे",
    pay: "देऊ केलेले वेतन",
    meetsRate: "तुमची दर पूर्ण",
    belowRate: "तुमच्या दरापेक्षा कमी",
    free: "कामगारांसाठी 100% मोफत",
    instant: "तात्काळ निकाल",
    location: "स्थान आधारित",
    help: "मदत हवी?",
    assistant: "HireMate सहाय्यकाला विचारा",
    heard: "ऐकले:",
    errorSkill: "कृपया तुमचे कौशल्य निवडा.",
    errorCity: "कृपया तुमचे ठिकाण टाका.",
    errorServer: "सर्व्हरशी कनेक्ट होता आले नाही.",
    errorVoice: "या ब्राउझरमध्ये व्हॉइस सपोर्ट नाही.",
    found: "सर्वोत्तम जुळणी",
    in: "मध्ये",
    worker: "कामगार",
  },
};

type AiLabels = typeof labelData.en;
// Annotating as Record<Language, AiLabels> makes TypeScript fail the build if hi/mr ever miss a key.
const T: Record<Language, AiLabels> = labelData;

/** Pull a number out of a salary ("₹800/day", 18000, "1,200") and turn it into a per-day figure. */
function dailyEquivalent(salary: AiSuggestion["salary"]): number | null {
  if (salary === undefined || salary === null) return null;
  const n =
    typeof salary === "number"
      ? salary
      : parseInt(String(salary).replace(/[^\d]/g, ""), 10);
  if (!n || Number.isNaN(n)) return null;
  return n >= 5000 ? n / 26 : n; // 5000+ is treated as a monthly figure
}

function formatPay(salary: AiSuggestion["salary"]): string {
  if (typeof salary === "number") return `₹${salary.toLocaleString("en-IN")}`;
  return salary ?? "";
}

// Ribbon colour by rank, like the mock: best match green, then blue, then purple.
const RANK_STYLES = [
  {
    ribbon: "bg-emerald-600",
    border: "border-emerald-300 shadow-[0_6px_20px_rgba(16,185,129,.12)]",
  },
  { ribbon: "bg-blue-600", border: "border-slate-200" },
  { ribbon: "bg-purple-600", border: "border-slate-200" },
];

interface SuggestionCardProps {
  s: AiSuggestion;
  index: number;
  t: AiLabels;
  skill: string;
  minDaily: number;
}

function SuggestionCard({ s, index, t, skill, minDaily }: SuggestionCardProps) {
  const [open, setOpen] = useState(false);
  const rank = RANK_STYLES[Math.min(index, RANK_STYLES.length - 1)];
  const pct = Math.min(100, Math.max(0, Math.round((s.matchScore || 0) * 10)));
  const daily = dailyEquivalent(s.salary);
  const hasPay = !!s.salary && s.salary !== "Negotiable";

  return (
    <div
      className={`relative bg-white rounded-2xl border ${rank.border} overflow-hidden`}
    >
      {/* Match ribbon */}
      <div
        className={`absolute top-0 right-0 ${rank.ribbon} text-white text-[10px] font-extrabold tracking-wide rounded-bl-lg px-3 py-1`}
      >
        {pct}% {t.match}
        {s.isUrgent ? ` • ${t.urgent}` : ""}
      </div>

      <div className="p-4 pt-7 sm:p-5 sm:pt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold rounded-md px-2 py-0.5 bg-blue-50 text-blue-700">
              {skill}
            </span>
            {s.paymentMethod && (
              <span className="font-semibold rounded-md px-2 py-0.5 bg-slate-100 text-slate-600">
                {s.paymentMethod}
              </span>
            )}
            {s.isUrgent && (
              <span className="font-semibold rounded-md px-2 py-0.5 bg-red-50 text-red-600">
                {t.urgentNote}
              </span>
            )}
          </div>
          <h3 className="mt-2 mb-0 text-[17px] font-extrabold text-slate-900 leading-snug">
            {s.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold">
              <FiMapPin className="text-slate-400" /> {s.location}
            </span>
            {daily !== null && (
              <span
                className={`flex items-center gap-1 font-semibold ${daily >= minDaily ? "text-emerald-600" : "text-slate-400"}`}
              >
                {daily >= minDaily ? <FiCheck /> : <FiClock />}{" "}
                {daily >= minDaily ? t.meetsRate : t.belowRate}
              </span>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
          {hasPay && (
            <div className="sm:text-right">
              <div className="text-[11px] text-slate-400">{t.pay}</div>
              <div className="text-[22px] font-extrabold text-slate-900 leading-tight">
                {formatPay(s.salary)}
              </div>
              {s.paymentMethod && (
                <div className="text-[11px] font-semibold text-emerald-600">
                  {s.paymentMethod}
                </div>
              )}
            </div>
          )}
          {s.jobId && (
            <Link
              href={`/jobs/${s.jobId}`}
              className="bg-blue-600 text-white no-underline rounded-lg px-5 py-2 text-[13px] font-bold"
            >
              {t.applyNow}
            </Link>
          )}
        </div>
      </div>

      {(s.reason || s.tip) && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-[12px] font-semibold text-blue-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FaRobot /> {t.whyMatch}
            </span>
            <FiChevronDown
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div className="px-5 pb-4 flex flex-col gap-2.5">
              {s.reason && (
                <p className="m-0 text-[13px] text-slate-700 leading-relaxed bg-sky-50 rounded-xl px-3.5 py-3">
                  {s.reason}
                </p>
              )}
              {s.tip && (
                <p className="m-0 text-[13px] text-emerald-800 leading-relaxed bg-emerald-50 rounded-xl px-3.5 py-3 flex gap-2">
                  <FiInfo className="mt-0.5 shrink-0" />{" "}
                  <span>
                    <b>{t.applicationTip}: </b>
                    {s.tip}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AISuggestions() {
  const { language } = useLanguage();
  const { worker } = useAuth();
  const t = T[language] || T.en;

  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [wageId, setWageId] = useState<string>("800");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [summary, setSummary] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [heard, setHeard] = useState("");
  const [activeJobs, setActiveJobs] = useState<number | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  // The skill the current results were searched for (so editing the field doesn't relabel old cards).
  const [searchedSkill, setSearchedSkill] = useState("");

  const minDaily = WAGES.find((w) => w.id === wageId)?.daily ?? 0;
  const getChipLabel = (chip: SkillChip): string =>
    language === "hi" ? chip.hi : language === "mr" ? chip.mr : chip.en;
  const firstName = worker?.name?.trim().split(/\s+/)[0] || t.worker;

  // Voice: one handler for the banner button, the top-bar mic and the help button.
  const onVoice = useCallback((skill: string | null, transcript: string) => {
    setHeard(transcript);
    if (skill) {
      setSkills(skill);
      setError("");
    }
  }, []);
  const voice = useVoiceInput(onVoice);
  const toggleVoice = () => {
    if (voice.listening) {
      voice.stop();
      return;
    }
    voice.start();
  };

  // Active job count for the hero card (fetched once, silent on failure).
  useEffect(() => {
    let alive = true;
    getJobs()
      .then((j) => {
        if (alive && Array.isArray(j)) setActiveJobs(j.length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const tryPrompt = () => {
    setSkills("Cook");
    setLocation("Nashik");
    setWageId("800");
    setError("");
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError(t.gpsFail);
      return;
    }
    setGpsBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          const d = (await r.json()) as { address?: Record<string, string> };
          const a = d.address || {};
          const area = a.suburb || a.neighbourhood || a.village || "";
          const city = a.city || a.town || a.state_district || "";
          const place = [area, city].filter(Boolean).join(", ");
          if (place) setLocation(place);
          else setError(t.gpsFail);
        } catch {
          setError(t.gpsFail);
        }
        setGpsBusy(false);
      },
      () => {
        setError(t.gpsFail);
        setGpsBusy(false);
      },
      { timeout: 10000 },
    );
  };

  const search = async () => {
    if (!skills.trim()) {
      setError(t.errorSkill);
      return;
    }
    if (!location.trim()) {
      setError(t.errorCity);
      return;
    }
    setError("");
    setLoading(true);
    setSearched(false);

    try {
      const [sugRes, tipRes] = await Promise.allSettled([
        getAiSuggestions(skills.trim(), location.trim()),
        getCareerTips(skills.trim()),
      ]);

      if (sugRes.status === "fulfilled") {
        setSuggestions(sugRes.value.suggestions || []);
        setSummary(sugRes.value.summary || "");
        setSearchedSkill(skills.trim());
        setSearched(true);
      } else {
        setError(t.errorServer);
      }
      if (tipRes.status === "fulfilled" && tipRes.value.tips)
        setTips(tipRes.value.tips);
    } catch {
      setError(t.errorServer);
    }
    setLoading(false);
  };

  const bestPct = suggestions.length
    ? Math.round(Math.max(...suggestions.map((s) => s.matchScore || 0)) * 10)
    : 0;

  const label =
    "block mb-2 text-[11px] font-extrabold tracking-wider text-slate-700 uppercase";
  const input =
    "w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 outline-none focus:border-blue-500 box-border";

  return (
    <>
      <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-6 pb-28 flex flex-col gap-5">
        {/* Voice guide banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 text-[18px] flex items-center justify-center shrink-0">
            <FiVolume2 />
          </span>
          <div className="flex-1 min-w-0">
            <span className="inline-block bg-amber-300 text-amber-950 text-[10px] font-extrabold tracking-wide rounded px-2 py-0.5">
              {t.voiceGuide}
            </span>
            <p className="m-0 mt-1 text-[12px] text-amber-950">
              {heard ? `${t.heard} “${heard}”` : t.voiceGuideText}
            </p>
          </div>
          <button
            onClick={toggleVoice}
            className={`shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-bold cursor-pointer ${voice.listening ? "bg-red-500 text-white" : "bg-amber-400 text-slate-900"}`}
          >
            <FiMic />{" "}
            <span className="hidden sm:inline">
              {voice.listening ? t.listening : t.listen}
            </span>
          </button>
        </div>
        {voice.unsupported && (
          <div className="-mt-3 text-[12px] text-red-600 flex items-center gap-1.5">
            <FiAlertCircle /> {t.errorVoice}
          </div>
        )}

        {/* Hero */}
        <div className="rounded-2xl bg-[linear-gradient(135deg,#0B1530,#13244A)] p-6 sm:p-7 text-white flex flex-col md:flex-row md:items-center gap-5 border border-blue-900/40">
          <div className="flex-1">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-xl bg-blue-600 text-[24px] flex items-center justify-center shrink-0">
                <FaRobot />
              </span>
              <div>
                <h1 className="m-0 text-[26px] font-extrabold leading-tight">
                  {t.title}
                </h1>
                <div className="text-[12px] text-blue-300">{t.badge}</div>
              </div>
            </div>
            <p className="mt-4 mb-0 text-[14px] text-slate-200 leading-relaxed">
              {t.subtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                <FiCheck /> {t.free}
              </span>
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-blue-500/15 text-blue-300 border border-blue-400/20">
                <FiZap /> {t.instant}
              </span>
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-purple-500/15 text-purple-300 border border-purple-400/20">
                <FiMapPin /> {t.location}
              </span>
            </div>
          </div>
          {activeJobs !== null && (
            <div className="md:w-[210px] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-center">
              <div className="text-[34px] font-extrabold text-amber-400 leading-none">
                {activeJobs}
              </div>
              <div className="mt-1.5 text-[12px] text-slate-200">
                {t.activeJobs}
              </div>
            </div>
          )}
        </div>

        {/* Search card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,.04)]">
          {/* Quick prompt */}
          <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 mb-6 text-[12px] text-slate-700">
            <FiMic className="text-blue-600 shrink-0" />
            <span className="flex-1 min-w-0">
              <b>{t.quickPrompt}</b> “{t.promptText}”
            </span>
            <button
              onClick={tryPrompt}
              className="text-blue-600 font-bold cursor-pointer shrink-0"
            >
              {t.tryPrompt}
            </button>
          </div>

          {/* Trade chips */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
              {t.selectSkill}
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400">
              {t.selectHint}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5 mb-6">
            {SKILL_CHIPS.map((c) => {
              const active = skills === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => {
                    setSkills(c.value);
                    setError("");
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold cursor-pointer ${active ? "bg-blue-600 text-white shadow-[0_3px_10px_rgba(37,99,235,.3)]" : "bg-slate-100 text-slate-700"}`}
                >
                  <span className="text-[13px]">{c.icon}</span>{" "}
                  {getChipLabel(c)} {active && <FiCheck />}
                </button>
              );
            })}
          </div>

          {/* Skill + city */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={label}>{t.yourSkill}</label>
              <div className="relative">
                <input
                  value={skills}
                  onChange={(e) => {
                    setSkills(e.target.value);
                    setError("");
                  }}
                  placeholder={t.skillPlaceholder}
                  className={`${input} pr-11`}
                />
                {skills.trim() && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[12px] flex items-center justify-center">
                    <FiCheck />
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={label}>{t.yourCity}</label>
                <button
                  onClick={detectLocation}
                  disabled={gpsBusy}
                  className="mb-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 cursor-pointer"
                >
                  {gpsBusy ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiNavigation />
                  )}{" "}
                  {t.gps}
                </button>
              </div>
              <div className="relative">
                <input
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setError("");
                  }}
                  placeholder={t.cityPlaceholder}
                  className={`${input} pr-24`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                  {t.within}
                </span>
              </div>
            </div>
          </div>

          {/* Wage */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                {t.wage}
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {WAGES.map((w) => {
                const on = wageId === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWageId(w.id)}
                    className={`flex items-center gap-2.5 h-12 rounded-xl border-2 px-3.5 text-[13px] font-semibold cursor-pointer text-left ${on ? "border-blue-600 bg-blue-50 text-slate-900" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? "border-blue-600" : "border-slate-300"}`}
                    >
                      {on && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <span className="flex-1">
                      {w.label[language] ?? w.label.en}
                    </span>
                    {"popular" in w && w.popular && (
                      <span className="text-[10px] font-bold rounded bg-blue-100 text-blue-700 px-1.5 py-0.5">
                        {t.popular}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 text-red-700 px-4 py-2.5 text-[13px] mb-4">
              <FiAlertCircle className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={search}
            disabled={loading}
            className={`w-full h-14 rounded-xl text-white text-[16px] font-extrabold flex items-center justify-center gap-2.5 ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 cursor-pointer shadow-[0_4px_0_#991b1b]"}`}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" /> {t.finding}
              </>
            ) : (
              <>
                <FaRobot /> {t.getJobs} <FiArrowRight />
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {!loading && searched && (
          <>
            {summary && (
              <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                <FiTrendingUp className="text-sky-700 text-[20px] shrink-0 mt-0.5" />
                <p className="m-0 text-[14px] text-sky-900 leading-relaxed font-medium">
                  {summary}
                </p>
              </div>
            )}

            {tips.length > 0 && (
              <div className="rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex items-center gap-2 font-extrabold text-[15px] mb-4 text-slate-900">
                  <FiInfo className="text-amber-500" /> {t.careerTips}
                </div>
                <div className="flex flex-col gap-3">
                  {tips.map((tip, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[12px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <p className="m-0 text-[13px] text-slate-700 leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
                <FiHelpCircle className="mx-auto text-[40px] text-slate-300 mb-3" />
                <div className="font-extrabold text-[18px] mb-1.5 text-slate-900">
                  {t.noJobs}
                </div>
                <div className="text-slate-500 text-[14px] mb-5">
                  {t.noJobsDesc}
                </div>
                <Link
                  href="/jobs"
                  className="inline-block bg-blue-600 text-white no-underline rounded-lg px-6 py-2.5 text-[14px] font-bold"
                >
                  {t.browseAll}
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                  <h2 className="m-0 flex flex-wrap items-center gap-2.5 text-[16px] font-extrabold text-slate-900">
                    <FaRobot className="text-blue-600" />
                    {language === "en"
                      ? `${t.topMatches} ${firstName}`
                      : `${firstName} ${t.topMatches}`}
                    <span className="text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 px-2.5 py-0.5">
                      {bestPct}% {t.matchRate}
                    </span>
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    {t.sortedBy}
                  </span>
                </div>
                <div className="text-[12px] text-slate-500 -mt-2.5">
                  {suggestions.length} {t.found} <b>{searchedSkill}</b> {t.in}{" "}
                  <b>{location}</b>
                </div>
                <div className="flex flex-col gap-4">
                  {suggestions.map((s, i) => (
                    <SuggestionCard
                      key={s.jobId ?? i}
                      s={s}
                      index={i}
                      t={t}
                      skill={searchedSkill}
                      minDaily={minDaily}
                    />
                  ))}
                </div>
                <div className="text-center mt-1">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-6 py-2.5 text-[13px] font-bold text-slate-800 no-underline shadow-sm"
                  >
                    {t.browseAll} <FiChevronRight />
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Floating assistant */}
      <button
        onClick={toggleVoice}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#2563EB,#1D4ED8)] text-white pl-3 pr-5 py-2.5 shadow-[0_8px_24px_rgba(37,99,235,.4)] cursor-pointer"
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[16px]">
          <FiHelpCircle />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[10px] text-blue-100">{t.help}</span>
          <span className="block text-[12px] font-bold">{t.assistant}</span>
        </span>
      </button>
    </>
  );
}
