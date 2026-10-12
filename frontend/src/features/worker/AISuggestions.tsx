"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getAiSuggestions, getCareerTips } from "@/services/ai";
import type { AiSuggestion, Language } from "@/types";

interface SkillChip {
  label: string;
  value: string;
  en: string;
  hi: string;
  mr: string;
}


const SKILL_CHIPS: SkillChip[] = [
  { label: "⚡", value: "Electrician", en: "Electrician", hi: "इलेक्ट्रीशियन", mr: "इलेक्ट्रिशियन" },
  { label: "🔧", value: "Plumber",     en: "Plumber",     hi: "प्लम्बर",         mr: "प्लंबर" },
  { label: "🍳", value: "Cook",        en: "Cook",        hi: "रसोइया",          mr: "स्वयंपाकी" },
  { label: "🚗", value: "Driver",      en: "Driver",      hi: "ड्राइवर",         mr: "चालक" },
  { label: "🪚", value: "Carpenter",   en: "Carpenter",   hi: "बढ़ई",            mr: "सुतार" },
  { label: "🎨", value: "Painter",     en: "Painter",     hi: "पेंटर",           mr: "रंगारी" },
  { label: "🧹", value: "Cleaner",     en: "Cleaner",     hi: "सफाईकर्मी",       mr: "सफाई कामगार" },
  { label: "🛡️", value: "Security Guard", en: "Security", hi: "गार्ड",         mr: "सुरक्षारक्षक" },
  { label: "🌿", value: "Gardener",    en: "Gardener",    hi: "माली",            mr: "माळी" },
  { label: "📦", value: "Delivery Boy",en: "Delivery",    hi: "डिलीवरी",         mr: "डिलिव्हरी" },
  { label: "⚙️", value: "Mechanic",   en: "Mechanic",    hi: "मैकेनिक",         mr: "मेकॅनिक" },
  { label: "🏗️", value: "Mason",      en: "Mason",       hi: "राजमिस्त्री",     mr: "गवंडी" },
];

const labelData = {
  en: {
    title: "🤖 AI Job Suggestions",
    subtitle: "Tell us your skill and city — our smart engine instantly matches you with the best available jobs.",
    selectSkill: "Select your skill",
    yourSkill: "Your Skill",
    yourCity: "Your City / Area",
    cityPlaceholder: "e.g. Nashik, Mumbai, Pune…",
    skillPlaceholder: "e.g. Electrician, Cook, Driver…",
    getJobs: "Get My Job Suggestions",
    finding: "Finding best matches…",
    careerTips: "Career Tips for You",
    applicationTip: "Application tip",
    viewApply: "View Job & Apply →",
    browseAll: "Browse all available jobs →",
    noJobs: "No matching jobs right now",
    noJobsDesc: "New jobs are added daily — check back soon!",
    matchLabel: "Match",
    free: "100% Free",
    instant: "Instant Results",
    location: "Location-Based",
    errorSkill: "Please select or enter your skill.",
    errorCity: "Please enter your location.",
    errorServer: "Could not reach the server. Is the backend running?",
    found: "best matches for",
    in: "in",
  },
  hi: {
    title: "🤖 AI नौकरी सुझाव",
    subtitle: "अपना कौशल और शहर बताएं — हमारा स्मार्ट इंजन आपके लिए सबसे अच्छी नौकरियां खोजेगा।",
    selectSkill: "अपना कौशल चुनें",
    yourSkill: "आपका कौशल",
    yourCity: "आपका शहर / क्षेत्र",
    cityPlaceholder: "जैसे: नासिक, मुंबई, पुणे…",
    skillPlaceholder: "जैसे: इलेक्ट्रीशियन, रसोइया, ड्राइवर…",
    getJobs: "मेरे लिए नौकरियां खोजें",
    finding: "सबसे अच्छे मिलान खोज रहे हैं…",
    careerTips: "आपके लिए करियर टिप्स",
    applicationTip: "आवेदन टिप",
    viewApply: "नौकरी देखें और आवेदन करें →",
    browseAll: "सभी उपलब्ध नौकरियां देखें →",
    noJobs: "अभी कोई मिलती नौकरी नहीं",
    noJobsDesc: "नई नौकरियां रोज़ जोड़ी जाती हैं — जल्द वापस आएं!",
    matchLabel: "मिलान",
    free: "100% मुफ्त",
    instant: "तुरंत परिणाम",
    location: "स्थान आधारित",
    errorSkill: "कृपया अपना कौशल चुनें।",
    errorCity: "कृपया अपना स्थान दर्ज करें।",
    errorServer: "सर्वर से कनेक्ट नहीं हो सका।",
    found: "सबसे अच्छे मिलान",
    in: "में",
  },
  mr: {
    title: "🤖 AI नोकरी सूचना",
    subtitle: "तुमचे कौशल्य आणि शहर सांगा — आमचे स्मार्ट इंजिन तुमच्यासाठी सर्वोत्तम नोकऱ्या शोधेल.",
    selectSkill: "तुमचे कौशल्य निवडा",
    yourSkill: "तुमचे कौशल्य",
    yourCity: "तुमचे शहर / क्षेत्र",
    cityPlaceholder: "उदा: नाशिक, मुंबई, पुणे…",
    skillPlaceholder: "उदा: इलेक्ट्रिशियन, स्वयंपाकी, चालक…",
    getJobs: "माझ्यासाठी नोकऱ्या शोधा",
    finding: "सर्वोत्तम जुळणी शोधत आहे…",
    careerTips: "तुमच्यासाठी करिअर टिप्स",
    applicationTip: "अर्ज टिप",
    viewApply: "नोकरी पहा आणि अर्ज करा →",
    browseAll: "सर्व उपलब्ध नोकऱ्या पहा →",
    noJobs: "सध्या कोणतीही जुळणारी नोकरी नाही",
    noJobsDesc: "नवीन नोकऱ्या रोज जोडल्या जातात — लवकरच परत या!",
    matchLabel: "जुळणी",
    free: "100% मोफत",
    instant: "तात्काळ निकाल",
    location: "स्थान आधारित",
    errorSkill: "कृपया तुमचे कौशल्य निवडा.",
    errorCity: "कृपया तुमचे ठिकाण टाका.",
    errorServer: "सर्व्हरशी कनेक्ट होता आले नाही.",
    found: "सर्वोत्तम जुळणी",
    in: "मध्ये",
  },
};

