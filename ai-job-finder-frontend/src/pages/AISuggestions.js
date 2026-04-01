import { useState } from "react";
//yes working now
const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SKILL_CHIPS = [
  { label: "⚡ Electrician", value: "Electrician" },
  { label: "🔧 Plumber",     value: "Plumber" },
  { label: "🍳 Cook",        value: "Cook" },
  { label: "🚗 Driver",      value: "Driver" },
  { label: "🪚 Carpenter",   value: "Carpenter" },
  { label: "🎨 Painter",     value: "Painter" },
  { label: "🧹 Cleaner",     value: "Cleaner" },
  { label: "🛡️ Security",   value: "Security Guard" },
  { label: "🌿 Gardener",    value: "Gardener" },
  { label: "📦 Delivery",    value: "Delivery Boy" },
  { label: "⚙️ Mechanic",   value: "Mechanic" },
  { label: "🏗️ Mason",      value: "Mason" },
];

function MatchBar({ score }) {
  if (!score) return null;
  const pct   = score * 10;
  const color = score >= 8 ? "#10b981" : score >= 5 ? "#f59e0b" : "#E8002A";
  const label = score >= 8 ? "Excellent" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Low";
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Match</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{score}/10 — {label}</span>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: 99, height: 7, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1.2s ease" }} />
      </div>
    </div>
  );
}

