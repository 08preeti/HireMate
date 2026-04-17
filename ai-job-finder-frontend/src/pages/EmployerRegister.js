import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "../components/Toast";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function EmployerRegister() {
  const { language }      = useLanguage();
  const [form, setForm]   = useState({});
  const [loading, setLoading] = useState(false);
  const navigate          = useNavigate();

  const labels = {
    en: { title: "Create Employer Account", company: "Company / Your Name", email: "Email", password: "Password", register: "Create Account", registering: "Creating...", hasAccount: "Already have an account?", login: "Login", success: "Account created! Please login." },
    hi: { title: "नियोक्ता खाता बनाएं", company: "कंपनी / आपका नाम", email: "ईमेल", password: "पासवर्ड", register: "खाता बनाएं", registering: "बन रहा है...", hasAccount: "पहले से खाता है?", login: "लॉगिन करें", success: "खाता बना! लॉगिन करें।" },
    mr: { title: "नियोक्ता खाते तयार करा", company: "कंपनी / तुमचे नाव", email: "ईमेल", password: "पासवर्ड", register: "खाते तयार करा", registering: "तयार होत आहे...", hasAccount: "आधीच खाते आहे?", login: "लॉगिन करा", success: "खाते तयार! लॉगिन करा." },
  };
  const t = labels[language] || labels.en;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/employer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || data.message || "Registration failed", "error");
        setLoading(false);
        return;
      }
      toast(t.success, "success");
      navigate("/employer-login");
    } catch {
      toast("Registration Error", "error");
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
            {language === "hi" ? "नौकरियां पोस्ट करें और कामगार खोजें" : language === "mr" ? "नोकऱ्या पोस्ट करा आणि कामगार शोधा" : "Post jobs and find workers instantly"}
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <form onSubmit={submit}>
            <input
              placeholder={t.company} required
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none" }}
            />
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
              style={{ width: "100%", padding: "14px 0", background: "#E8002A", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? t.registering : t.register}
            </button>
          </form>

          {/* Login link */}
          <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 14, color: "#6b7280" }}>{t.hasAccount} </span>
            <Link to="/employer-login" style={{ fontSize: 14, fontWeight: 700, color: "#006491", textDecoration: "none" }}>
              {t.login} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}