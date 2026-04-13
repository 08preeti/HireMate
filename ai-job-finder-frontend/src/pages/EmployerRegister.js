import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function EmployerRegister() {
  const { language } = useLanguage();
  const t = translations[language];
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${BASE}/api/employer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      navigate("/employer-login");
    } catch { alert("Registration Error"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 16 }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.1)", width: "100%", maxWidth: 400 }}>
        <h2 style={{ textAlign: "center", color: "#006491", fontWeight: 800, fontSize: 22, marginBottom: 24 }}>
          {t.employerRegister}
        </h2>
        <form onSubmit={submit}>
          <input
            placeholder={t.companyName} required
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: "border-box" }}
          />
          <input
            type="email" placeholder={t.email} required
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: "border-box" }}
          />
          <input
            type="password" placeholder={t.password} required
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 16, boxSizing: "border-box" }}
          />
          <button
            disabled={loading}
            style={{ width: "100%", padding: "13px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
          >
            {loading ? "..." : t.register}
          </button>
        </form>
      </div>
    </div>
  );
}