type AiLabels = typeof labelData.en;
// Annotating as Record<Language, AiLabels> makes TypeScript fail the build if hi/mr ever miss a key.
const T: Record<Language, AiLabels> = labelData;

function MatchBar({ score, label }: { score?: number; label: Language }) {
  if (!score) return null;
  // Bar widths are looked up (not built from the score) so Tailwind can see every class.
  const WIDTHS: Record<number, string> = { 1: "w-[10%]", 2: "w-[20%]", 3: "w-[30%]", 4: "w-[40%]", 5: "w-[50%]", 6: "w-[60%]", 7: "w-[70%]", 8: "w-[80%]", 9: "w-[90%]", 10: "w-full" };
  const width = WIDTHS[Math.min(10, Math.max(1, Math.round(score)))];
  const textColor = score >= 8 ? "text-emerald-500" : score >= 5 ? "text-amber-500" : "text-danger";
  const barColor  = score >= 8 ? "bg-emerald-500"   : score >= 5 ? "bg-amber-500"   : "bg-danger";
  const text  = score >= 8 ? (label === "hi" ? "उत्कृष्ट" : label === "mr" ? "उत्कृष्ट" : "Excellent")
              : score >= 6 ? (label === "hi" ? "अच्छा" : label === "mr" ? "चांगले" : "Good")
              : score >= 4 ? (label === "hi" ? "ठीक है" : label === "mr" ? "ठीक आहे" : "Fair")
              : (label === "hi" ? "कम" : label === "mr" ? "कमी" : "Low");
  return (
    <div className="mt-2.5">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.5px]">{T[label]?.matchLabel || "Match"}</span>
        <span className={`text-[12px] font-extrabold ${textColor}`}>{score}/10 — {text}</span>
      </div>
      <div className="bg-gray-100 rounded-full h-[7px] overflow-hidden">
        <div className={`h-full rounded-full transition-[width] duration-[1200ms] ${width} ${barColor}`} />
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  s: AiSuggestion;
  index: number;
  t: AiLabels;
  language: Language;
}

