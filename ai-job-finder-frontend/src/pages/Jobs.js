/*import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getJobIcon = (title) => {
  if (!title) return "💼";
  const t = title.toLowerCase();
  if (t.includes("electric"))                    return "⚡";
  if (t.includes("driver") || t.includes("auto")) return "🚗";
  if (t.includes("plumb"))                       return "🔧";
  if (t.includes("clean") || t.includes("sweep")) return "🧹";
  if (t.includes("cook") || t.includes("chef"))  return "🍳";
  if (t.includes("security") || t.includes("guard")) return "🛡️";
  if (t.includes("helper") || t.includes("labour")) return "👷";
  if (t.includes("deliver"))                     return "📦";
  if (t.includes("paint"))                       return "🎨";
  if (t.includes("carpenter"))                   return "🪚";
  if (t.includes("maid") || t.includes("house")) return "🏠";
  if (t.includes("garden") || t.includes("mali")) return "🌿";
  if (t.includes("mason") || t.includes("construct")) return "🏗️";
  if (t.includes("mechanic"))                    return "⚙️";
  if (t.includes("waiter"))                      return "🍽️";
  if (t.includes("weld"))                        return "🔥";
  return "💼";
};

// Format salary with per-day/month label
function SalaryBadge({ salary, language }) {
  if (!salary) return null;
  const s = Number(salary);
  let perLabel = "";
  if (s <= 2000) {
    perLabel = language === "hi" ? "/दिन" : language === "mr" ? "/दिवस" : "/day";
  } else if (s <= 20000) {
    perLabel = language === "hi" ? "/महीना" : language === "mr" ? "/महिना" : "/month";
  } else {
    perLabel = language === "hi" ? "/काम" : language === "mr" ? "/काम" : "/job";
  }
  return (
    <span style={{ fontWeight: 800, fontSize: 16, color: "#E8002A" }}>
      ₹{salary}<span style={{ fontSize: 11, fontWeight: 500, color: "#888" }}>{perLabel}</span>
    </span>
  );
}

// WhatsApp share
function shareOnWhatsApp(job, language) {
  const title    = job.jobTitle?.[language] || job.jobTitle?.en || "Job";
  const location = job.location?.[language] || job.location?.en || "";
  const salary   = job.salary ? `₹${job.salary}` : "";
  const text     = `🔔 *${title}* नोकरी उपलब्ध!\n📍 ${location}\n💰 ${salary}\n\nHireMate वर पहा: http://localhost:3000/jobs`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export default function Jobs() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const navigate              = useNavigate();
  const { language }          = useLanguage();
  const t                     = translations[language];

  useEffect(() => {
    axios.get(`${BASE}/api/jobs`)
      .then((res) => { setJobs(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((job) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (job.jobTitle?.[language] || "").toLowerCase().includes(s) ||
      (job.location?.[language] || "").toLowerCase().includes(s) ||
      (job.skills?.[language]   || "").toLowerCase().includes(s)
    );
  });

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", fontSize: 16, color: "#6b7280" }}>
      {t.loading}
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>

      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#006491", margin: 0 }}>
          {t.availableJobs}
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === "hi" ? "नौकरी खोजें…" : language === "mr" ? "नोकरी शोधा…" : "Search jobs…"}
          style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", minWidth: 200 }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600 }}>{t.noJobs}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {filtered.map((job) => (
          <div key={job._id} style={{
            width: 320, background: "#fff", borderRadius: 16,
            boxShadow: "0 2px 14px rgba(0,0,0,.09)",
            border: "1px solid #f0f0f0", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>

            
            {job.isUrgent && (
              <div style={{ background: "#E8002A", color: "#fff", padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
                🚨 {t.urgent} — {language === "hi" ? "आज ही काम चाहिए" : language === "mr" ? "आजच कामगार हवा" : "Hiring Today"}
              </div>
            )}

            <div style={{ padding: 18, flex: 1 }}>
              
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#111" }}>
                {getJobIcon(job.jobTitle?.[language])} {job.jobTitle?.[language]}
              </h3>

              
              <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0" }}>
                📍 {job.location?.[language]}
              </p>

              
              <p style={{ fontSize: 13, margin: "4px 0", color: "#374151" }}>
                🛠️ {job.skills?.[language]}
              </p>

              
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                <SalaryBadge salary={job.salary} language={language} />
                {job.paymentMethod && (
                  <span style={{ background: job.paymentMethod === "Cash" ? "#d1fae5" : "#e0f2fe", color: job.paymentMethod === "Cash" ? "#065f46" : "#0c4a6e", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                    {job.paymentMethod === "Cash" ? "💵" : job.paymentMethod === "UPI" ? "📱" : "🤝"} {job.paymentMethod}
                  </span>
                )}
              </div>

              
              {job.rating > 0 && (
                <p style={{ fontSize: 12, margin: "4px 0", color: "#f59e0b" }}>
                  ⭐ {job.rating} ({job.totalReviews} {t.reviews})
                </p>
              )}
            </div>

            
            <div style={{ padding: "0 18px 18px", display: "flex", gap: 8 }}>
              
              <button
                onClick={() => navigate(`/jobs/${job._id}`)}
                style={{ flex: 2, padding: "11px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {t.viewDetails}
              </button>

              
              {job.contactInfo && (
                <a
                  href={`tel:${job.contactInfo}`}
                  style={{ flex: 1, padding: "11px 0", background: "#10b981", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title={language === "hi" ? "कॉल करें" : language === "mr" ? "कॉल करा" : "Call Employer"}
                >
                  📞
                </a>
              )}

              
              <button
                onClick={() => shareOnWhatsApp(job, language)}
                style={{ flex: 1, padding: "11px 0", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title={language === "hi" ? "WhatsApp पर शेयर करें" : language === "mr" ? "WhatsApp वर शेअर करा" : "Share on WhatsApp"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}  */




