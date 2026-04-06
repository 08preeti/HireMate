/*import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WorkerRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    skills: "",
    location: "",
    contact: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/workers/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      // ✅ Save worker locally (auto-login style)
      localStorage.setItem("worker", JSON.stringify(data));

      alert("Worker registered successfully ✅");
      navigate("/jobs");
    } catch (err) {
      alert("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">
          Worker Registration
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Your Name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <input
            name="skills"
            placeholder="Your Skill (e.g. Gardener, Plumber)"
            value={form.skills}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <input
            name="location"
            placeholder="Your Location"
            value={form.location}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <input
            name="contact"
            placeholder="Phone Number"
            required
            value={form.contact}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}  */




//-------------
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function WorkerRegister() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const [form, setForm]     = useState({ name: "", skills: "", location: "", contact: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || t.updateFailed); setLoading(false); return; }
      localStorage.setItem("worker", JSON.stringify(data));
      alert(t.registeredSuccess);
      navigate("/jobs");
    } catch { alert("Server error"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 16 }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.1)", width: "100%", maxWidth: 420 }}>
        <h2 style={{ textAlign: "center", color: "#006491", fontWeight: 800, fontSize: 22, marginBottom: 24 }}>
          {t.workerRegistration}
        </h2>

        <form onSubmit={handleSubmit}>
          {[
            { name: "name",     placeholder: t.yourName,     required: true },
            { name: "skills",   placeholder: t.yourSkill,    required: false },
            { name: "location", placeholder: t.yourLocation, required: false },
            { name: "contact",  placeholder: t.phoneNumber,  required: true },
          ].map((field) => (
            <input
              key={field.name}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              value={form[field.name]}
              onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: "border-box" }}
            />
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "13px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t.registering : t.register}
          </button>
        </form>
      </div>
    </div>
  );
}