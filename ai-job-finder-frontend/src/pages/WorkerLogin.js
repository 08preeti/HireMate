/*import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Picture-based skill selection — no typing needed
const SKILL_OPTIONS = [
  { value: "Electrician",        emoji: "⚡", labelEn: "Electrician",  labelHi: "इलेक्ट्रीशियन", labelMr: "इलेक्ट्रिशियन" },
  { value: "Plumber",            emoji: "🔧", labelEn: "Plumber",      labelHi: "प्लम्बर",         labelMr: "प्लंबर" },
  { value: "Cook",               emoji: "🍳", labelEn: "Cook",         labelHi: "रसोइया",          labelMr: "स्वयंपाकी" },
  { value: "Driver",             emoji: "🚗", labelEn: "Driver",       labelHi: "ड्राइवर",         labelMr: "चालक" },
  { value: "Carpenter",          emoji: "🪚", labelEn: "Carpenter",    labelHi: "बढ़ई",            labelMr: "सुतार" },
  { value: "Painter",            emoji: "🎨", labelEn: "Painter",      labelHi: "पेंटर",           labelMr: "रंगारी" },
  { value: "Cleaner",            emoji: "🧹", labelEn: "Cleaner",      labelHi: "सफाईकर्मी",       labelMr: "सफाई कामगार" },
  { value: "Security Guard",     emoji: "🛡️", labelEn: "Security",    labelHi: "गार्ड",           labelMr: "सुरक्षारक्षक" },
  { value: "Gardener",           emoji: "🌿", labelEn: "Gardener",     labelHi: "माली",            labelMr: "माळी" },
  { value: "Delivery Boy",       emoji: "📦", labelEn: "Delivery",     labelHi: "डिलीवरी",         labelMr: "डिलिव्हरी" },
  { value: "Mechanic",           emoji: "⚙️", labelEn: "Mechanic",    labelHi: "मैकेनिक",         labelMr: "मेकॅनिक" },
  { value: "Mason",              emoji: "🏗️", labelEn: "Mason",       labelHi: "राजमिस्त्री",     labelMr: "गवंडी" },
  { value: "House Maid",         emoji: "🏠", labelEn: "Maid",         labelHi: "घरेलू काम",       labelMr: "घरकाम" },
  { value: "Waiter",             emoji: "🍽️", labelEn: "Waiter",      labelHi: "वेटर",            labelMr: "वेटर" },
  { value: "Helper",             emoji: "👷", labelEn: "Helper",       labelHi: "मजदूर",           labelMr: "मजूर" },
  { value: "Welder",             emoji: "🔥", labelEn: "Welder",       labelHi: "वेल्डर",          labelMr: "वेल्डर" },
];

const STEPS = { PHONE: "phone", OTP: "otp", PROFILE: "profile" };

export default function WorkerLogin() {
  const navigate             = useNavigate();
  const { language }         = useLanguage();
  const t                    = translations[language];

  const [step, setStep]         = useState(STEPS.PHONE);
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [name, setName]         = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [isNewWorker, setIsNewWorker] = useState(false);
  const [devOtp, setDevOtp]     = useState(""); // shown in dev mode

  const labels = {
    en: { s: "labelEn" }, hi: { s: "labelHi" }, mr: { s: "labelMr" },
  };
  const skillLabel = (skill) => skill[labels[language]?.s || "labelEn"];

  // Step 1 — Send OTP
  const sendOTP = async () => {
    if (phone.length < 10) { setError("Please enter a valid 10-digit phone number"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      if (data.otp) setDevOtp(data.otp); // dev only
      setStep(STEPS.OTP);
    } catch { setError("Server error. Please try again."); }
    setLoading(false);
  };

  // Step 2 — Verify OTP
  const verifyOTP = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        // New worker — need profile setup
        if (data.message === "Name required for new registration") {
          setIsNewWorker(true);
          setStep(STEPS.PROFILE);
          setLoading(false);
          return;
        }
        setError(data.message);
        setLoading(false);
        return;
      }
      // Existing worker — logged in
      localStorage.setItem("worker", JSON.stringify(data.worker));
      navigate("/worker-dashboard");
    } catch { setError("Verification failed. Please try again."); }
    setLoading(false);
  };

  // Step 3 — Complete profile for new worker
  const completeProfile = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!selectedSkill) { setError("Please select your skill"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name, skills: selectedSkill, location }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      localStorage.setItem("worker", JSON.stringify(data.worker));
      navigate("/worker-dashboard");
    } catch { setError("Registration failed. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,.12)", width: "100%", maxWidth: 420, overflow: "hidden" }}>

        
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", padding: "28px 24px", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>👷</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {language === "hi" ? "कामगार लॉगिन" : language === "mr" ? "कामगार लॉगिन" : "Worker Login"}
          </div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
            {language === "hi" ? "अपना फ़ोन नंबर दर्ज करें" : language === "mr" ? "तुमचा फोन नंबर टाका" : "Enter your phone number to continue"}
          </div>
        </div>

        <div style={{ padding: 24 }}>

          
          {step === STEPS.PHONE && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                {language === "hi" ? "📱 फ़ोन नंबर" : language === "mr" ? "📱 फोन नंबर" : "📱 Phone Number"}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#f3f4f6", borderRadius: 10, padding: "12px 14px", fontWeight: 700, fontSize: 15, border: "1.5px solid #e5e7eb" }}>+91</div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="9876543210"
                  style={{ flex: 1, padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 16, outline: "none", letterSpacing: 2 }}
                />
              </div>

              {error && <div style={{ color: "#E8002A", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                style={{ width: "100%", padding: "14px 0", background: phone.length >= 10 ? "#006491" : "#9ca3af", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: phone.length >= 10 ? "pointer" : "not-allowed", boxShadow: phone.length >= 10 ? "0 4px 14px rgba(0,100,145,.3)" : "none" }}
              >
                {loading ? "Sending…" : (language === "hi" ? "OTP भेजें" : language === "mr" ? "OTP पाठवा" : "Send OTP")}
              </button>
            </>
          )}

          
          {step === STEPS.OTP && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 40 }}>📱</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>
                  {language === "hi" ? "OTP दर्ज करें" : language === "mr" ? "OTP टाका" : "Enter OTP"}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {language === "hi" ? `+91 ${phone} पर भेजा गया` : language === "mr" ? `+91 ${phone} वर पाठवला` : `Sent to +91 ${phone}`}
                </div>
                {devOtp && (
                  <div style={{ marginTop: 8, background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#856404" }}>
                    🔧 Dev OTP: <b>{devOtp}</b>
                  </div>
                )}
              </div>

              <input
                type="tel"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="● ● ● ● ● ●"
                style={{ width: "100%", padding: "16px 14px", border: "2px solid #006491", borderRadius: 12, fontSize: 24, textAlign: "center", letterSpacing: 8, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
              />

              {error && <div style={{ color: "#E8002A", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

              <button
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                style={{ width: "100%", padding: "14px 0", background: otp.length === 6 ? "#006491" : "#9ca3af", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: otp.length === 6 ? "pointer" : "not-allowed", marginBottom: 12 }}
              >
                {loading ? "Verifying…" : (language === "hi" ? "सत्यापित करें" : language === "mr" ? "सत्यापित करा" : "Verify OTP")}
              </button>

              <button
                onClick={() => { setStep(STEPS.PHONE); setOtp(""); setError(""); setDevOtp(""); }}
                style={{ width: "100%", padding: "10px 0", background: "none", border: "1px solid #e5e7eb", borderRadius: 12, color: "#6b7280", fontSize: 14, cursor: "pointer" }}
              >
                {language === "hi" ? "← वापस जाएं" : language === "mr" ? "← परत जा" : "← Change Number"}
              </button>
            </>
          )}

          
          {step === STEPS.PROFILE && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 36 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>
                  {language === "hi" ? "नया अकाउंट बनाएं" : language === "mr" ? "नवीन खाते तयार करा" : "Create Your Account"}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {language === "hi" ? "सिर्फ एक बार — फिर हमेशा फ़ोन से लॉगिन होगा" : language === "mr" ? "फक्त एकदा — नंतर फोनने लॉगिन" : "Just once — next time login with phone"}
                </div>
              </div>

              
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {language === "hi" ? "आपका नाम" : language === "mr" ? "तुमचे नाव" : "Your Name"}
              </div>
              <input
                placeholder={language === "hi" ? "जैसे: रमेश पाटिल" : language === "mr" ? "उदा: रमेश पाटील" : "e.g. Ramesh Patil"}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
              />

              
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                {language === "hi" ? "आपका काम चुनें 👇" : language === "mr" ? "तुमचे काम निवडा 👇" : "Select Your Skill 👇"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill.value}
                    onClick={() => setSelectedSkill(skill.value)}
                    style={{
                      padding: "10px 4px",
                      borderRadius: 12,
                      border: `2px solid ${selectedSkill === skill.value ? "#006491" : "#e5e7eb"}`,
                      background: selectedSkill === skill.value ? "#e8f4f8" : "#f9fafb",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all .15s",
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{skill.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: selectedSkill === skill.value ? "#006491" : "#6b7280", textAlign: "center", lineHeight: 1.2 }}>
                      {skillLabel(skill)}
                    </span>
                  </button>
                ))}
              </div>

              
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {language === "hi" ? "आपका इलाका (वैकल्पिक)" : language === "mr" ? "तुमचा परिसर (पर्यायी)" : "Your Area (Optional)"}
              </div>
              <input
                placeholder={language === "hi" ? "जैसे: नासिक, पुणे" : language === "mr" ? "उदा: नाशिक, पुणे" : "e.g. Nashik, Pune"}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
              />

              {error && <div style={{ color: "#E8002A", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

              <button
                onClick={completeProfile}
                disabled={loading || !name.trim() || !selectedSkill}
                style={{ width: "100%", padding: "14px 0", background: (name.trim() && selectedSkill) ? "#006491" : "#9ca3af", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: (name.trim() && selectedSkill) ? "pointer" : "not-allowed", boxShadow: "0 4px 14px rgba(0,100,145,.3)" }}
              >
                {loading ? "Setting up…" : (language === "hi" ? "शुरू करें 🚀" : language === "mr" ? "सुरू करा 🚀" : "Start Working 🚀")}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}  */