function SuggestionCard({ s, index }) {
  const [showTip, setShowTip] = useState(false);
  const score = s.matchScore || 0;
  const borderColor = score >= 8 ? "#10b981" : score >= 5 ? "#f59e0b" : "#e5e7eb";
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 14, boxShadow: "0 3px 16px rgba(0,0,0,.08)", border: `1px solid ${borderColor}40` }}>

      {/* Urgent banner */}
      {s.isUrgent && (
        <div style={{ background: "#E8002A", color: "#fff", padding: "5px 16px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          🚨 URGENT — Employer needs someone immediately
        </div>
      )}

      <div style={{ padding: "16px 18px" }}>
        {/* Title row */}
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
            <MatchBar score={s.matchScore} />
          </div>
        </div>

        {/* AI reason */}
        <div style={{ marginTop: 14, background: "#f0f9ff", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🤖</span>
          <p style={{ margin: 0, fontSize: 13, color: "#0c4a6e", lineHeight: 1.65 }}>{s.reason}</p>
        </div>
      </div>

      {/* Tip toggle */}
      {s.tip && (
        <>
          <button
            onClick={() => setShowTip((v) => !v)}
            style={{ width: "100%", padding: "10px 18px", background: "none", border: "none", borderTop: "1px solid #f3f4f6", cursor: "pointer", fontSize: 13, color: "#006491", fontWeight: 600, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>💡 Application tip</span>
            <span style={{ fontSize: 10 }}>{showTip ? "▲ Hide" : "▼ Show"}</span>
          </button>
          {showTip && (
            <div style={{ padding: "12px 18px", background: "#f0fdf4", borderTop: "1px solid #dcfce7", fontSize: 13, color: "#065f46", lineHeight: 1.65 }}>
              {s.tip}
            </div>
          )}
        </>
      )}

      {/* Apply button */}
      {s.jobId && (
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f3f4f6" }}>
          <a
            href={`/jobs/${s.jobId}`}
            style={{ display: "block", textAlign: "center", background: "#006491", color: "#fff", borderRadius: 12, padding: "12px 0", textDecoration: "none", fontWeight: 700, fontSize: 15, boxShadow: "0 3px 10px rgba(0,100,145,.25)" }}
          >
            View Job & Apply →
          </a>
        </div>
      )}
    </div>
  );
}

function CareerTips({ tips }) {
  if (!tips || tips.length === 0) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "20px", boxShadow: "0 3px 16px rgba(0,0,0,.08)", marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22 }}>💡</span> Career Tips for You
      </div>
      {tips.map((tip, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < tips.length - 1 ? 12 : 0, alignItems: "flex-start" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e8f4f8", color: "#006491", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
          <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{tip}</p>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function AISuggestions() {
  const [skills, setSkills]           = useState("");
  const [location, setLocation]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary]         = useState("");
  const [tips, setTips]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [searched, setSearched]       = useState(false);

  const search = async () => {
    if (!skills.trim()) { setError("Please select or enter your skill."); return; }
    if (!location.trim()) { setError("Please enter your location."); return; }
    setError("");
    setLoading(true);
    setSearched(false);

    try {
      // Run suggestions + career tips in parallel
      const [sugRes, tipRes] = await Promise.allSettled([
        fetch(`${BASE}/api/ai/suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: skills.trim(), location: location.trim() }),
        }).then((r) => r.json()),

        fetch(`${BASE}/api/ai/career-tips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill: skills.trim() }),
        }).then((r) => r.json()),
      ]);

      if (sugRes.status === "fulfilled") {
        if (sugRes.value.error) {
          setError(sugRes.value.error);
        } else {
          setSuggestions(sugRes.value.suggestions || []);
          setSummary(sugRes.value.summary || "");
          setSearched(true);
        }
      } else {
        setError("Could not reach the server. Is the backend running?");
      }

      if (tipRes.status === "fulfilled" && tipRes.value.tips) {
        setTips(tipRes.value.tips);
      }
    } catch {
      setError("Server error. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") search(); };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 48px", fontFamily: "sans-serif" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", borderRadius: 20, padding: "26px 24px", marginBottom: 20, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 90, opacity: .07, pointerEvents: "none" }}>🤖</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🤖 AI Job Suggestions</div>
        <div style={{ fontSize: 14, opacity: .85, lineHeight: 1.6 }}>
          Tell us your skill and city — our smart engine instantly matches you with the best available jobs and explains why each one suits you.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["✅ 100% Free", "⚡ Instant Results", "📍 Location-Based"].map((t) => (
            <span key={t} style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Search card */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "20px", boxShadow: "0 4px 24px rgba(0,0,0,.08)", marginBottom: 20 }}>

        {/* Skill chips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Select your skill</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SKILL_CHIPS.map((c) => {
              const active = skills === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => { setSkills(c.value); setError(""); }}
                  style={{ padding: "7px 13px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#006491" : "#f3f4f6", color: active ? "#fff" : "#374151", border: `1.5px solid ${active ? "#006491" : "#e5e7eb"}`, transition: "all .15s" }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skills input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Your Skill</label>
          <input
            value={skills}
            onChange={(e) => { setSkills(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Electrician, Cook, Driver…"
            style={{ width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box" }}
            onFocus={(e) => (e.target.style.borderColor = "#006491")}
            onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Location input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Your City / Area</label>
          <input
            value={location}
            onChange={(e) => { setLocation(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Nashik, Mumbai, Pune…"
            style={{ width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box" }}
            onFocus={(e) => (e.target.style.borderColor = "#006491")}
            onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14, display: "flex", gap: 8 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={search}
          disabled={loading}
          style={{ width: "100%", padding: "14px 0", background: loading ? "#9ca3af" : "linear-gradient(135deg,#E8002A,#c0001f)", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 16px rgba(232,0,42,.35)", transition: "all .2s" }}
        >
          {loading ? (
            <><span style={{ display: "inline-block", animation: "spin .8s linear infinite" }}>⏳</span> Finding best matches…</>
          ) : (
            <><span>🤖</span> Get My Job Suggestions</>
          )}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
          {[80, 65, 72].map((w, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ height: 16, background: "#f3f4f6", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s infinite", width: `${w}%` }} />
              <div style={{ height: 11, background: "#f3f4f6", borderRadius: 8, animation: "pulse 1.5s infinite", width: "45%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Summary */}
          {summary && (
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📊</span>
              <p style={{ margin: 0, fontSize: 14, color: "#0c4a6e", lineHeight: 1.6, fontWeight: 500 }}>{summary}</p>
            </div>
          )}

          {/* Career tips */}
          <CareerTips tips={tips} />

          {/* No results */}
          {suggestions.length === 0 && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 32, textAlign: "center", boxShadow: "0 3px 16px rgba(0,0,0,.08)" }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No matching jobs right now</div>
              <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                No active jobs match your {skills} skills in {location} at the moment.<br />New jobs are added daily — check back soon!
              </div>
              <a href="/jobs" style={{ background: "#006491", color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>Browse All Jobs</a>
            </div>
          )}

          {/* Job cards */}
          {suggestions.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 12 }}>
                {suggestions.length} best match{suggestions.length > 1 ? "es" : ""} for <b>{skills}</b> in <b>{location}</b>
              </div>
              {suggestions.map((s, i) => <SuggestionCard key={i} s={s} index={i} />)}
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <a href="/jobs" style={{ color: "#006491", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>Browse all available jobs →</a>
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}