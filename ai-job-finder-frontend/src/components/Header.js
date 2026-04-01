/* import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header({ language, setLanguage, t }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    location.pathname === path
      ? "bg-yellow-400 text-black"
      : "text-white hover:text-gray-200";

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/employer-login");
  };

  return (
    <div className="bg-[#006491] px-6 py-4 flex items-center justify-between">
      
      
      <div className="flex items-center gap-3">
        <div className="bg-white text-[#006491] font-bold px-2 py-1 rounded">
          HM
        </div>
        <span className="text-white text-xl font-bold">HireMate</span>
      </div>

      
      <div className="flex items-center gap-6">

<Link className={isActive("/")} to="/">
  {t.home}
</Link>

<Link className={isActive("/jobs")} to="/jobs">
  {t.jobs}
</Link>

<Link className={isActive("/applications")} to="/applications">
  {t.applications}
</Link>


<Link className={isActive("/worker-dashboard")} to="/worker-dashboard">
  Worker Dashboard
</Link>


<Link className={isActive("/worker-profile")} to="/worker-profile">
  Worker Profile
</Link>

<Link
to="/employer-dashboard"
className={`px-4 py-1 rounded font-semibold ${isActive("/employer-dashboard")}`}
>
{t.dashboard}
</Link>

      
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
         
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



 //--------------------
import { Link, useLocation, useNavigate } from "react-router-dom";
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
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-white text-[#006491] font-bold px-2 py-1 rounded">HM</div>
        <span className="text-white text-xl font-bold">HireMate</span>
      </div>

      {/* Nav */}
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

        {/* Language selector */}
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
}