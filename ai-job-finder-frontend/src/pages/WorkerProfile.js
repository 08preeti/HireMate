import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SKILL_OPTIONS = [
  { value: "Electrician",    emoji: "⚡" }, { value: "Plumber",       emoji: "🔧" },
  { value: "Cook",           emoji: "🍳" }, { value: "Driver",        emoji: "🚗" },
  { value: "Carpenter",      emoji: "🪚" }, { value: "Painter",       emoji: "🎨" },
  { value: "Cleaner",        emoji: "🧹" }, { value: "Security Guard",emoji: "🛡️" },
  { value: "Gardener",       emoji: "🌿" }, { value: "Delivery Boy",  emoji: "📦" },
  { value: "Mechanic",       emoji: "⚙️" }, { value: "Mason",         emoji: "🏗️" },
  { value: "House Maid",     emoji: "🏠" }, { value: "Waiter",        emoji: "🍽️" },
  { value: "Helper",         emoji: "👷" }, { value: "Welder",        emoji: "🔥" },
];

function getSkillEmoji(skill) {
  const found = SKILL_OPTIONS.find(s => s.value.toLowerCase() === (skill || "").toLowerCase());
  return found ? found.emoji : "👷";
}

function StarRating({ rating }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 20, color: i <= Math.round(rating) ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
    </div>
  );
}

