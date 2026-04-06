/* import { useEffect, useState } from "react";
import axios from "axios";

export default function WorkerProfile() {

  const [worker, setWorker] = useState(null);
  const [location, setLocation] = useState("");

  const savedWorker = JSON.parse(localStorage.getItem("worker"));

  // 1️⃣ Fetch worker (ONLY once)
useEffect(() => {

  if (savedWorker) {
    axios.get(
      `http://localhost:5000/api/workers/profile/${savedWorker._id}`
    )
    .then(res => {
      setWorker(res.data);
    })
    .catch(err => console.log(err));
  }

}, [savedWorker]);


// 2️⃣ Set location when worker loads
const [isLocationSet, setIsLocationSet] = useState(false);

useEffect(() => {
  if (worker && !isLocationSet) {
    setLocation(worker.location);
    setIsLocationSet(true);
  }
}, [worker, isLocationSet]);


  const updateLocation = async () => {

    try {

      const res = await axios.put(
        `http://localhost:5000/api/workers/update/${savedWorker._id}`,
        { location }
      );

      setWorker(res.data);

      // ✅ update localStorage also
      localStorage.setItem("worker", JSON.stringify(res.data));

      alert("Location updated successfully!");

    } catch (err) {

      console.log(err);
      alert("Update failed");

    }

  };


  if (!savedWorker) {
    return <h2 style={{ padding: "20px" }}>No Worker Found</h2>;
  }

  if (!worker) {
    return <h2 style={{ padding: "20px" }}>Loading...</h2>;
  }


  return (

    <div style={{ padding: "30px" }}>

      <h2>Worker Profile</h2>

      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        width: "350px"
      }}>

        <p><b>Name:</b> {worker.name}</p>
        <p><b>Skills:</b> {worker.skills}</p>

        
        <p><b>Location:</b></p>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter new location"
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "10px"
          }}
        />

        <button
          onClick={updateLocation}
          style={{
            padding: "8px 15px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Update Location
        </button>

        <p style={{ marginTop: "10px" }}>
          <b>Phone:</b> {worker.phone}
        </p>

        <hr />

        <p><b>⭐ Rating:</b> {worker.rating}</p>
        <p><b>📝 Reviews:</b> {worker.totalReviews}</p>

      </div>

    </div>

  );

}  */

  //------------------------

/*  import React from "react";

export default function WorkerProfile() {
  const { language } = useLanguage();
  const t = translations[language];

const worker = JSON.parse(localStorage.getItem("worker"));

if (!worker) {
return <h2 style={{padding:"20px"}}>No Worker Found</h2>;
}

return (

<div style={{padding:"30px"}}>

<h2>Worker Profile</h2>

<div style={{
background:"#fff",
padding:"20px",
borderRadius:"8px",
boxShadow:"0 0 10px rgba(0,0,0,0.1)",
width:"350px"
}}>

<p><b>Name:</b> {worker.name}</p>

<p><b>Skills:</b> {worker.skills}</p>

<p><b>Location:</b> {worker.location}</p>

<p><b>Phone:</b> {worker.contact}</p>

<p><b>Phone:</b> {worker.phone || worker.contact}</p>

</div>

</div>

);

}   */


/*import { useEffect, useState } from "react";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

export default function WorkerProfile() {
  const { language } = useLanguage();
  const t = translations[language];

const [worker,setWorker] = useState(null);

const savedWorker = JSON.parse(localStorage.getItem("worker"));

useEffect(()=>{

if(savedWorker){

axios.get(
`http://localhost:5000/api/workers/profile/${savedWorker._id}`
)

.then(res=>{
setWorker(res.data);
})

.catch(err=>{
console.log(err);
});

}

},[savedWorker]);


if(!savedWorker){
return <h2 style={{padding:"20px"}}>No Worker Found</h2>;
}


if(!worker){
return <h2 style={{padding:"20px"}}>Loading...</h2>;
}


return(

<div style={{padding:"30px"}}>

<h2>Worker Profile</h2>

<div style={{

background:"#fff",
padding:"20px",
borderRadius:"8px",
boxShadow:"0 0 10px rgba(0,0,0,0.1)",
width:"350px"

}}>

<p><b>Name:</b> {worker.name}</p>

<p><b>Skills:</b> {worker.skills}</p>

<p><b>Location:</b> {worker.location}</p>

<p><b>Phone:</b> {worker.phone}</p>

<hr/>

<p><b>⭐ Rating:</b> {worker.rating}</p>

<p><b>📝 Reviews:</b> {worker.totalReviews}</p>

</div>

</div>

);

} */


