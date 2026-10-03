import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const WORKER_TABS = [
  { path: "/",                icon: "🏠", labelEn: "Home",    labelHi: "होम",      labelMr: "मुख्य" },
  { path: "/jobs",            icon: "💼", labelEn: "Jobs",    labelHi: "नौकरी",    labelMr: "नोकरी" },
  { path: "/ai-suggestions",  icon: "🤖", labelEn: "AI",      labelHi: "AI",       labelMr: "AI" },
  { path: "/worker-dashboard",icon: "📍", labelEn: "Nearby",  labelHi: "पास में",  labelMr: "जवळ" },
  { path: "/worker-profile",  icon: "👷", labelEn: "Profile", labelHi: "प्रोफ़ाइल",labelMr: "प्रोफाइल" },
];

const EMPLOYER_TABS = [
  { path: "/",                  icon: "🏠", labelEn: "Home",     labelHi: "होम",        labelMr: "मुख्य" },
  { path: "/post-job",          icon: "➕", labelEn: "Post Job", labelHi: "नौकरी पोस्ट",labelMr: "नोकरी पोस्ट" },
  { path: "/employer-dashboard",icon: "📊", labelEn: "Dashboard",labelHi: "डैशबोर्ड",  labelMr: "डॅशबोर्ड" },
  { path: "/applications",      icon: "📋", labelEn: "Applicants",labelHi: "आवेदक",    labelMr: "अर्जदार" },
];

// Pages where bottom nav should NOT show
const HIDE_ON = ["/onboarding", "/worker-login", "/navigate"];

export default function BottomNav() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { language } = useLanguage();

  const isWorker   = !!localStorage.getItem("worker");
  const isEmployer = !!localStorage.getItem("employerToken");

  // Hide on certain pages
  if (HIDE_ON.some(p => location.pathname.startsWith(p))) return null;
  // Hide if nobody is logged in
  if (!isWorker && !isEmployer) return null;

  const tabs   = isWorker ? WORKER_TABS : EMPLOYER_TABS;
  const getLabel = (tab) =>
    language === "hi" ? tab.labelHi : language === "mr" ? tab.labelMr : tab.labelEn;

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Spacer so content doesn't hide behind nav */}
      <div style={{ height: 70 }} />

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: "#fff",
        borderTop: "1px solid #f0f0f0",
        boxShadow: "0 -4px 20px rgba(0,0,0,.08)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)", // iPhone notch support
        fontFamily: "sans-serif",
      }}>
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                padding: "10px 4px 8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <div style={{
                  position: "absolute", top: 6, width: 4, height: 4,
                  borderRadius: "50%", background: "#006491",
                }} />
              )}
              <span style={{
                fontSize: 22,
                filter: active ? "none" : "grayscale(1) opacity(0.5)",
                transition: "all .2s",
                transform: active ? "scale(1.15)" : "scale(1)",
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 400,
                color: active ? "#006491" : "#9ca3af",
                transition: "all .2s",
              }}>
                {getLabel(tab)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}