export default function WorkerProfile() {
  const navigate       = useNavigate();
  const { language }   = useLanguage();
  const t              = translations[language];

  const [worker, setWorker]           = useState(null);
  const [editing, setEditing]         = useState(false);
  const [editSkill, setEditSkill]     = useState(false);
  const [form, setForm]               = useState({ name: "", location: "", skills: "" });
  const [saving, setSaving]           = useState(false);
  const [photo, setPhoto]             = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const savedWorker = JSON.parse(localStorage.getItem("worker") || "null");
    if (!savedWorker) { navigate("/worker-login"); return; }

    // Try to load full profile from backend
    const id = savedWorker._id || savedWorker.id;
    if (id) {
      fetch(`${BASE}/api/workers/profile/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data && data._id) {
            setWorker(data);
            setForm({ name: data.name || "", location: data.location || "", skills: data.skills || "" });
          } else {
            setWorker(savedWorker);
            setForm({ name: savedWorker.name || "", location: savedWorker.location || "", skills: savedWorker.skills || "" });
          }
        })
        .catch(() => {
          setWorker(savedWorker);
          setForm({ name: savedWorker.name || "", location: savedWorker.location || "", skills: savedWorker.skills || "" });
        });
    } else {
      setWorker(savedWorker);
      setForm({ name: savedWorker.name || "", location: savedWorker.location || "", skills: savedWorker.skills || "" });
    }

    // Load saved photo
    const photoKey = `workerPhoto_${savedWorker._id || savedWorker.phone}`;
    const savedPhoto = localStorage.getItem(photoKey);
    if (savedPhoto) setPhoto(savedPhoto);
  }, [navigate]);

  // Photo upload handler
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB"); return; }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setPhoto(base64);
      const key = `workerPhoto_${worker?._id || worker?.phone}`;
      localStorage.setItem(key, base64);
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const id = worker._id || worker.id;
      const res = await fetch(`${BASE}/api/workers/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...worker, ...form };
        setWorker(updated);
        localStorage.setItem("worker", JSON.stringify(updated));
        setEditing(false);
        setEditSkill(false);
      } else {
        alert(data.message || "Update failed");
      }
    } catch { alert("Update failed"); }
    setSaving(false);
  };

  if (!worker) return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 16 }}>
      Loading profile…
    </div>
  );

  const rating      = parseFloat(worker.rating) || 0;
  const totalReviews = worker.totalReviews || 0;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 80px", fontFamily: "sans-serif" }}>

      {/* Profile Card */}
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,.09)", overflow: "hidden", marginBottom: 14 }}>

        {/* Banner */}
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", padding: "28px 20px", color: "#fff", textAlign: "center" }}>

          {/* Photo with camera button */}
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 12px" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, border: "3px solid rgba(255,255,255,.3)", overflow: "hidden" }}>
              {photo
                ? <img src={photo} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : getSkillEmoji(worker.skills)
              }
            </div>
            <label style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#fbbf24", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13 }}>
              {uploadingPhoto ? "⏳" : "📷"}
              <input type="file" accept="image/*" capture="user" onChange={handlePhotoChange} style={{ display: "none" }} />
            </label>
          </div>

          {editing ? (
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              style={{ fontSize: 18, fontWeight: 700, textAlign: "center", background: "rgba(255,255,255,.2)", border: "2px solid rgba(255,255,255,.5)", borderRadius: 8, color: "#fff", padding: "6px 12px", width: "100%", boxSizing: "border-box" }} />
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800 }}>{worker.name}</div>
          )}

          <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>📱 {worker.phone}</div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10 }}>
            <StarRating rating={rating} />
            <span style={{ fontSize: 13, opacity: .9 }}>
              {rating > 0 ? `${rating}/5 (${totalReviews})` : (language === "hi" ? "अभी कोई रेटिंग नहीं" : language === "mr" ? "अजून रेटिंग नाही" : "No ratings yet")}
            </span>
          </div>
        </div>

        {/* Info section */}
        <div style={{ padding: "20px" }}>

          {/* Current skill */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "12px 14px", background: "#f0f9ff", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>{getSkillEmoji(worker.skills)}</span>
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>
                  {language === "hi" ? "काम" : language === "mr" ? "काम" : "Skill"}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{worker.skills || "—"}</div>
              </div>
            </div>
            <button onClick={() => setEditSkill(v => !v)}
              style={{ padding: "6px 12px", background: editSkill ? "#fee2e2" : "#e8f4f8", color: editSkill ? "#E8002A" : "#006491", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {editSkill ? "✕" : "✏️ Edit"}
            </button>
          </div>

          {/* Skill editor */}
          {editSkill && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {SKILL_OPTIONS.map(skill => (
                  <button key={skill.value} onClick={() => setForm({...form, skills: skill.value})}
                    style={{ padding: "10px 4px", borderRadius: 12, border: `2px solid ${form.skills === skill.value ? "#006491" : "#e5e7eb"}`, background: form.skills === skill.value ? "#e8f4f8" : "#f9fafb", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 22 }}>{skill.emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: form.skills === skill.value ? "#006491" : "#6b7280", textAlign: "center", lineHeight: 1.2 }}>{skill.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>
              {language === "hi" ? "इलाका" : language === "mr" ? "परिसर" : "Location"}
            </div>
            {editing ? (
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                placeholder="e.g. Nashik, Pune"
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
            ) : (
              <div style={{ fontSize: 14, color: "#374151" }}>📍 {worker.location || (language === "hi" ? "स्थान नहीं दिया" : language === "mr" ? "स्थान दिलेले नाही" : "Not provided")}</div>
            )}
          </div>

          {/* Edit / Save buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {editing || editSkill ? (
              <>
                <button onClick={() => { setEditing(false); setEditSkill(false); }}
                  style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                  {t.cancel}
                </button>
                <button onClick={saveProfile} disabled={saving}
                  style={{ flex: 2, padding: "11px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? (t.saving || "Saving…") : `💾 ${t.save}`}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                style={{ flex: 1, padding: "11px 0", background: "#f0f9ff", color: "#006491", border: "1.5px solid #006491", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                ✏️ {language === "hi" ? "नाम/स्थान संपादित करें" : language === "mr" ? "नाव/ठिकाण संपादित करा" : "Edit Name / Location"}
              </button>
            )}
          </div>

          {/* Quick links */}
          {!editing && !editSkill && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <a href="/jobs" style={{ flex: 1, padding: "11px 0", background: "#006491", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center" }}>
                🔍 {t.browseJobs || "Browse Jobs"}
              </a>
              <a href="/my-jobs" style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", color: "#374151", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center" }}>
                📋 {t.myJobs || "My Jobs"}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => { localStorage.removeItem("worker"); navigate("/worker-login"); }}
        style={{ width: "100%", padding: "13px 0", background: "none", border: "2px solid #E8002A", borderRadius: 12, color: "#E8002A", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
      >
        🚪 {language === "hi" ? "लॉगआउट करें" : language === "mr" ? "लॉगआउट करा" : "Logout"}
      </button>
    </div>
  );
}