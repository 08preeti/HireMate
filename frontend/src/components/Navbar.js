import { Link, useNavigate } from "react-router-dom";

import { useLanguage } from "./LanguageContext";



export default function Navbar() {
  const navigate = useNavigate();

  const { language, setLanguage } = useLanguage();


  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="bg-[#006491] text-white px-6 py-4 flex justify-between">
      <Link to="/" className="font-bold text-xl">HireMate</Link>

      <div className="flex gap-4">
        <Link to="/jobs">Jobs</Link>
        <Link to="/worker-register">Register as Worker</Link>


        <Link to="/worker-dashboard">Worker Dashboard</Link>


        <Link to="/worker-profile">
          Worker Profile
        </Link>

        <Link to="/my-jobs">My Jobs</Link>

        {token ? (
          <>
            <Link to="/employer-dashboard">Dashboard</Link>
            <button onClick={logout} className="bg-red-500 px-3 rounded">
              Logout
            </button>
          </>
        ) : (
          <Link to="/employer-login">Employer Login</Link>
        )}
      </div>
    </nav>
  );
}
