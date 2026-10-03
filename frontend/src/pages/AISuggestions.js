import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SKILL_CHIPS = [
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

const T = {
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

function MatchBar({ score, label }) {
  if (!score) return null;
  const pct   = score * 10;
  const color = score >= 8 ? "#10b981" : score >= 5 ? "#f59e0b" : "#E8002A";
  const text  = score >= 8 ? (label === "hi" ? "उत्कृष्ट" : label === "mr" ? "उत्कृष्ट" : "Excellent")
              : score >= 6 ? (label === "hi" ? "अच्छा" : label === "mr" ? "चांगले" : "Good")
              : score >= 4 ? (label === "hi" ? "ठीक है" : label === "mr" ? "ठीक आहे" : "Fair")
              : (label === "hi" ? "कम" : label === "mr" ? "कमी" : "Low");
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>{T[label]?.matchLabel || "Match"}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{score}/10 — {text}</span>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: 99, height: 7, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1.2s ease" }} />
      </div>
    </div>
  );
}

function SuggestionCard({ s, index, t, language }) {
  const [showTip, setShowTip] = useState(false);
  const medals = ["🥇", "🥈", "🥉"];
  const score = s.matchScore || 0;
  const borderColor = score >= 8 ? "#10b981" : score >= 5 ? "#f59e0b" : "#e5e7eb";

  return (
    <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 14, boxShadow: "0 3px 16px rgba(0,0,0,.08)", border: `1px solid ${borderColor}40` }}>
      {s.isUrgent && (
        <div style={{ background: "#E8002A", color: "#fff", padding: "5px 16px", fontSize: 12, fontWeight: 700 }}>
          🚨 {language === "hi" ? "तत्काल — नियोक्ता को आज किसी की जरूरत है" : language === "mr" ? "तातडीचे — नियोक्त्याला आज कोणी हवे आहे" : "URGENT — Employer needs someone immediately"}
        </div>
      )}
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: index < 3 ? "#fffbeb" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            {index < 3 ? medals[index] : `#${index + 1}`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>{s.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 5 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>📍 {s.location}</span>
              {s.salary && s.salary !== "Negotiable" && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E8002A" }}>{s.salary}</span>
              )}
              {s.paymentMethod && (
                <span style={{ fontSize: 12, background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "2px 8px" }}>
                  {s.paymentMethod === "Cash" ? "💵" : s.paymentMethod === "UPI" ? "📱" : "🤝"} {s.paymentMethod}
                </span>
              )}
            </div>
            <MatchBar score={s.matchScore} label={language} />
          </div>
        </div>

        <div style={{ marginTop: 14, background: "#f0f9ff", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🤖</span>
          <p style={{ margin: 0, fontSize: 13, color: "#0c4a6e", lineHeight: 1.65 }}>{s.reason}</p>
        </div>
      </div>

      {s.tip && (
        <>
          <button onClick={() => setShowTip(v => !v)}
            style={{ width: "100%", padding: "10px 18px", background: "none", border: "none", borderTop: "1px solid #f3f4f6", cursor: "pointer", fontSize: 13, color: "#006491", fontWeight: 600, textAlign: "left", display: "flex", justifyContent: "space-between" }}>
            <span>💡 {t.applicationTip}</span>
            <span style={{ fontSize: 10 }}>{showTip ? "▲" : "▼"}</span>
          </button>
          {showTip && (
            <div style={{ padding: "12px 18px", background: "#f0fdf4", borderTop: "1px solid #dcfce7", fontSize: 13, color: "#065f46", lineHeight: 1.65 }}>
              {s.tip}
            </div>
          )}
        </>
      )}

      {s.jobId && (
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f3f4f6" }}>
          <a href={`/jobs/${s.jobId}`}
            style={{ display: "block", textAlign: "center", background: "#006491", color: "#fff", borderRadius: 12, padding: "12px 0", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
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
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary]     = useState("");
  const [tips, setTips]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [searched, setSearched]   = useState(false);

  const getChipLabel = (chip) =>
    language === "hi" ? chip.hi : language === "mr" ? chip.mr : chip.en;

  const search = async () => {
    if (!skills.trim()) { setError(t.errorSkill); return; }
    if (!location.trim()) { setError(t.errorCity); return; }
    setError(""); setLoading(true); setSearched(false);

    try {
      const [sugRes, tipRes] = await Promise.allSettled([
        fetch(`${BASE}/api/ai/suggestions`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: skills.trim(), location: location.trim() }),
        }).then(r => r.json()),
        fetch(`${BASE}/api/ai/career-tips`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill: skills.trim() }),
        }).then(r => r.json()),
      ]);

      if (sugRes.status === "fulfilled" && !sugRes.value.error) {
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
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 48px", fontFamily: "sans-serif" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", borderRadius: 20, padding: "26px 24px", marginBottom: 20, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 90, opacity: .07 }}>🤖</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{t.title}</div>
        <div style={{ fontSize: 14, opacity: .85, lineHeight: 1.6 }}>{t.subtitle}</div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[t.free, t.instant, t.location].map(tag => (
            <span key={tag} style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>✅ {tag}</span>
          ))}
        </div>
      </div>

      {/* Search card */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "20px", boxShadow: "0 4px 24px rgba(0,0,0,.08)", marginBottom: 20 }}>

        {/* Skill chips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
            {t.selectSkill}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SKILL_CHIPS.map(c => {
              const active = skills === c.value;
              return (
                <button key={c.value} onClick={() => { setSkills(c.value); setError(""); }}
                  style={{ padding: "8px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#006491" : "#f3f4f6", color: active ? "#fff" : "#374151", border: `1.5px solid ${active ? "#006491" : "#e5e7eb"}`, display: "flex", alignItems: "center", gap: 5 }}>
                  <span>{c.label}</span>
                  <span>{getChipLabel(c)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{t.yourSkill}</label>
          <input value={skills} onChange={e => { setSkills(e.target.value); setError(""); }}
            placeholder={t.skillPlaceholder}
            style={{ width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* City input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{t.yourCity}</label>
          <input value={location} onChange={e => { setLocation(e.target.value); setError(""); }}
            placeholder={t.cityPlaceholder}
            style={{ width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>⚠️ {error}</div>
        )}

        <button onClick={search} disabled={loading}
          style={{ width: "100%", padding: "14px 0", background: loading ? "#9ca3af" : "linear-gradient(135deg,#E8002A,#c0001f)", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <><span>⏳</span> {t.finding}</> : <><span>🤖</span> {t.getJobs}</>}
        </button>
      </div>

      {/* Results */}
      {!loading && searched && (
        <>
          {summary && (
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📊</span>
              <p style={{ margin: 0, fontSize: 14, color: "#0c4a6e", lineHeight: 1.6, fontWeight: 500 }}>{summary}</p>
            </div>
          )}

          {/* Career tips */}
          {tips.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 18, padding: "20px", boxShadow: "0 3px 16px rgba(0,0,0,.08)", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>💡</span> {t.careerTips}
              </div>
              {tips.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < tips.length - 1 ? 12 : 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e8f4f8", color: "#006491", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{tip}</p>
                </div>
              ))}
            </div>
          )}

          {suggestions.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 18, padding: 32, textAlign: "center", boxShadow: "0 3px 16px rgba(0,0,0,.08)" }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t.noJobs}</div>
              <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>{t.noJobsDesc}</div>
              <a href="/jobs" style={{ background: "#006491", color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700 }}>{t.browseAll}</a>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 12 }}>
                {suggestions.length} {t.found} <b>{skills}</b> {t.in} <b>{location}</b>
              </div>
              {suggestions.map((s, i) => <SuggestionCard key={i} s={s} index={i} t={t} language={language} />)}
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <a href="/jobs" style={{ color: "#006491", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>{t.browseAll}</a>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}