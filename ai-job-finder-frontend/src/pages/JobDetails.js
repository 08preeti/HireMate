/*
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function JobDetails() {
  const { id } = useParams();
  const { language } = useLanguage();
  const t = translations[language];

  const [job, setJob]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [form, setForm]         = useState({ name: "", contact: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`${BASE}/api/jobs/${id}`)
      .then((res) => { setJob(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!form.name || !form.contact) return alert(t.yourName + " & " + t.phoneNumber + " required");
    setSubmitting(true);
    try {
      await fetch(`${BASE}/api/applications/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName: form.name,
          applicantContact: form.contact,
          message: form.message,
        }),
      });
      alert(t.appliedSuccess);
      setShowApply(false);
    } catch {
      alert("Error submitting application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>{t.loading}</div>;
  if (!job)    return <div style={{ padding: 40, textAlign: "center" }}>{t.jobNotFound}</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 16px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,.09)", padding: 28 }}>

        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#006491", margin: "0 0 6px" }}>
              {job.jobTitle?.[language]}
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
              📍 {job.location?.[language]}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#E8002A" }}>₹{job.salary}</div>
            {job.isUrgent && (
              <span style={{ background: "#E8002A", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                🚨 {t.urgent}
              </span>
            )}
          </div>
        </div>

        
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <b>{t.skills}:</b> {job.skills?.[language]}
          </p>
          {job.description?.en && (
            <p style={{ margin: 0, fontSize: 14 }}>
              <b>{t.description}:</b> {job.description?.[language]}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 14 }}>
            <b>{t.payment}:</b> {job.paymentMethod}
          </p>
          {job.contactInfo && (
            <p style={{ margin: 0, fontSize: 14 }}>
              <b>{t.contact}:</b> {job.contactInfo}
            </p>
          )}
        </div>

        
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowApply(true)}
            style={{ flex: 1, padding: "13px 0", background: "#E8002A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            {t.applyNow}
          </button>
          {job.contactInfo && (
            <a
              href={`tel:${job.contactInfo}`}
              style={{ flex: 1, padding: "13px 0", background: "#10b981", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", textAlign: "center", display: "block" }}
            >
              📞 {t.call}
            </a>
          )}
        </div>
      </div>

      
      {showApply && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>
              {t.applyNow}: {job.jobTitle?.[language]}
            </h3>

            <input
              placeholder={t.yourName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }}
            />
            <input
              placeholder={t.phoneNumber}
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }}
            />
            <textarea
              placeholder={t.message}
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 14, boxSizing: "border-box", resize: "none" }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowApply(false)}
                style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleApply}
                disabled={submitting}
                style={{ flex: 2, padding: "11px 0", background: "#E8002A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
              >
                {submitting ? "..." : t.apply}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}  */



