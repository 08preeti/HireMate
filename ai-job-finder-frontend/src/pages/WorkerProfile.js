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


import { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getInitials(name) {
  if (!name) return "W";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getSkillIcon(skill) {
  if (!skill) return "🛠️";
  const s = skill.toLowerCase();
  if (s.includes("cook") || s.includes("chef")) return "🍳";
  if (s.includes("electric")) return "⚡";
  if (s.includes("plumb")) return "🔧";
  if (s.includes("carpenter")) return "🪚";
  if (s.includes("driver")) return "🚗";
  if (s.includes("paint")) return "🎨";
  if (s.includes("clean")) return "🧹";
  if (s.includes("security") || s.includes("guard")) return "🛡️";
  if (s.includes("garden")) return "🌿";
  if (s.includes("deliver")) return "📦";
  if (s.includes("maid") || s.includes("house")) return "🏠";
  if (s.includes("weld")) return "⚙️";
  if (s.includes("mason") || s.includes("construct")) return "🏗️";
  return "🛠️";
}

function StarRow({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: 20, color: n <= Math.round(r) ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
      <span style={{ fontSize: 14, color: "#6b7280", marginLeft: 6, fontWeight: 600 }}>
        {r > 0 ? r : "No ratings yet"}
      </span>
    </div>
  );
}

export default function WorkerProfile() {
  const [worker, setWorker]         = useState(null);
  const [location, setLocation]     = useState("");
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [toast, setToast]           = useState("");

  const [workerId] = useState(() => {
    try { return JSON.parse(localStorage.getItem("worker"))?._id || null; }
    catch { return null; }
  });

  useEffect(() => {
    if (!workerId) { setLoading(false); return; }
    axios.get(`${BASE}/api/workers/profile/${workerId}`)
      .then((res) => { setWorker(res.data); setLocation(res.data.location || ""); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workerId]);

  const updateLocation = async () => {
    if (!location.trim()) return;
    setUpdating(true);
    try {
      const res = await axios.put(`${BASE}/api/workers/update/${workerId}`, { location });
      setWorker(res.data);
      localStorage.setItem("worker", JSON.stringify(res.data));
      setEditMode(false);
      setToast("Location updated successfully!");
      setTimeout(() => setToast(""), 3000);
    } catch { alert("Update failed"); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:40 }}>⏳</div>
      <div style={{ color:"#6b7280" }}>Loading profile…</div>
    </div>
  );

  if (!workerId) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ textAlign:"center", padding:40 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>👤</div>
        <div style={{ fontWeight:700, fontSize:20, marginBottom:8 }}>No Worker Found</div>
        <div style={{ color:"#6b7280", marginBottom:20 }}>Please register first.</div>
        <a href="/worker-register" style={{ background:"#006491", color:"#fff", padding:"12px 24px", borderRadius:10, textDecoration:"none", fontWeight:600 }}>Register Now</a>
      </div>
    </div>
  );

  const rating  = parseFloat(worker?.rating) || 0;
  const reviews = worker?.totalReviews || 0;
  const icon    = getSkillIcon(worker?.skills);

  return (
    <div style={{ maxWidth:560, margin:"0 auto", padding:"28px 16px", fontFamily:"sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ background:"#f0fdf4", border:"1px solid #10b981", borderRadius:12, padding:"12px 16px", marginBottom:16, color:"#065f46", fontWeight:600, display:"flex", alignItems:"center", gap:8, boxShadow:"0 2px 8px rgba(16,185,129,.15)" }}>
          ✅ {toast}
        </div>
      )}

      {/* ── PROFILE CARD ─────────────────────────────────────── */}
      <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,.1)", marginBottom:16 }}>

        {/* Banner */}
        <div style={{ background:"linear-gradient(135deg,#006491,#004f73)", height:90 }} />

        <div style={{ padding:"0 24px 24px" }}>

          {/* Avatar */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:-40, marginBottom:14 }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#E8002A,#c0001f)", border:"4px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, color:"#fff", boxShadow:"0 4px 14px rgba(232,0,42,.35)" }}>
              {getInitials(worker?.name)}
            </div>
            <div style={{ background: rating>=4?"#f0fdf4":rating>=2?"#fffbeb":"#f3f4f6", color: rating>=4?"#065f46":rating>=2?"#92400e":"#6b7280", borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:700, border:`1px solid ${rating>=4?"#10b981":rating>=2?"#f59e0b":"#e5e7eb"}`, marginBottom:4 }}>
              {rating>=4?"⭐ Top Rated":rating>=2?"👍 Good Worker":"🆕 New"}
            </div>
          </div>

          {/* Name & skill */}
          <h2 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"#111" }}>{worker?.name}</h2>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ fontSize:14, color:"#6b7280", fontWeight:500 }}>{worker?.skills || "No skill listed"}</span>
          </div>

          {/* Stars */}
          <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #f3f4f6" }}>
            <StarRow rating={worker?.rating} />
            <div style={{ fontSize:12, color:"#9ca3af", marginTop:5 }}>
              {reviews>0 ? `Based on ${reviews} review${reviews>1?"s":""}` : "No reviews yet — complete a job to get rated"}
            </div>
          </div>
        </div>
      </div>

      {/* ── INFO CARD ─────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", boxShadow:"0 4px 24px rgba(0,0,0,.08)", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Contact Info</div>

        {/* Phone row */}
        <div style={{ display:"flex", alignItems:"center", gap:12, paddingBottom:14, borderBottom:"1px solid #f3f4f6", marginBottom:14 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"#e8f4f8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📞</div>
          <div>
            <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, textTransform:"uppercase" }}>Phone</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#111", marginTop:2 }}>{worker?.phone || "—"}</div>
          </div>
          <a href={`tel:${worker?.phone}`} style={{ marginLeft:"auto", background:"#e8f4f8", color:"#006491", borderRadius:8, padding:"6px 14px", textDecoration:"none", fontSize:13, fontWeight:600 }}>Call</a>
        </div>

        {/* Location row */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, marginTop:2 }}>📍</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"#9ca3af", fontWeight:600, textTransform:"uppercase" }}>Location</div>
            {editMode ? (
              <div style={{ marginTop:8 }}>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your area / city"
                  autoFocus
                  style={{ width:"100%", padding:"10px 14px", border:"2px solid #006491", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box" }}
                />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={updateLocation} disabled={updating} style={{ flex:1, padding:"10px 0", background:"#006491", color:"#fff", border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:14 }}>
                    {updating ? "Saving…" : "✓ Save"}
                  </button>
                  <button onClick={() => { setEditMode(false); setLocation(worker?.location||""); }} style={{ flex:1, padding:"10px 0", background:"#f3f4f6", color:"#374151", border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:14 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:2 }}>
                <div style={{ fontSize:15, fontWeight:600, color:"#111" }}>{worker?.location || "Not set"}</div>
                <button onClick={() => setEditMode(true)} style={{ background:"none", border:"1px solid #e5e7eb", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, color:"#006491", fontWeight:600 }}>
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS CARD ────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", boxShadow:"0 4px 24px rgba(0,0,0,.08)", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Performance</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Rating",  value: rating>0 ? `${rating}/5` : "—", icon:"⭐", color:"#f59e0b", bg:"#fffbeb" },
            { label:"Reviews", value: reviews||"0",                    icon:"📝", color:"#006491", bg:"#e8f4f8" },
            { label:"Status",  value:"Active",                         icon:"✅", color:"#10b981", bg:"#f0fdf4" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign:"center", background:s.bg, borderRadius:14, padding:"14px 8px" }}>
              <div style={{ fontSize:24 }}>{s.icon}</div>
              <div style={{ fontSize:17, fontWeight:800, color:s.color, marginTop:4 }}>{s.value}</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <a href="/worker-dashboard" style={{ background:"#006491", color:"#fff", borderRadius:14, padding:"16px", textDecoration:"none", display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 14px rgba(0,100,145,.3)" }}>
          <span style={{ fontSize:24 }}>🚀</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>Dashboard</div>
            <div style={{ fontSize:11, opacity:.8 }}>Find nearby jobs</div>
          </div>
        </a>
        <a href="/jobs" style={{ background:"#E8002A", color:"#fff", borderRadius:14, padding:"16px", textDecoration:"none", display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 14px rgba(232,0,42,.3)" }}>
          <span style={{ fontSize:24 }}>💼</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>Browse Jobs</div>
            <div style={{ fontSize:11, opacity:.8 }}>All listings</div>
          </div>
        </a>
      </div>

    </div>
  );
}