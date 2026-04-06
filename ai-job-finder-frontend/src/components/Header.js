/* import { Link, useLocation, useNavigate } from "react-router-dom";
// ✅ FIXED: now reads language from context — no more prop drilling from App.js
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  const isActive = (path) =>
    location.pathname === path
      ? "bg-yellow-400 text-black"
      : "text-white hover:text-gray-200";

  const logout = () => {
    // ✅ FIXED: clears both token keys so logout works cleanly
    localStorage.removeItem("employerToken");
    localStorage.removeItem("employerId");
    navigate("/employer-login");
  };

  return (
    <div className="bg-[#006491] px-6 py-4 flex items-center justify-between">
      
      <div className="flex items-center gap-3">
        <div className="bg-white text-[#006491] font-bold px-2 py-1 rounded">HM</div>
        <span className="text-white text-xl font-bold">HireMate</span>
      </div>

      
      <div className="flex items-center gap-6">
        <Link className={isActive("/")} to="/">{t.home}</Link>
        <Link className={isActive("/jobs")} to="/jobs">{t.jobs}</Link>
        <Link className={isActive("/applications")} to="/applications">{t.applications}</Link>
        <Link className={isActive("/worker-dashboard")} to="/worker-dashboard">Worker Dashboard</Link>
        <Link className={isActive("/worker-profile")} to="/worker-profile">Worker Profile</Link>
        <Link
          to="/employer-dashboard"
          className={`px-4 py-1 rounded font-semibold ${isActive("/employer-dashboard")}`}
        >
          {t.dashboard}
        </Link>

        
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-2 py-1 rounded text-black"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
        </select>

        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-1 rounded"
        >
          {t.logout}
        </button>
      </div>
    </div>
  );
}   */


 //-----------------
/*import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

export default function Header() {
  const location                  = useLocation();
  const navigate                  = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t                         = translations[language];

  const isActive = (path) =>
    location.pathname === path
      ? "bg-yellow-400 text-black"
      : "text-white hover:text-gray-200";

  const logout = () => {
    localStorage.removeItem("employerToken");
    localStorage.removeItem("employerId");
    navigate("/employer-login");
  };

  return (
    <div className="bg-[#006491] px-6 py-4 flex items-center justify-between flex-wrap gap-2">

      
      <div className="flex items-center gap-3">
        <div className="bg-white text-[#006491] font-bold px-2 py-1 rounded">HM</div>
        <span className="text-white text-xl font-bold">HireMate</span>
      </div>

      
      <div className="flex items-center gap-4 flex-wrap">
        <Link className={isActive("/")} to="/">{t.home}</Link>
        <Link className={isActive("/jobs")} to="/jobs">{t.jobs}</Link>
        <Link className={isActive("/applications")} to="/applications">{t.applications}</Link>
        <Link className={isActive("/worker-dashboard")} to="/worker-dashboard">{t.workerDashboard}</Link>
        <Link className={isActive("/worker-profile")} to="/worker-profile">{t.workerProfile}</Link>
        <Link
          className={`px-4 py-1 rounded font-semibold ${isActive("/employer-dashboard")}`}
          to="/employer-dashboard"
        >
          {t.dashboard}
        </Link>

       
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-2 py-1 rounded text-black text-sm"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>

        <button onClick={logout} className="bg-red-500 text-white px-4 py-1 rounded font-semibold">
          {t.logout}
        </button>
      </div>
    </div>
  );
} 
 */







//----------------------new
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

export default function Header() {
  const location                  = useLocation();
  const navigate                  = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t                         = translations[language];

  // Check who is logged in
  const isEmployerLoggedIn = !!localStorage.getItem("employerToken");
  const isWorkerLoggedIn   = !!localStorage.getItem("worker");

  const isActive = (path) =>
    location.pathname === path
      ? { background: "#fbbf24", color: "#000", borderRadius: 6, padding: "4px 10px", fontWeight: 700, textDecoration: "none", fontSize: 14 }
      : { color: "#fff", textDecoration: "none", fontSize: 14, padding: "4px 6px" };

  const logoutEmployer = () => {
    localStorage.removeItem("employerToken");
    localStorage.removeItem("employerId");
    navigate("/employer-login");
  };

  const logoutWorker = () => {
    localStorage.removeItem("worker");
    navigate("/worker-login");
  };

  return (
    <div style={{ background: "#006491", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontFamily: "sans-serif" }}>

      {/* Logo */}
      <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div style={{ background: "#fff", color: "#006491", fontWeight: 800, padding: "4px 8px", borderRadius: 6, fontSize: 14 }}>HM</div>
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>HireMate</span>
      </a>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>

        <Link style={isActive("/")} to="/">{t.home}</Link>
        <Link style={isActive("/jobs")} to="/jobs">{t.jobs}</Link>

        {/* Worker links */}
        <Link style={isActive("/worker-dashboard")} to="/worker-dashboard">{t.workerDashboard}</Link>
        <Link style={isActive("/worker-profile")} to="/worker-profile">{t.workerProfile}</Link>
        <Link style={isActive("/ai-suggestions")} to="/ai-suggestions">🤖 AI</Link>

        {/* Employer links */}
        <Link style={isActive("/applications")} to="/applications">{t.applications}</Link>
        <Link style={isActive("/employer-dashboard")} to="/employer-dashboard">{t.dashboard}</Link>

        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: "4px 8px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer" }}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>

        {/* Worker login/logout */}
        {isWorkerLoggedIn ? (
          <button
            onClick={logoutWorker}
            style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            👷 {language === "hi" ? "लॉगआउट" : language === "mr" ? "लॉगआउट" : "Worker Logout"}
          </button>
        ) : (
          <Link
            to="/worker-login"
            style={{ background: "#fbbf24", color: "#000", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
          >
            👷 {language === "hi" ? "कामगार लॉगिन" : language === "mr" ? "कामगार लॉगिन" : "Worker Login"}
          </Link>
        )}

        {/* Employer logout */}
        {isEmployerLoggedIn ? (
          <button
            onClick={logoutEmployer}
            style={{ background: "#E8002A", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            {t.logout}
          </button>
        ) : (
          <Link
            to="/employer-login"
            style={{ background: "#E8002A", color: "#fff", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
          >
            {language === "hi" ? "नियोक्ता लॉगिन" : language === "mr" ? "नियोक्ता लॉगिन" : "Employer Login"}
          </Link>
        )}
      </div>
    </div>
  );
}