//------------------
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import VoiceSearch from "../components/VoiceSearch";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Picture-based skill selection — no typing needed
const SKILL_OPTIONS = [
  { value: "Electrician",        emoji: "⚡", labelEn: "Electrician",  labelHi: "इलेक्ट्रीशियन", labelMr: "इलेक्ट्रिशियन" },
  { value: "Plumber",            emoji: "🔧", labelEn: "Plumber",      labelHi: "प्लम्बर",         labelMr: "प्लंबर" },
  { value: "Cook",               emoji: "🍳", labelEn: "Cook",         labelHi: "रसोइया",          labelMr: "स्वयंपाकी" },
  { value: "Driver",             emoji: "🚗", labelEn: "Driver",       labelHi: "ड्राइवर",         labelMr: "चालक" },
  { value: "Carpenter",          emoji: "🪚", labelEn: "Carpenter",    labelHi: "बढ़ई",            labelMr: "सुतार" },
  { value: "Painter",            emoji: "🎨", labelEn: "Painter",      labelHi: "पेंटर",           labelMr: "रंगारी" },
  { value: "Cleaner",            emoji: "🧹", labelEn: "Cleaner",      labelHi: "सफाईकर्मी",       labelMr: "सफाई कामगार" },
  { value: "Security Guard",     emoji: "🛡️", labelEn: "Security",    labelHi: "गार्ड",           labelMr: "सुरक्षारक्षक" },
  { value: "Gardener",           emoji: "🌿", labelEn: "Gardener",     labelHi: "माली",            labelMr: "माळी" },
  { value: "Delivery Boy",       emoji: "📦", labelEn: "Delivery",     labelHi: "डिलीवरी",         labelMr: "डिलिव्हरी" },
  { value: "Mechanic",           emoji: "⚙️", labelEn: "Mechanic",    labelHi: "मैकेनिक",         labelMr: "मेकॅनिक" },
  { value: "Mason",              emoji: "🏗️", labelEn: "Mason",       labelHi: "राजमिस्त्री",     labelMr: "गवंडी" },
  { value: "House Maid",         emoji: "🏠", labelEn: "Maid",         labelHi: "घरेलू काम",       labelMr: "घरकाम" },
  { value: "Waiter",             emoji: "🍽️", labelEn: "Waiter",      labelHi: "वेटर",            labelMr: "वेटर" },
  { value: "Helper",             emoji: "👷", labelEn: "Helper",       labelHi: "मजदूर",           labelMr: "मजूर" },
  { value: "Welder",             emoji: "🔥", labelEn: "Welder",       labelHi: "वेल्डर",          labelMr: "वेल्डर" },
];

