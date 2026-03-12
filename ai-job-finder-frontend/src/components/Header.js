import { Link, useLocation, useNavigate } from "react-router-dom";

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
      
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <div className="bg-white text-[#006491] font-bold px-2 py-1 rounded">
          HM
        </div>
        <span className="text-white text-xl font-bold">HireMate</span>
      </div>

      {/* RIGHT */}
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

{/* ⭐ ADD WORKER DASHBOARD */}
<Link className={isActive("/worker-dashboard")} to="/worker-dashboard">
  Worker Dashboard
</Link>

{/* ⭐ ADD WORKER PROFILE */}
<Link className={isActive("/worker-profile")} to="/worker-profile">
  Worker Profile
</Link>

<Link
to="/employer-dashboard"
className={`px-4 py-1 rounded font-semibold ${isActive("/employer-dashboard")}`}
>
{t.dashboard}
</Link>

        {/* 🌍 Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          //className="px-2 py-1 rounded text-black"
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