//-----------------------------------------
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
  return found ? found.emoji : "💼";
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
  const navigate         = useNavigate();
  const { language }     = useLanguage();
  const t                = translations[language];

  const [worker, setWorker]       = useState(null);
  const [editing, setEditing]     = useState(false);
  const [editSkill, setEditSkill] = useState(false);
  const [form, setForm]           = useState({ name: "", location: "", skills: "" });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const savedWorker = JSON.parse(localStorage.getItem("worker") || "null");

  useEffect(() => {
    if (!savedWorker) return;
    fetch(`${BASE}/api/workers/profile/${savedWorker._id}`)
      .then(r => r.json())
      .then(data => {
        setWorker(data);
        setForm({ name: data.name || "", location: data.location || "", skills: data.skills || "" });
      })
      .catch(() => {
        setWorker(savedWorker);
        setForm({ name: savedWorker.name || "", location: savedWorker.location || "", skills: savedWorker.skills || "" });
      });
  }, []); // eslint-disable-line

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${BASE}/api/workers/update/${worker._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...worker, ...form };
        setWorker(updated);
        localStorage.setItem("worker", JSON.stringify({ ...savedWorker, ...form }));
        setEditing(false);
        setEditSkill(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert(data.message || t.updateFailed);
      }
    } catch { alert(t.updateFailed); }
    setSaving(false);
  };

  if (!savedWorker) return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>👷</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>{t.noWorkerFound}</div>
      <a href="/worker-login" style={{ background: "#006491", color: "#fff", padding: "13px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
        {language === "hi" ? "लॉगिन करें" : language === "mr" ? "लॉगिन करा" : "Login / Register"}
      </a>
    </div>
  );

  if (!worker) return <div style={{ padding: 40, textAlign: "center" }}>{t.loading}</div>;

  const rating       = parseFloat(worker.rating) || 0;
  const totalReviews = worker.totalReviews || 0;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>

      {/* Save toast */}
      {saved && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#fff", borderRadius: 10, padding: "10px 24px", fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
          ✅ {t.locationUpdated}
        </div>
      )}

      {/* Profile card */}
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,.09)", overflow: "hidden", marginBottom: 14 }}>

        {/* Banner */}
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", padding: "28px 20px", color: "#fff", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, margin: "0 auto 12px", border: "3px solid rgba(255,255,255,.3)" }}>
            {getSkillEmoji(worker.skills)}
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

        <div style={{ padding: 20 }}>

          {/* Skill section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>{t.skills}</div>
            {editSkill ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                  {SKILL_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => setForm({...form, skills: s.value})}
                      style={{ padding: "8px 4px", borderRadius: 10, border: `2px solid ${form.skills === s.value ? "#006491" : "#e5e7eb"}`, background: form.skills === s.value ? "#e8f4f8" : "#f9fafb", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 20 }}>{s.emoji}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: form.skills === s.value ? "#006491" : "#6b7280", textAlign: "center" }}>{s.value}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{getSkillEmoji(worker.skills)}</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{worker.skills || "—"}</span>
                <button onClick={() => setEditSkill(true)} style={{ marginLeft: "auto", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#006491", fontWeight: 600 }}>
                  ✏️ {t.edit}
                </button>
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "12px 0" }} />

          {/* Location section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>{t.location}</div>
            {editing ? (
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                placeholder={t.enterNewLocation}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #006491", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>📍 {worker.location || "—"}</span>
                <button onClick={() => setEditing(true)} style={{ marginLeft: "auto", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#006491", fontWeight: 600 }}>
                  ✏️ {t.edit}
                </button>
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "12px 0" }} />

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "#fffbeb", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{rating > 0 ? rating : "—"}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>⭐ {t.rating}</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{totalReviews}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📋 {t.reviews}</div>
            </div>
          </div>

          {/* Save / Cancel */}
          {(editing || editSkill) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setEditing(false); setEditSkill(false); setForm({ name: worker.name||"", location: worker.location||"", skills: worker.skills||"" }); }}
                style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>{t.cancel}</button>
              <button onClick={saveProfile} disabled={saving}
                style={{ flex: 2, padding: "11px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                {saving ? t.saving : `💾 ${t.save}`}
              </button>
            </div>
          )}

          {/* Quick links */}
          {!editing && !editSkill && (
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/jobs" style={{ flex: 1, padding: "11px 0", background: "#006491", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center" }}>
                🔍 {t.browseJobs}
              </a>
              <a href="/my-jobs" style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", color: "#374151", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center" }}>
                📋 {t.myJobs}
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