function SuggestionCard({ s, index, t, language }: SuggestionCardProps) {
  const [showTip, setShowTip] = useState(false);
  const medals = ["🥇", "🥈", "🥉"];
  const score = s.matchScore || 0;
  // same colours as before at 25% opacity (the old inline style appended "40" hex alpha)
  const borderColor = score >= 8 ? "border-emerald-500/25" : score >= 5 ? "border-amber-500/25" : "border-gray-200/25";

  return (
    <div className={`bg-white rounded-[18px] overflow-hidden mb-3.5 shadow-[0_3px_16px_rgba(0,0,0,.08)] border ${borderColor}`}>
      {s.isUrgent && (
        <div className="bg-danger text-white py-[5px] px-4 text-[12px] font-bold">
          🚨 {language === "hi" ? "तत्काल — नियोक्ता को आज किसी की जरूरत है" : language === "mr" ? "तातडीचे — नियोक्त्याला आज कोणी हवे आहे" : "URGENT — Employer needs someone immediately"}
        </div>
      )}
      <div className="py-4 px-[18px]">
        <div className="flex gap-3 items-start">
          <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center text-[20px] shrink-0 ${index < 3 ? "bg-amber-50" : "bg-gray-100"}`}>
            {index < 3 ? medals[index] : `#${index + 1}`}
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-[16px] text-[#111111]">{s.title}</div>
            <div className="flex flex-wrap gap-2 mt-[5px]">
              <span className="text-[13px] text-gray-500">📍 {s.location}</span>
              {s.salary && s.salary !== "Negotiable" && (
                <span className="text-[13px] font-bold text-danger">{s.salary}</span>
              )}
              {s.paymentMethod && (
                <span className="text-[12px] bg-gray-100 text-gray-700 rounded-[20px] py-0.5 px-2">
                  {s.paymentMethod === "Cash" ? "💵" : s.paymentMethod === "UPI" ? "📱" : "🤝"} {s.paymentMethod}
                </span>
              )}
            </div>
            <MatchBar score={s.matchScore} label={language} />
          </div>
        </div>

        <div className="mt-3.5 bg-sky-50 rounded-xl py-3 px-3.5 flex gap-2.5">
          <span className="text-[20px] shrink-0">🤖</span>
          <p className="m-0 text-[13px] text-sky-900 leading-[1.65]">{s.reason}</p>
        </div>
      </div>

      {s.tip && (
        <>
          <button onClick={() => setShowTip(v => !v)}
            className="w-full py-2.5 px-[18px] bg-transparent border-t border-t-gray-100 cursor-pointer text-[13px] text-brand font-semibold text-left flex justify-between">
            <span>💡 {t.applicationTip}</span>
            <span className="text-[10px]">{showTip ? "▲" : "▼"}</span>
          </button>
          {showTip && (
            <div className="py-3 px-[18px] bg-green-50 border-t border-t-green-100 text-[13px] text-emerald-800 leading-[1.65]">
              {s.tip}
            </div>
          )}
        </>
      )}

      {s.jobId && (
        <div className="py-3 px-[18px] border-t border-t-gray-100">
          <a href={`/jobs/${s.jobId}`}
            className="block text-center bg-brand text-white rounded-xl py-3 px-0 no-underline font-bold text-[15px]">
            {t.viewApply}
          </a>
        </div>
      )}
    </div>
  );
}

export default function AISuggestions() {
  const { language }              = useLanguage();
  const t                         = T[language] || T.en;
  const [skills, setSkills]       = useState("");
  const [location, setLocation]   = useState("");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [summary, setSummary]     = useState("");
  const [tips, setTips]           = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [searched, setSearched]   = useState(false);

  const getChipLabel = (chip: SkillChip): string =>
    language === "hi" ? chip.hi : language === "mr" ? chip.mr : chip.en;

  const search = async () => {
    if (!skills.trim()) { setError(t.errorSkill); return; }
    if (!location.trim()) { setError(t.errorCity); return; }
    setError(""); setLoading(true); setSearched(false);

    try {
      const [sugRes, tipRes] = await Promise.allSettled([
        getAiSuggestions(skills.trim(), location.trim()),
        getCareerTips(skills.trim()),
      ]);

      if (sugRes.status === "fulfilled") {
        setSuggestions(sugRes.value.suggestions || []);
        setSummary(sugRes.value.summary || "");
        setSearched(true);
      } else {
        setError(t.errorServer);
      }
      if (tipRes.status === "fulfilled" && tipRes.value.tips) {
        setTips(tipRes.value.tips);
      }
    } catch { setError(t.errorServer); }
    setLoading(false);
  };

  return (
    <div className="max-w-[640px] my-0 mx-auto pt-7 px-4 pb-12 font-plain">

      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#006491,#004f73)] rounded-[20px] py-[26px] px-6 mb-5 text-white relative overflow-hidden">
        <div className="absolute -right-2.5 -top-2.5 text-[90px] opacity-[0.07]">🤖</div>
        <div className="text-[24px] font-extrabold mb-1.5">{t.title}</div>
        <div className="text-[14px] opacity-[0.85] leading-[1.6]">{t.subtitle}</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          {[t.free, t.instant, t.location].map(tag => (
            <span key={tag} className="bg-[rgba(255,255,255,.15)] rounded-[20px] py-[3px] px-2.5 text-[12px] font-semibold">✅ {tag}</span>
          ))}
        </div>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,.08)] mb-5">

        {/* Skill chips */}
        <div className="mb-4">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-2.5">
            {t.selectSkill}
          </div>
          <div className="flex flex-wrap gap-[7px]">
            {SKILL_CHIPS.map(c => {
              const active = skills === c.value;
              return (
                <button key={c.value} onClick={() => { setSkills(c.value); setError(""); }}
                  className={`py-2 px-3 rounded-[20px] text-[13px] font-semibold cursor-pointer flex items-center gap-[5px] border-[1.5px] ${active ? "bg-brand text-white border-brand" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                  <span>{c.label}</span>
                  <span>{getChipLabel(c)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill input */}
        <div className="mb-3">
          <label className="text-[12px] font-bold text-gray-700 block mb-1.5 uppercase tracking-[0.5px]">{t.yourSkill}</label>
          <input value={skills} onChange={e => { setSkills(e.target.value); setError(""); }}
            placeholder={t.skillPlaceholder}
            className="w-full py-3 px-3.5 border-2 border-gray-200 rounded-xl text-[15px] outline-none box-border" />
        </div>

        {/* City input */}
        <div className="mb-4">
          <label className="text-[12px] font-bold text-gray-700 block mb-1.5 uppercase tracking-[0.5px]">{t.yourCity}</label>
          <input value={location} onChange={e => { setLocation(e.target.value); setError(""); }}
            placeholder={t.cityPlaceholder}
            className="w-full py-3 px-3.5 border-2 border-gray-200 rounded-xl text-[15px] outline-none box-border" />
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 rounded-[10px] py-2.5 px-3.5 text-[13px] mb-3.5">⚠️ {error}</div>
        )}

        <button onClick={search} disabled={loading}
          className={`w-full py-3.5 px-0 text-white rounded-xl text-[16px] font-bold flex items-center justify-center gap-2 ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-[linear-gradient(135deg,#E8002A,#c0001f)] cursor-pointer"}`}>
          {loading ? <><span>⏳</span> {t.finding}</> : <><span>🤖</span> {t.getJobs}</>}
        </button>
      </div>

      {/* Results */}
      {!loading && searched && (
        <>
          {summary && (
            <div className="bg-sky-50 border border-sky-200 rounded-[14px] py-3.5 px-[18px] mb-4 flex gap-2.5">
              <span className="text-[22px] shrink-0">📊</span>
              <p className="m-0 text-[14px] text-sky-900 leading-[1.6] font-medium">{summary}</p>
            </div>
          )}

          {/* Career tips */}
          {tips.length > 0 && (
            <div className="bg-white rounded-[18px] p-5 shadow-[0_3px_16px_rgba(0,0,0,.08)] mb-5">
              <div className="font-bold text-[15px] mb-3.5 flex items-center gap-2">
                <span className="text-[22px]">💡</span> {t.careerTips}
              </div>
              {tips.map((tip, i) => (
                <div key={i} className={`flex gap-2.5 ${i < tips.length - 1 ? "mb-3" : "mb-0"}`}>
                  <div className="w-[26px] h-[26px] rounded-full bg-brand-light text-brand flex items-center justify-center text-[12px] font-bold shrink-0">{i + 1}</div>
                  <p className="m-0 text-[13px] text-gray-700 leading-[1.65]">{tip}</p>
                </div>
              ))}
            </div>
          )}

          {suggestions.length === 0 ? (
            <div className="bg-white rounded-[18px] p-8 text-center shadow-[0_3px_16px_rgba(0,0,0,.08)]">
              <div className="text-[52px] mb-3">🔍</div>
              <div className="font-bold text-[18px] mb-2">{t.noJobs}</div>
              <div className="text-gray-500 text-[14px] mb-5">{t.noJobsDesc}</div>
              <a href="/jobs" className="bg-brand text-white py-3 px-7 rounded-xl no-underline font-bold">{t.browseAll}</a>
            </div>
          ) : (
            <>
              <div className="text-[13px] text-gray-500 font-semibold mb-3">
                {suggestions.length} {t.found} <b>{skills}</b> {t.in} <b>{location}</b>
              </div>
              {suggestions.map((s, i) => <SuggestionCard key={i} s={s} index={i} t={t} language={language} />)}
              <div className="text-center mt-2">
                <a href="/jobs" className="text-brand font-semibold text-[14px] no-underline">{t.browseAll}</a>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}