const STEPS = { PHONE: "phone", OTP: "otp", PROFILE: "profile" };

export default function WorkerLogin() {
  const navigate             = useNavigate();
  const { language }         = useLanguage();
  const t                    = translations[language];

  const [step, setStep]         = useState(STEPS.PHONE);
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [name, setName]         = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [isNewWorker, setIsNewWorker] = useState(false);
  const [devOtp, setDevOtp]     = useState(""); // shown in dev mode

  const labels = {
    en: { s: "labelEn" }, hi: { s: "labelHi" }, mr: { s: "labelMr" },
  };
  const skillLabel = (skill) => skill[labels[language]?.s || "labelEn"];

  // Step 1 — Send OTP
  const sendOTP = async () => {
    if (phone.length < 10) { setError("Please enter a valid 10-digit phone number"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      if (data.otp) setDevOtp(data.otp); // dev only
      setStep(STEPS.OTP);
    } catch { setError("Server error. Please try again."); }
    setLoading(false);
  };

  // Step 2 — Verify OTP
  const verifyOTP = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        // New worker — need profile setup
        if (data.message === "Name required for new registration") {
          setIsNewWorker(true);
          setStep(STEPS.PROFILE);
          setLoading(false);
          return;
        }
        setError(data.message);
        setLoading(false);
        return;
      }
      // Existing worker — logged in
      localStorage.setItem("worker", JSON.stringify(data.worker));
      navigate("/worker-dashboard");
    } catch { setError("Verification failed. Please try again."); }
    setLoading(false);
  };

  // Step 3 — Complete profile for new worker
  const completeProfile = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!selectedSkill) { setError("Please select your skill"); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name, skills: selectedSkill, location }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      localStorage.setItem("worker", JSON.stringify(data.worker));
      navigate("/worker-dashboard");
    } catch { setError("Registration failed. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,.12)", width: "100%", maxWidth: 420, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", padding: "28px 24px", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>👷</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {language === "hi" ? "कामगार लॉगिन" : language === "mr" ? "कामगार लॉगिन" : "Worker Login"}
          </div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
            {language === "hi" ? "अपना फ़ोन नंबर दर्ज करें" : language === "mr" ? "तुमचा फोन नंबर टाका" : "Enter your phone number to continue"}
          </div>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── STEP 1: PHONE ───────────────────────────── */}
          {step === STEPS.PHONE && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                {language === "hi" ? "📱 फ़ोन नंबर" : language === "mr" ? "📱 फोन नंबर" : "📱 Phone Number"}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#f3f4f6", borderRadius: 10, padding: "12px 14px", fontWeight: 700, fontSize: 15, border: "1.5px solid #e5e7eb" }}>+91</div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="9876543210"
                  style={{ flex: 1, padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 16, outline: "none", letterSpacing: 2 }}
                />
              </div>

              {error && <div style={{ color: "#E8002A", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                style={{ width: "100%", padding: "14px 0", background: phone.length >= 10 ? "#006491" : "#9ca3af", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: phone.length >= 10 ? "pointer" : "not-allowed", boxShadow: phone.length >= 10 ? "0 4px 14px rgba(0,100,145,.3)" : "none" }}
              >
                {loading ? "Sending…" : (language === "hi" ? "OTP भेजें" : language === "mr" ? "OTP पाठवा" : "Send OTP")}
              </button>
            </>
          )}

          {/* ── STEP 2: OTP ─────────────────────────────── */}
          {step === STEPS.OTP && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 40 }}>📱</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>
                  {language === "hi" ? "OTP दर्ज करें" : language === "mr" ? "OTP टाका" : "Enter OTP"}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {language === "hi" ? `+91 ${phone} पर भेजा गया` : language === "mr" ? `+91 ${phone} वर पाठवला` : `Sent to +91 ${phone}`}
                </div>
                {devOtp && (
                  <div style={{ marginTop: 8, background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#856404" }}>
                    🔧 Dev OTP: <b>{devOtp}</b>
                  </div>
                )}
              </div>

              <input
                type="tel"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="● ● ● ● ● ●"
                style={{ width: "100%", padding: "16px 14px", border: "2px solid #006491", borderRadius: 12, fontSize: 24, textAlign: "center", letterSpacing: 8, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
              />

              {error && <div style={{ color: "#E8002A", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

              <button
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                style={{ width: "100%", padding: "14px 0", background: otp.length === 6 ? "#006491" : "#9ca3af", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: otp.length === 6 ? "pointer" : "not-allowed", marginBottom: 12 }}
              >
                {loading ? "Verifying…" : (language === "hi" ? "सत्यापित करें" : language === "mr" ? "सत्यापित करा" : "Verify OTP")}
              </button>

              <button
                onClick={() => { setStep(STEPS.PHONE); setOtp(""); setError(""); setDevOtp(""); }}
                style={{ width: "100%", padding: "10px 0", background: "none", border: "1px solid #e5e7eb", borderRadius: 12, color: "#6b7280", fontSize: 14, cursor: "pointer" }}
              >
                {language === "hi" ? "← वापस जाएं" : language === "mr" ? "← परत जा" : "← Change Number"}
              </button>
            </>
          )}

          {/* ── STEP 3: NEW WORKER PROFILE ──────────────── */}
          {step === STEPS.PROFILE && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 36 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>
                  {language === "hi" ? "नया अकाउंट बनाएं" : language === "mr" ? "नवीन खाते तयार करा" : "Create Your Account"}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {language === "hi" ? "सिर्फ एक बार — फिर हमेशा फ़ोन से लॉगिन होगा" : language === "mr" ? "फक्त एकदा — नंतर फोनने लॉगिन" : "Just once — next time login with phone"}
                </div>
              </div>

              {/* Name */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {language === "hi" ? "आपका नाम" : language === "mr" ? "तुमचे नाव" : "Your Name"}
              </div>
              <input
                placeholder={language === "hi" ? "जैसे: रमेश पाटिल" : language === "mr" ? "उदा: रमेश पाटील" : "e.g. Ramesh Patil"}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
              />

              {/* Voice search for skill */}
              <div style={{ textAlign: "center", marginBottom: 16, padding: "14px", background: "#f0f9ff", borderRadius: 14, border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0c4a6e", marginBottom: 10 }}>
                  {language === "hi" ? "🎤 बोलकर अपना काम बताएं" : language === "mr" ? "🎤 बोलून तुमचे काम सांगा" : "🎤 Or speak your skill"}
                </div>
                <VoiceSearch
                  onResult={(skill, transcript) => {
                    if (skill) setSelectedSkill(skill);
                  }}
                />
              </div>

              {/* Skill — picture grid */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                {language === "hi" ? "आपका काम चुनें 👇" : language === "mr" ? "तुमचे काम निवडा 👇" : "Select Your Skill 👇"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill.value}
                    onClick={() => setSelectedSkill(skill.value)}
                    style={{
                      padding: "10px 4px",
                      borderRadius: 12,
                      border: `2px solid ${selectedSkill === skill.value ? "#006491" : "#e5e7eb"}`,
                      background: selectedSkill === skill.value ? "#e8f4f8" : "#f9fafb",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all .15s",
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{skill.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: selectedSkill === skill.value ? "#006491" : "#6b7280", textAlign: "center", lineHeight: 1.2 }}>
                      {skillLabel(skill)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Location */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {language === "hi" ? "आपका इलाका (वैकल्पिक)" : language === "mr" ? "तुमचा परिसर (पर्यायी)" : "Your Area (Optional)"}
              </div>
              <input
                placeholder={language === "hi" ? "जैसे: नासिक, पुणे" : language === "mr" ? "उदा: नाशिक, पुणे" : "e.g. Nashik, Pune"}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
              />

              {error && <div style={{ color: "#E8002A", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

              <button
                onClick={completeProfile}
                disabled={loading || !name.trim() || !selectedSkill}
                style={{ width: "100%", padding: "14px 0", background: (name.trim() && selectedSkill) ? "#006491" : "#9ca3af", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: (name.trim() && selectedSkill) ? "pointer" : "not-allowed", boxShadow: "0 4px 14px rgba(0,100,145,.3)" }}
              >
                {loading ? "Setting up…" : (language === "hi" ? "शुरू करें 🚀" : language === "mr" ? "सुरू करा 🚀" : "Start Working 🚀")}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}