//---------------------------
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function JobDetails() {
  const { id }           = useParams();
  const { language }     = useLanguage();
  const t                = translations[language];

  const [job, setJob]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showApply, setShowApply]   = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm]             = useState({ name: "", contact: "", message: "" });
  const [reportForm, setReportForm] = useState({ reason: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting]   = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    axios.get(`${BASE}/api/jobs/${id}`)
      .then(res => { setJob(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!form.name || !form.contact) return alert("Name and phone required");
    setSubmitting(true);
    try {
      await fetch(`${BASE}/api/applications/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantName: form.name, applicantContact: form.contact, message: form.message }),
      });
      alert(t.appliedSuccess);
      setShowApply(false);
    } catch { alert("Error submitting application"); }
    setSubmitting(false);
  };

  const handleReport = async () => {
    if (!reportForm.reason) return alert("Please select a reason");
    setReporting(true);
    try {
      await fetch(`${BASE}/api/jobs/report/${job._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportForm.reason, reporterPhone: reportForm.phone }),
      });
      setReportDone(true);
      setTimeout(() => { setShowReport(false); setReportDone(false); }, 2000);
    } catch { alert("Could not submit report"); }
    setReporting(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>{t.loading}</div>;
  if (!job)    return <div style={{ padding: 40, textAlign: "center" }}>{t.jobNotFound}</div>;

  const REPORT_REASONS = {
    en: ["Fake job / fraud", "Wrong salary shown", "Employer not responding", "Job already filled", "Inappropriate content"],
    hi: ["फर्जी नौकरी / धोखा", "गलत वेतन दिखाया", "नियोक्ता जवाब नहीं दे रहा", "नौकरी पहले ही भर गई", "अनुचित सामग्री"],
    mr: ["बनावट नोकरी / फसवणूक", "चुकीचा पगार दाखवला", "नियोक्ता प्रतिसाद देत नाही", "नोकरी आधीच भरली", "अयोग्य सामग्री"],
  };
  const reasons = REPORT_REASONS[language] || REPORT_REASONS.en;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 16px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,.09)", padding: 28 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
          <div>
            {job.isUrgent && (
              <span style={{ background: "#E8002A", color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, display: "inline-block", marginBottom: 8 }}>
                🚨 {t.urgent}
              </span>
            )}
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#006491", margin: "0 0 6px" }}>
              {job.jobTitle?.[language]}
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>📍 {job.location?.[language]}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#E8002A" }}>₹{job.salary}</div>
            {job.paymentMethod && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{job.paymentMethod}</div>
            )}
          </div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {job.skills?.[language] && <p style={{ margin: 0, fontSize: 14 }}><b>{t.skills}:</b> {job.skills[language]}</p>}
          {job.description?.[language] && <p style={{ margin: 0, fontSize: 14 }}><b>{t.description}:</b> {job.description[language]}</p>}
          {job.contactInfo && <p style={{ margin: 0, fontSize: 14 }}><b>{t.contact}:</b> {job.contactInfo}</p>}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setShowApply(true)}
            style={{ flex: 2, padding: "13px 0", background: "#E8002A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >{t.applyNow}</button>

          {job.contactInfo && (
            <a href={`tel:${job.contactInfo}`}
              style={{ flex: 1, padding: "13px 0", background: "#10b981", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", textAlign: "center" }}
            >📞 {t.call}</a>
          )}
        </div>

        {/* Report button */}
        <button
          onClick={() => setShowReport(true)}
          style={{ width: "100%", padding: "10px 0", background: "none", border: "1px solid #e5e7eb", borderRadius: 10, color: "#9ca3af", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          🚩 {language === "hi" ? "इस नौकरी की शिकायत करें" : language === "mr" ? "ही नोकरी रिपोर्ट करा" : "Report this job"}
        </button>
      </div>

      {/* Apply Modal */}
      {showApply && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>{t.applyNow}: {job.jobTitle?.[language]}</h3>
            <input placeholder={t.yourName} value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
            <input placeholder={t.phoneNumber} value={form.contact} onChange={e => setForm({...form, contact: e.target.value})}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
            <textarea placeholder={t.message} rows={3} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 14, boxSizing: "border-box", resize: "none" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowApply(false)} style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>{t.cancel}</button>
              <button onClick={handleApply} disabled={submitting} style={{ flex: 2, padding: "11px 0", background: "#E8002A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>{submitting ? "..." : t.apply}</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
            {reportDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {language === "hi" ? "रिपोर्ट दर्ज हुई!" : language === "mr" ? "तक्रार नोंदवली!" : "Report submitted!"}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                  {language === "hi" ? "हम इसकी जांच करेंगे।" : language === "mr" ? "आम्ही तपासणी करू." : "We will review this job."}
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>
                  🚩 {language === "hi" ? "नौकरी की शिकायत" : language === "mr" ? "नोकरी रिपोर्ट" : "Report Job"}
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
                  {language === "hi" ? "समस्या का कारण चुनें:" : language === "mr" ? "समस्येचे कारण निवडा:" : "Select the reason:"}
                </p>

                {reasons.map((r, i) => (
                  <button key={i} onClick={() => setReportForm({...reportForm, reason: r})}
                    style={{ width: "100%", padding: "10px 14px", background: reportForm.reason === r ? "#fee2e2" : "#f9fafb", border: `1.5px solid ${reportForm.reason === r ? "#E8002A" : "#e5e7eb"}`, borderRadius: 10, fontSize: 14, cursor: "pointer", textAlign: "left", marginBottom: 8, color: reportForm.reason === r ? "#E8002A" : "#374151", fontWeight: reportForm.reason === r ? 600 : 400 }}>
                    {reportForm.reason === r ? "● " : "○ "}{r}
                  </button>
                ))}

                <input
                  placeholder={language === "hi" ? "आपका फ़ोन नंबर (वैकल्पिक)" : language === "mr" ? "तुमचा फोन नंबर (पर्यायी)" : "Your phone number (optional)"}
                  value={reportForm.phone}
                  onChange={e => setReportForm({...reportForm, phone: e.target.value})}
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowReport(false)} style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>{t.cancel}</button>
                  <button onClick={handleReport} disabled={reporting || !reportForm.reason}
                    style={{ flex: 2, padding: "11px 0", background: reportForm.reason ? "#E8002A" : "#9ca3af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: reportForm.reason ? "pointer" : "not-allowed" }}>
                    {reporting ? "..." : (language === "hi" ? "शिकायत करें" : language === "mr" ? "तक्रार करा" : "Submit Report")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}