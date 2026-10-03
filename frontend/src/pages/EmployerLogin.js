import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "../components/Toast";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function EmployerLogin() {
  const { language }      = useLanguage();
  const [form, setForm]   = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate          = useNavigate();

  const labels = {
    en: { title: "Employer Login", email: "Email", password: "Password", login: "Login", loggingIn: "Logging in...", noAccount: "New employer?", register: "Create Account", error: "Login Failed" },
    hi: { title: "नियोक्ता लॉगिन", email: "ईमेल", password: "पासवर्ड", login: "लॉगिन", loggingIn: "लॉगिन हो रहा है...", noAccount: "नया नियोक्ता?", register: "अकाउंट बनाएं", error: "लॉगिन विफल" },
    mr: { title: "नियोक्ता लॉगिन", email: "ईमेल", password: "पासवर्ड", login: "लॉगिन", loggingIn: "लॉगिन होत आहे...", noAccount: "नवीन नियोक्ता?", register: "खाते तयार करा", error: "लॉगिन अयशस्वी" },
  };
  const t = labels[language] || labels.en;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/employer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        toast(data.error || t.error, "error");
        setLoading(false);
        return;
      }
      localStorage.setItem("employerToken", data.token);
      localStorage.setItem("employerId", data.employer._id);
      navigate("/employer-dashboard");
    } catch {
      toast("Login Error — please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.1)", width: "100%", maxWidth: 420, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", padding: "28px 24px", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏢</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{t.title}</div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
            {language === "hi" ? "अपने खाते में लॉगिन करें" : language === "mr" ? "तुमच्या खात्यात लॉगिन करा" : "Login to manage your jobs"}
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <form onSubmit={submit}>
            <input
              type="email" placeholder={t.email} required
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none" }}
            />
            <input
              type="password" placeholder={t.password} required
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 20, boxSizing: "border-box", outline: "none" }}
            />
            <button disabled={loading}
              style={{ width: "100%", padding: "14px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? t.loggingIn : t.login}
            </button>
          </form>

          {/* Register link */}
          <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 14, color: "#6b7280" }}>{t.noAccount} </span>
            <Link to="/employer-register" style={{ fontSize: 14, fontWeight: 700, color: "#006491", textDecoration: "none" }}>
              {t.register} →
            </Link>
          </div>

          {/* Demo credentials hint */}
          <div style={{ marginTop: 12, background: "#f0f9ff", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#0c4a6e", textAlign: "center" }}>
            🔧 Demo: <b>demo@hiremate.com</b> / <b>demo1234</b>
          </div>
        </div>
      </div>
    </div>
  );
}