//----------------------


import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getJobIcon = (title) => {
  if (!title) return "💼";
  const t = title.toLowerCase();
  if (t.includes("electric"))                    return "⚡";
  if (t.includes("driver") || t.includes("auto")) return "🚗";
  if (t.includes("plumb"))                       return "🔧";
  if (t.includes("clean") || t.includes("sweep")) return "🧹";
  if (t.includes("cook") || t.includes("chef"))  return "🍳";
  if (t.includes("security") || t.includes("guard")) return "🛡️";
  if (t.includes("helper") || t.includes("labour")) return "👷";
  if (t.includes("deliver"))                     return "📦";
  if (t.includes("paint"))                       return "🎨";
  if (t.includes("carpenter"))                   return "🪚";
  if (t.includes("maid") || t.includes("house")) return "🏠";
  if (t.includes("garden") || t.includes("mali")) return "🌿";
  if (t.includes("mason") || t.includes("construct")) return "🏗️";
  if (t.includes("mechanic"))                    return "⚙️";
  if (t.includes("waiter"))                      return "🍽️";
  if (t.includes("weld"))                        return "🔥";
  return "💼";
};

// Format salary with per-day/month label
function SalaryBadge({ salary, language }) {
  if (!salary) return null;
  const s = Number(salary);
  let perLabel = "";
  if (s <= 2000) {
    perLabel = language === "hi" ? "/दिन" : language === "mr" ? "/दिवस" : "/day";
  } else if (s <= 20000) {
    perLabel = language === "hi" ? "/महीना" : language === "mr" ? "/महिना" : "/month";
  } else {
    perLabel = language === "hi" ? "/काम" : language === "mr" ? "/काम" : "/job";
  }
  return (
    <span style={{ fontWeight: 800, fontSize: 16, color: "#E8002A" }}>
      ₹{salary}<span style={{ fontSize: 11, fontWeight: 500, color: "#888" }}>{perLabel}</span>
    </span>
  );
}

