import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

export default function Home() {
  const navigate     = useNavigate();
  const { language } = useLanguage();
  const t            = translations[language];


  useEffect(() => {
    // If already logged in, skip role selection
    const worker   = localStorage.getItem("worker");
    const employer = localStorage.getItem("employerToken");
    const onboardingDone = localStorage.getItem("onboardingDone");

    if (worker || employer) {
      return;
    }
    if (!onboardingDone) {
      navigate("/onboarding");
    }
  }, [navigate]);

  const isWorkerLoggedIn   = !!localStorage.getItem("worker");
  const isEmployerLoggedIn = !!localStorage.getItem("employerToken");
  const token = localStorage.getItem("token") || localStorage.getItem("employerToken");

  const handlePostJob = () => {
    if (token) navigate("/post-job");
    else navigate("/employer-login");
  };

  // ── ROLE SELECTION SCREEN ──────────────────────────────
  if (!isWorkerLoggedIn && !isEmployerLoggedIn) {
    return (
      <div style={{
        minHeight: "90vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px", fontFamily: "sans-serif",
        background: "linear-gradient(160deg, #f0f9ff 0%, #fff 60%)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ background: "#006491", color: "#fff", fontWeight: 900, padding: "6px 12px", borderRadius: 10, fontSize: 20 }}>HM</div>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#006491" }}>HireMate</span>
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
            {language === "hi" ? "आप कौन हैं?" : language === "mr" ? "तुम्ही कोण आहात?" : "Who are you?"}
          </div>
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 380 }}>

          {/* Worker card */}
          <button
            onClick={() => navigate("/worker-login")}
            style={{
              background: "#fff", border: "2px solid #e5e7eb", borderRadius: 20,
              padding: "24px 20px", cursor: "pointer", textAlign: "left",
              boxShadow: "0 4px 20px rgba(0,0,0,.06)", transition: "all .2s",
              display: "flex", alignItems: "center", gap: 18,
            }}
            onMouseEnter={e => { e.currentTarget.style.border = "2px solid #006491"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,100,145,.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "2px solid #e5e7eb"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.06)"; }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#006491,#004f73)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
              👷
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 4 }}>
                {language === "hi" ? "मैं कामगार हूं" : language === "mr" ? "मी कामगार आहे" : "I'm a Worker"}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                {language === "hi" ? "नौकरी खोजें, पैसे कमाएं" : language === "mr" ? "नोकरी शोधा, पैसे कमवा" : "Find jobs near you and earn daily"}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {["📍 GPS Jobs", "🎤 Voice", "🤖 AI Match"].map(tag => (
                  <span key={tag} style={{ fontSize: 11, background: "#e8f4f8", color: "#006491", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 20, color: "#006491", flexShrink: 0 }}>→</div>
          </button>

          {/* Employer card */}
          <button
            onClick={() => navigate("/employer-login")}
            style={{
              background: "#fff", border: "2px solid #e5e7eb", borderRadius: 20,
              padding: "24px 20px", cursor: "pointer", textAlign: "left",
              boxShadow: "0 4px 20px rgba(0,0,0,.06)", transition: "all .2s",
              display: "flex", alignItems: "center", gap: 18,
            }}
            onMouseEnter={e => { e.currentTarget.style.border = "2px solid #E8002A"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(232,0,42,.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "2px solid #e5e7eb"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.06)"; }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#E8002A,#c0001f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
              🏢
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 4 }}>
                {language === "hi" ? "मैं नियोक्ता हूं" : language === "mr" ? "मी नियोक्ता आहे" : "I'm an Employer"}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                {language === "hi" ? "कामगार खोजें, नौकरी पोस्ट करें" : language === "mr" ? "कामगार शोधा, नोकरी पोस्ट करा" : "Post jobs and find workers instantly"}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {["🗺️ Map Pin", "📊 Dashboard", "⭐ Ratings"].map(tag => (
                  <span key={tag} style={{ fontSize: 11, background: "#fee2e2", color: "#E8002A", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 20, color: "#E8002A", flexShrink: 0 }}>→</div>
          </button>
        </div>

        {/* Browse jobs without login */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link to="/jobs" style={{ fontSize: 14, color: "#006491", fontWeight: 600, textDecoration: "none" }}>
            🔍 {language === "hi" ? "बिना लॉगिन नौकरियां देखें" : language === "mr" ? "लॉगिनशिवाय नोकऱ्या पहा" : "Browse jobs without login"} →
          </Link>
        </div>

        {/* Trust badges */}
        <div style={{ marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { emoji: "🔒", text: language === "hi" ? "100% सुरक्षित" : language === "mr" ? "100% सुरक्षित" : "100% Safe" },
            { emoji: "💸", text: language === "hi" ? "बिल्कुल मुफ्त" : language === "mr" ? "पूर्णपणे मोफत" : "Completely Free" },
            { emoji: "🌐", text: language === "hi" ? "हिंदी • मराठी" : language === "mr" ? "हिंदी • मराठी" : "Hindi • Marathi" },
          ].map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
              <span>{b.emoji}</span><span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── LOGGED IN HOME (original layout) ──────────────────
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">

      <div className="bg-white rounded-2xl p-10 shadow-lg grid md:grid-cols-2 gap-10 items-center">

        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#006491] leading-tight">
            {t.heroTitle}
          </h1>
          <p className="mt-4 text-gray-600 max-w-xl">{t.heroSub}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button onClick={handlePostJob} className="bg-[#006491] text-white px-6 py-3 rounded-lg font-semibold shadow">
              {t.postJob}
            </button>
            <Link to="/jobs" className="border border-[#006491] text-[#006491] px-6 py-3 rounded-lg font-semibold hover:bg-[#F0F7FA]">
              {t.viewJobs}
            </Link>
            <Link to="/ai-suggestions" className="bg-[#E8002A] text-white px-6 py-3 rounded-lg font-semibold">
              {t.getAI}
            </Link>
          </div>
        </div>

        <div className="bg-[#F3FAFF] rounded-2xl p-6 shadow-inner">
          <h3 className="text-xl font-bold text-[#006491] mb-2">{t.trending}</h3>
          <p className="text-sm text-gray-600 mb-4">{t.categories}</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { en: "Painter", hi: "पेंटर", mr: "रंगारी", city: "Nashik" },
              { en: "Driver",  hi: "ड्राइवर", mr: "चालक", city: "Pune" },
              { en: "Plumber", hi: "प्लंबर", mr: "प्लंबर", city: "Mumbai" },
              { en: "Electrician", hi: "इलेक्ट्रीशियन", mr: "इलेक्ट्रिशियन", city: "Nagpur" },
            ].map((job, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow text-sm">
                <div className="font-semibold">{language === "hi" ? job.hi : language === "mr" ? job.mr : job.en}</div>
                <div className="text-gray-500 text-xs">{job.city}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <Link to="/jobs" className="text-sm text-[#006491] font-semibold hover:underline">{t.seeAll}</Link>
          </div>
        </div>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">{t.employer}</h4>
          <p className="text-gray-600 text-sm">{t.employerDesc}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">{t.worker}</h4>
          <p className="text-gray-600 text-sm">{t.workerDesc}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow hover:shadow-lg transition">
          <h4 className="font-bold text-[#006491] mb-2">{t.aiTitle}</h4>
          <p className="text-gray-600 text-sm">{t.aiDesc}</p>
        </div>
      </div>
    </div>
  );
}