// WhatsApp share
function shareOnWhatsApp(job, language) {
  const title    = job.jobTitle?.[language] || job.jobTitle?.en || "Job";
  const location = job.location?.[language] || job.location?.en || "";
  const salary   = job.salary ? `₹${job.salary}` : "";
  const text     = `🔔 *${title}* नोकरी उपलब्ध!\n📍 ${location}\n💰 ${salary}\n\nHireMate वर पहा: https://hiremate-brown.vercel.app/jobs`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export default function Jobs() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const navigate              = useNavigate();
  const { language }          = useLanguage();
  const t                     = translations[language];

  useEffect(() => {
    axios.get(`${BASE}/api/jobs`)
      .then((res) => { setJobs(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((job) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (job.jobTitle?.[language] || "").toLowerCase().includes(s) ||
      (job.location?.[language] || "").toLowerCase().includes(s) ||
      (job.skills?.[language]   || "").toLowerCase().includes(s)
    );
  });

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", fontSize: 16, color: "#6b7280" }}>
      {t.loading}
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>

      {/* Header + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#006491", margin: 0 }}>
          {t.availableJobs}
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === "hi" ? "नौकरी खोजें…" : language === "mr" ? "नोकरी शोधा…" : "Search jobs…"}
          style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", minWidth: 200 }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600 }}>{t.noJobs}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {filtered.map((job) => (
          <div key={job._id} style={{
            width: 320, background: "#fff", borderRadius: 16,
            boxShadow: "0 2px 14px rgba(0,0,0,.09)",
            border: "1px solid #f0f0f0", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>

            {/* Urgent banner */}
            {job.isUrgent && (
              <div style={{ background: "#E8002A", color: "#fff", padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
                🚨 {t.urgent} — {language === "hi" ? "आज ही काम चाहिए" : language === "mr" ? "आजच कामगार हवा" : "Hiring Today"}
              </div>
            )}

            <div style={{ padding: 18, flex: 1 }}>
              {/* Title */}
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#111" }}>
                {getJobIcon(job.jobTitle?.[language])} {job.jobTitle?.[language]}
              </h3>

              {/* Location */}
              <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0" }}>
                📍 {job.location?.[language]}
              </p>

              {/* Skills */}
              <p style={{ fontSize: 13, margin: "4px 0", color: "#374151" }}>
                🛠️ {job.skills?.[language]}
              </p>

              {/* Salary + Payment */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                <SalaryBadge salary={job.salary} language={language} />
                {job.paymentMethod && (
                  <span style={{ background: job.paymentMethod === "Cash" ? "#d1fae5" : "#e0f2fe", color: job.paymentMethod === "Cash" ? "#065f46" : "#0c4a6e", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                    {job.paymentMethod === "Cash" ? "💵" : job.paymentMethod === "UPI" ? "📱" : "🤝"} {job.paymentMethod}
                  </span>
                )}
              </div>

              {/* Rating */}
              {job.rating > 0 && (
                <p style={{ fontSize: 12, margin: "4px 0", color: "#f59e0b" }}>
                  ⭐ {job.rating} ({job.totalReviews} {t.reviews})
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ padding: "0 18px 18px", display: "flex", gap: 8 }}>
              {/* View details */}
              <button
                onClick={() => navigate(`/jobs/${job._id}`)}
                style={{ flex: 2, padding: "11px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {t.viewDetails}
              </button>

              {/* Call button */}
              {job.contactInfo && (
                <a
                  href={`tel:${job.contactInfo}`}
                  style={{ flex: 1, padding: "11px 0", background: "#10b981", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title={language === "hi" ? "कॉल करें" : language === "mr" ? "कॉल करा" : "Call Employer"}
                >
                  📞
                </a>
              )}

              {/* WhatsApp share */}
              <button
                onClick={() => shareOnWhatsApp(job, language)}
                style={{ flex: 1, padding: "11px 0", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title={language === "hi" ? "WhatsApp पर शेयर करें" : language === "mr" ? "WhatsApp वर शेअर करा" : "Share on WhatsApp"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}