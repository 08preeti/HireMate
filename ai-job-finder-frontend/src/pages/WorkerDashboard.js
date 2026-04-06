/*import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const workerIcon = new L.DivIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#006491;border:3px solid #fff;
    box-shadow:0 3px 12px rgba(0,100,145,.5);display:flex;align-items:center;
    justify-content:center;font-size:20px">🚗</div>`,
  iconSize: [42, 42], iconAnchor: [21, 21], className: "",
});

const jobIcon = new L.DivIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#E8002A;border:3px solid #fff;
    box-shadow:0 3px 12px rgba(232,0,42,.5);display:flex;align-items:center;
    justify-content:center;font-size:20px">📍</div>`,
  iconSize: [42, 42], iconAnchor: [21, 42], className: "",
});

function FollowWorker({ pos }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!pos) return;
    const dist = prev.current ? map.distance([prev.current.lat, prev.current.lng],[pos.lat,pos.lng]) : 999;
    if (dist > 30) map.setView([pos.lat, pos.lng], 15, { animate: true, duration: 1 });
    prev.current = pos;
  }, [pos, map]);
  return null;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRoute(from, to) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`);
    const d = await r.json();
    if (d.code !== "Ok") return null;
    const route = d.routes[0];
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distKm: (route.distance / 1000).toFixed(1),
      timeMin: Math.round(route.duration / 60),
      steps: route.legs[0].steps.map(s => s.maneuver.instruction).filter(Boolean),
    };
  } catch { return null; }
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN"; u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

const STATUS_CONFIG = {
  accepted:   { label: "Job Accepted", icon: "✅", color: "#006491", bg: "#e8f4f8" },
  on_the_way: { label: "On the Way",   icon: "🚗", color: "#f59e0b", bg: "#fffbeb" },
  arrived:    { label: "Arrived",      icon: "📍", color: "#10b981", bg: "#f0fdf4" },
  completed:  { label: "Completed",    icon: "🎉", color: "#8b5cf6", bg: "#f5f3ff" },
};
const STEPS = ["accepted", "on_the_way", "arrived", "completed"];

// ══════════════════════════════════════════════════════════════════════════
// NAVIGATION MODAL — full screen, shown after Accept
// ══════════════════════════════════════════════════════════════════════════
function NavModal({ job, appId, workerPos, onClose }) {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo]     = useState(null);
  const [status, setStatus]           = useState("accepted");
  const [nextStep, setNextStep]       = useState("");
  const [eta, setEta]                 = useState("");
  const [arrived, setArrived]         = useState(false);
  const lastFetch  = useRef(0);
  const prevStep   = useRef("");
  // Use refs so the effect doesn't need arrived/dest as deps (they never change)
  const arrivedRef = useRef(false);
  const destRef    = useRef({ lat: job.latitude, lng: job.longitude });

  useEffect(() => { arrivedRef.current = arrived; }, [arrived]);

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!workerPos || !destRef.current.lat) return;
    const now = Date.now();
    if (now - lastFetch.current < 8000) return;
    lastFetch.current = now;

    const dest = destRef.current;
    fetchRoute(workerPos, dest).then(result => {
      if (!result) return;
      setRouteCoords(result.coords);
      setRouteInfo({ distKm: result.distKm, timeMin: result.timeMin });
      const t = new Date(); t.setMinutes(t.getMinutes() + result.timeMin);
      setEta(t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (result.steps[0] && result.steps[0] !== prevStep.current) {
        speak(result.steps[0]); prevStep.current = result.steps[0]; setNextStep(result.steps[0]);
      }
      if (haversine(workerPos.lat, workerPos.lng, destRef.current.lat, destRef.current.lng) < 0.08 && !arrivedRef.current) {
        arrivedRef.current = true;
        setArrived(true);
        speak("You have arrived at the job location.");
      }
    });
  }, [workerPos]);

  const updateStatus = async (s) => {
    setStatus(s);
    if (s === "on_the_way") speak("Navigation started.");
    if (s === "completed")  speak("Job completed. Great work!");
    if (appId) {
      await fetch(`${BASE}/api/applications/status/${appId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      }).catch(() => {});
    }
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", flexDirection:"column", background:"#f8f9fa" }}>

      
      <div style={{ background: cfg.color, color:"#fff", padding:"12px 16px", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>{cfg.label}</div>
            {routeInfo && <div style={{ fontSize:12, opacity:.9 }}>{routeInfo.distKm} km · ETA {eta || `~${routeInfo.timeMin} min`}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,.2)", border:"none", color:"#fff", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>✕</button>
      </div>

      
      {nextStep && status === "on_the_way" && (
        <div style={{ background:"#1a1a2e", color:"#fff", padding:"10px 16px", fontSize:13, display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:18 }}>🗣️</span><span>{nextStep}</span>
        </div>
      )}

      
      <div style={{ flex:1, minHeight:0, position:"relative" }}>
        <MapContainer
          center={workerPos ? [workerPos.lat, workerPos.lng] : [destRef.current.lat, destRef.current.lng]}
          zoom={14} style={{ height:"100%", width:"100%" }} zoomControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {destRef.current.lat && <Marker position={[destRef.current.lat, destRef.current.lng]} icon={jobIcon}><Popup><b>📍 Job Location</b><br />{job.location?.en}</Popup></Marker>}
          {workerPos && <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon}><Popup>🚗 You</Popup></Marker>}
          {routeCoords.length > 0 && <>
            <Polyline positions={routeCoords} color="#006491" weight={10} opacity={0.2} />
            <Polyline positions={routeCoords} color="#006491" weight={5} opacity={0.95} />
          </>}
          {workerPos && <FollowWorker pos={workerPos} />}
        </MapContainer>

        
        {destRef.current.lat && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${destRef.current.lat},${destRef.current.lng}`}
            target="_blank" rel="noreferrer"
            style={{ position:"absolute", top:12, right:12, zIndex:1000, background:"#fff", border:"1px solid #ddd", borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:600, color:"#1a73e8", textDecoration:"none", boxShadow:"0 2px 8px rgba(0,0,0,.1)" }}>
            🗺️ Google Maps
          </a>
        )}
      </div>

      
      <div style={{ background:"#fff", borderTopLeftRadius:24, borderTopRightRadius:24, boxShadow:"0 -4px 24px rgba(0,0,0,.12)", padding:"16px 20px 28px", flexShrink:0 }}>
        <div style={{ width:40, height:4, background:"#e0e0e0", borderRadius:2, margin:"0 auto 14px" }} />

        
        <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:"#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>💼</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>{job.jobTitle?.en}</div>
            <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>{job.location?.en}</div>
            {routeInfo && <div style={{ fontSize:12, color:"#006491", marginTop:2, fontWeight:600 }}>{routeInfo.distKm} km · ~{routeInfo.timeMin} min</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:700, fontSize:16, color:"#E8002A" }}>₹{job.salary}</div>
            <div style={{ fontSize:11, color:"#888" }}>{job.paymentMethod}</div>
          </div>
        </div>

        
        <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
          {STEPS.map((step, i) => {
            const done = i <= STEPS.indexOf(status);
            const cur  = step === status;
            const sc   = STATUS_CONFIG[step];
            return (
              <div key={step} style={{ display:"flex", alignItems:"center", flex:1 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background: done ? sc.color : "#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, transition:"all .3s", boxShadow: cur ? `0 0 0 4px ${sc.color}30` : "none" }}>{done ? sc.icon : "○"}</div>
                  <div style={{ fontSize:9, color: done ? sc.color : "#9ca3af", fontWeight: cur ? 700 : 400, textAlign:"center", lineHeight:1.2, maxWidth:52 }}>{sc.label}</div>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex:1, height:2, marginBottom:16, background: i < STEPS.indexOf(status) ? "#006491" : "#e5e7eb", transition:"background .3s" }} />}
              </div>
            );
          })}
        </div>

        
        {status === "accepted" && (
          <button onClick={() => updateStatus("on_the_way")} style={{ width:"100%", padding:"15px 0", background:"#006491", color:"#fff", border:"none", borderRadius:14, fontSize:16, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 16px rgba(0,100,145,.35)" }}>🚀 Start Navigation</button>
        )}
        {status === "on_the_way" && !arrived && (
          <div style={{ width:"100%", padding:"14px", background:"#f0f9ff", border:"2px solid #006491", borderRadius:14, textAlign:"center", fontSize:14, color:"#006491", fontWeight:600 }}>🚗 Navigating to job location…</div>
        )}
        {status === "on_the_way" && arrived && (
          <button onClick={() => updateStatus("arrived")} style={{ width:"100%", padding:"15px 0", background:"#10b981", color:"#fff", border:"none", borderRadius:14, fontSize:16, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 16px rgba(16,185,129,.35)" }}>📍 I Have Arrived</button>
        )}
        {status === "arrived" && (
          <button onClick={() => updateStatus("completed")} style={{ width:"100%", padding:"15px 0", background:"#8b5cf6", color:"#fff", border:"none", borderRadius:14, fontSize:16, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 16px rgba(139,92,246,.35)" }}>🎉 Mark Job as Completed</button>
        )}
        {status === "completed" && (
          <div style={{ textAlign:"center", padding:"16px", background:"#f0fdf4", borderRadius:14, border:"2px solid #10b981" }}>
            <div style={{ fontSize:28 }}>🎉</div>
            <div style={{ fontWeight:700, color:"#065f46", fontSize:16 }}>Job Completed!</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>The employer will rate your work shortly.</div>
            <button onClick={onClose} style={{ marginTop:10, padding:"8px 20px", background:"#006491", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:13 }}>← Back to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
export default function WorkerDashboard() {
  const [alerts, setAlerts]           = useState([]);
  const [jobs, setJobs]               = useState([]);
  const [workerPos, setWorkerPos]     = useState(null);
  const [gpsOn, setGpsOn]             = useState(false);
  const [activeNav, setActiveNav]     = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const watchRef                      = useRef(null);

  const [worker] = useState(() => {
    try { return JSON.parse(localStorage.getItem("worker")) || null; } catch { return null; }
  });

  const enableGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    setGpsOn(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setWorkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  };

  useEffect(() => () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); }, []);

  useEffect(() => {
    if (!worker || !workerPos) return;
    fetch(`${BASE}/api/workers/job-alerts?lat=${workerPos.lat}&lng=${workerPos.lng}`)
      .then(r => r.json()).then(d => setAlerts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${BASE}/api/workers/job-history/${worker._id}`)
      .then(r => r.json()).then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [worker, workerPos]);

  const acceptJob = async (job) => {
    if (!worker) return;
    setAcceptingId(job._id);
    try {
      const res  = await fetch(`${BASE}/api/workers/accept-job`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker._id, jobId: job._id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Could not accept job"); return; }
      // Open Uber navigation modal immediately
      setActiveNav({ job, appId: data.applicationId });
    } catch { alert("Server error"); }
    finally   { setAcceptingId(null); }
  };

  if (!worker) return (
    <div style={{ padding:40, textAlign:"center" }}>
      <p>No worker found. <a href="/worker-register" style={{ color:"#006491" }}>Register first</a>.</p>
    </div>
  );

  return (
    <>
      {activeNav && (
        <NavModal
          job={activeNav.job}
          appId={activeNav.appId}
          workerPos={workerPos}
          onClose={() => setActiveNav(null)}
        />
      )}

      <div style={{ maxWidth:680, margin:"0 auto", padding:"24px 16px", fontFamily:"sans-serif" }}>

        
        <div style={{ background:"linear-gradient(135deg,#006491,#004f73)", color:"#fff", borderRadius:16, padding:"20px 24px", marginBottom:20, boxShadow:"0 4px 20px rgba(0,100,145,.3)" }}>
          <div style={{ fontSize:22, fontWeight:700 }}>Worker Dashboard 🚀</div>
          <div style={{ fontSize:14, opacity:.85, marginTop:4 }}>Welcome, <b>{worker.name}</b></div>
          {gpsOn && workerPos && (
            <div style={{ marginTop:10, background:"rgba(255,255,255,.15)", borderRadius:8, padding:"5px 12px", fontSize:12, display:"inline-flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, background:"#4ade80", borderRadius:"50%", display:"inline-block" }} />
              Live GPS Active
            </div>
          )}
        </div>

        
        {!gpsOn && (
          <button onClick={enableGPS} style={{ width:"100%", padding:14, marginBottom:20, background:"#006491", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", boxShadow:"0 4px 14px rgba(0,100,145,.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            📍 Enable Live Location to See Nearby Jobs
          </button>
        )}

        
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
            🔔 New Jobs Near You
            {alerts.length > 0 && <span style={{ background:"#E8002A", color:"#fff", borderRadius:12, padding:"2px 8px", fontSize:12 }}>{alerts.length}</span>}
          </div>

          {!gpsOn && (
            <div style={{ background:"#f8f9fa", borderRadius:12, padding:24, textAlign:"center", color:"#888" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📍</div>
              <div style={{ fontWeight:600 }}>Enable location to see jobs near you</div>
              <div style={{ fontSize:12, marginTop:4 }}>Jobs within 20km will appear here</div>
            </div>
          )}

          {gpsOn && alerts.length === 0 && (
            <div style={{ background:"#f8f9fa", borderRadius:12, padding:24, textAlign:"center", color:"#888" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
              <div style={{ fontWeight:600 }}>No jobs nearby right now</div>
              <div style={{ fontSize:12, marginTop:4 }}>Or <a href="/jobs" style={{ color:"#006491" }}>browse all jobs</a></div>
            </div>
          )}

          {alerts.map(job => {
            const dist = workerPos && job.latitude && job.longitude
              ? haversine(workerPos.lat, workerPos.lng, job.latitude, job.longitude).toFixed(1) : null;
            return (
              <div key={job._id} style={{ background:"#fff", borderRadius:16, marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,.08)", overflow:"hidden", border:"1px solid #f0f0f0" }}>
                {job.isUrgent && <div style={{ background:"#E8002A", color:"#fff", padding:"4px 12px", fontSize:12, fontWeight:700 }}>🚨 URGENT HIRING</div>}
                <div style={{ padding:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>{job.jobTitle?.en}</div>
                      <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>📍 {job.location?.en}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, fontSize:18, color:"#E8002A" }}>₹{job.salary}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{job.paymentMethod || "Cash"}</div>
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                    {dist && <span style={{ background:"#e8f4f8", color:"#006491", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600 }}>📏 {dist} km away</span>}
                    {job.skills?.en && <span style={{ background:"#f3f4f6", color:"#374151", borderRadius:20, padding:"3px 10px", fontSize:12 }}>🛠️ {job.skills.en}</span>}
                  </div>

                  <button
                    onClick={() => acceptJob(job)}
                    disabled={!!acceptingId}
                    style={{
                      width:"100%", padding:"13px 0",
                      background: acceptingId === job._id ? "#9ca3af" : "#006491",
                      color:"#fff", border:"none", borderRadius:12,
                      fontSize:15, fontWeight:700,
                      cursor: acceptingId ? "not-allowed" : "pointer",
                      boxShadow: acceptingId ? "none" : "0 4px 14px rgba(0,100,145,.3)",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    }}
                  >
                    {acceptingId === job._id ? "Accepting…" : <><span>Accept & Navigate</span><span style={{ fontSize:18 }}>🚗</span></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        
        <div>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:12 }}>📋 My Job History</div>
          {jobs.length === 0 ? (
            <div style={{ background:"#f8f9fa", borderRadius:12, padding:24, textAlign:"center", color:"#888" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📂</div>
              <div style={{ fontWeight:600 }}>No jobs yet</div>
            </div>
          ) : jobs.map(j => {
            const sc = STATUS_CONFIG[j.status] || STATUS_CONFIG.accepted;
            return (
              <div key={j._id} style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,.06)", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #f0f0f0" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{j.job?.jobTitle?.en}</div>
                  <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{j.job?.location?.en}</div>
                  <div style={{ fontSize:12, color:"#006491", marginTop:2, fontWeight:600 }}>₹{j.job?.salary}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ background:sc.bg, color:sc.color, borderRadius:20, padding:"4px 10px", fontSize:12, fontWeight:600 }}>{sc.icon} {sc.label}</div>
                  {j.isCompleted && j.rating && <div style={{ fontSize:12, marginTop:4 }}>⭐ {j.rating}/5</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
} */



//-------------------------

/*import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const workerIcon = new L.DivIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#006491;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,100,145,.5);display:flex;align-items:center;justify-content:center;font-size:20px">🚗</div>`,
  iconSize: [42, 42], iconAnchor: [21, 21], className: "",
});
const jobIcon = new L.DivIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#E8002A;border:3px solid #fff;box-shadow:0 3px 12px rgba(232,0,42,.5);display:flex;align-items:center;justify-content:center;font-size:20px">📍</div>`,
  iconSize: [42, 42], iconAnchor: [21, 42], className: "",
});

function FollowWorker({ pos }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!pos) return;
    const dist = prev.current ? map.distance([prev.current.lat, prev.current.lng], [pos.lat, pos.lng]) : 999;
    if (dist > 30) map.setView([pos.lat, pos.lng], 15, { animate: true, duration: 1 });
    prev.current = pos;
  }, [pos, map]);
  return null;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRoute(from, to) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`);
    const d = await r.json();
    if (d.code !== "Ok") return null;
    const route = d.routes[0];
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distKm: (route.distance / 1000).toFixed(1),
      timeMin: Math.round(route.duration / 60),
      steps: route.legs[0].steps.map(s => s.maneuver.instruction).filter(Boolean),
    };
  } catch { return null; }
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN"; u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

const STATUS_CONFIG = {
  accepted:   { label: "Job Accepted", icon: "✅", color: "#006491", bg: "#e8f4f8" },
  on_the_way: { label: "On the Way",   icon: "🚗", color: "#f59e0b", bg: "#fffbeb" },
  arrived:    { label: "Arrived",      icon: "📍", color: "#10b981", bg: "#f0fdf4" },
  completed:  { label: "Completed",    icon: "🎉", color: "#8b5cf6", bg: "#f5f3ff" },
};
const STEPS = ["accepted", "on_the_way", "arrived", "completed"];

// ══ NAVIGATION MODAL ══════════════════════════════════════════════════════
function NavModal({ job, appId, workerPos, onClose, t }) {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo]     = useState(null);
  const [status, setStatus]           = useState("accepted");
  const [nextStep, setNextStep]       = useState("");
  const [eta, setEta]                 = useState("");
  const [arrived, setArrived]         = useState(false);
  const lastFetch  = useRef(0);
  const prevStep   = useRef("");
  const arrivedRef = useRef(false);
  const destRef    = useRef({ lat: job.latitude, lng: job.longitude });

  useEffect(() => { arrivedRef.current = arrived; }, [arrived]);

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!workerPos || !destRef.current.lat) return;
    const now = Date.now();
    if (now - lastFetch.current < 8000) return;
    lastFetch.current = now;
    const dest = destRef.current;
    fetchRoute(workerPos, dest).then(result => {
      if (!result) return;
      setRouteCoords(result.coords);
      setRouteInfo({ distKm: result.distKm, timeMin: result.timeMin });
      const arrTime = new Date(); arrTime.setMinutes(arrTime.getMinutes() + result.timeMin);
      setEta(arrTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (result.steps[0] && result.steps[0] !== prevStep.current) {
        speak(result.steps[0]); prevStep.current = result.steps[0]; setNextStep(result.steps[0]);
      }
      if (haversine(workerPos.lat, workerPos.lng, dest.lat, dest.lng) < 0.08 && !arrivedRef.current) {
        arrivedRef.current = true; setArrived(true); speak("You have arrived at the job location.");
      }
    });
  }, [workerPos]);

  const updateStatus = async (s) => {
    setStatus(s);
    if (s === "on_the_way") speak("Navigation started.");
    if (s === "completed")  speak("Job completed. Great work!");
    if (appId) {
      await fetch(`${BASE}/api/applications/status/${appId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      }).catch(() => {});
    }
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#f8f9fa" }}>
      
      <div style={{ background: cfg.color, color: "#fff", padding: "12px 16px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{cfg.label}</div>
            {routeInfo && <div style={{ fontSize: 12, opacity: .9 }}>{routeInfo.distKm} km · ETA {eta || `~${routeInfo.timeMin} min`}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>✕</button>
      </div>

      
      {nextStep && status === "on_the_way" && (
        <div style={{ background: "#1a1a2e", color: "#fff", padding: "10px 16px", fontSize: 13, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>🗣️</span><span>{nextStep}</span>
        </div>
      )}

      
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MapContainer center={workerPos ? [workerPos.lat, workerPos.lng] : [destRef.current.lat, destRef.current.lng]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {destRef.current.lat && <Marker position={[destRef.current.lat, destRef.current.lng]} icon={jobIcon}><Popup>{job.location?.en}</Popup></Marker>}
          {workerPos && <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon}><Popup>🚗 You</Popup></Marker>}
          {routeCoords.length > 0 && <>
            <Polyline positions={routeCoords} color="#006491" weight={10} opacity={0.2} />
            <Polyline positions={routeCoords} color="#006491" weight={5} opacity={0.95} />
          </>}
          {workerPos && <FollowWorker pos={workerPos} />}
        </MapContainer>

        
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
          {job.contactInfo && (
            <a href={`tel:${job.contactInfo}`} style={{ background: "#10b981", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              📞 {t.call}
            </a>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${destRef.current.lat},${destRef.current.lng}`} target="_blank" rel="noreferrer"
            style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, color: "#1a73e8", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
            {t.googleMaps}
          </a>
        </div>
      </div>

      
      <div style={{ background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -4px 24px rgba(0,0,0,.12)", padding: "16px 20px 28px", flexShrink: 0 }}>
        <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 14px" }} />

        
        <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{job.jobTitle?.en}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{job.location?.en}</div>
            {routeInfo && <div style={{ fontSize: 12, color: "#006491", marginTop: 2, fontWeight: 600 }}>{routeInfo.distKm} km · ~{routeInfo.timeMin} min</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#E8002A" }}>₹{job.salary}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{job.paymentMethod}</div>
          </div>
        </div>

       
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          {STEPS.map((step, i) => {
            const done = i <= STEPS.indexOf(status);
            const cur  = step === status;
            const sc   = STATUS_CONFIG[step];
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? sc.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "all .3s", boxShadow: cur ? `0 0 0 4px ${sc.color}30` : "none" }}>{done ? sc.icon : "○"}</div>
                  <div style={{ fontSize: 9, color: done ? sc.color : "#9ca3af", fontWeight: cur ? 700 : 400, textAlign: "center", lineHeight: 1.2, maxWidth: 52 }}>{sc.label}</div>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, marginBottom: 16, background: i < STEPS.indexOf(status) ? "#006491" : "#e5e7eb", transition: "background .3s" }} />}
              </div>
            );
          })}
        </div>

        
        {status === "accepted" && (
          <button onClick={() => updateStatus("on_the_way")} style={{ width: "100%", padding: "15px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,100,145,.35)" }}>
            {t.startNavigation}
          </button>
        )}
        {status === "on_the_way" && !arrived && (
          <div style={{ width: "100%", padding: "14px", background: "#f0f9ff", border: "2px solid #006491", borderRadius: 14, textAlign: "center", fontSize: 14, color: "#006491", fontWeight: 600 }}>
            {t.navigating}
          </div>
        )}
        {status === "on_the_way" && arrived && (
          <button onClick={() => updateStatus("arrived")} style={{ width: "100%", padding: "15px 0", background: "#10b981", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {t.iHaveArrived}
          </button>
        )}
        {status === "arrived" && (
          <button onClick={() => updateStatus("completed")} style={{ width: "100%", padding: "15px 0", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {t.markCompleted}
          </button>
        )}
        {status === "completed" && (
          <div style={{ textAlign: "center", padding: "16px", background: "#f0fdf4", borderRadius: 14, border: "2px solid #10b981" }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <div style={{ fontWeight: 700, color: "#065f46", fontSize: 16 }}>{t.jobCompleted}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{t.employerWillRate}</div>
            <button onClick={onClose} style={{ marginTop: 10, padding: "8px 20px", background: "#006491", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>{t.backToDashboard}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══ MAIN DASHBOARD ════════════════════════════════════════════════════════
export default function WorkerDashboard() {
  const { language }              = useLanguage();
  const t                         = translations[language];
  const [alerts, setAlerts]       = useState([]);
  const [jobs, setJobs]           = useState([]);
  const [workerPos, setWorkerPos] = useState(null);
  const [gpsOn, setGpsOn]         = useState(false);
  const [activeNav, setActiveNav] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const watchRef                  = useRef(null);

  const [worker] = useState(() => {
    try { return JSON.parse(localStorage.getItem("worker")) || null; } catch { return null; }
  });

  // Earnings calculation
  const todayEarnings = jobs
    .filter(j => j.isCompleted && new Date(j.updatedAt).toDateString() === new Date().toDateString())
    .reduce((sum, j) => sum + (j.job?.salary || 0), 0);
  const weekEarnings = jobs
    .filter(j => j.isCompleted && (Date.now() - new Date(j.updatedAt)) < 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, j) => sum + (j.job?.salary || 0), 0);
  const totalJobs = jobs.filter(j => j.isCompleted).length;

  const enableGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    setGpsOn(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setWorkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  };

  useEffect(() => () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); }, []);

  useEffect(() => {
    if (!worker || !workerPos) return;
    fetch(`${BASE}/api/workers/job-alerts?lat=${workerPos.lat}&lng=${workerPos.lng}`)
      .then(r => r.json()).then(d => setAlerts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${BASE}/api/workers/job-history/${worker._id}`)
      .then(r => r.json()).then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [worker, workerPos]);

  const acceptJob = async (job) => {
    if (!worker) return;
    setAcceptingId(job._id);
    try {
      const res  = await fetch(`${BASE}/api/workers/accept-job`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker._id, jobId: job._id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Could not accept job"); return; }
      setActiveNav({ job, appId: data.applicationId });
    } catch { alert("Server error"); }
    finally { setAcceptingId(null); }
  };

  if (!worker) return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👷</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        {language === "hi" ? "लॉगिन करें या रजिस्टर करें" : language === "mr" ? "लॉगिन किंवा नोंदणी करा" : "Please Login or Register"}
      </div>
      <a href="/worker-login" style={{ display: "inline-block", background: "#006491", color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 16 }}>
        {language === "hi" ? "लॉगिन करें" : language === "mr" ? "लॉगिन करा" : "Login / Register"}
      </a>
    </div>
  );

  return (
    <>
      {activeNav && (
        <NavModal
          job={activeNav.job} appId={activeNav.appId}
          workerPos={workerPos} onClose={() => setActiveNav(null)} t={t}
        />
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>

        
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", color: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 4px 20px rgba(0,100,145,.3)" }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{t.workerDashboardTitle}</div>
          <div style={{ fontSize: 14, opacity: .85, marginTop: 4 }}>{t.welcome}, <b>{worker.name}</b></div>
          {gpsOn && workerPos && (
            <div style={{ marginTop: 10, background: "rgba(255,255,255,.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
              {t.liveActive}
            </div>
          )}
        </div>

        
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>
            💰 {language === "hi" ? "मेरी कमाई" : language === "mr" ? "माझी कमाई" : "My Earnings"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: language === "hi" ? "आज" : language === "mr" ? "आज" : "Today",   value: `₹${todayEarnings}`, color: "#10b981", bg: "#f0fdf4" },
              { label: language === "hi" ? "इस हफ्ते" : language === "mr" ? "या आठवड्यात" : "This Week", value: `₹${weekEarnings}`, color: "#006491", bg: "#e8f4f8" },
              { label: language === "hi" ? "कुल काम" : language === "mr" ? "एकूण काम" : "Total Jobs",  value: totalJobs, color: "#8b5cf6", bg: "#f5f3ff" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", background: s.bg, borderRadius: 12, padding: "12px 6px" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        
        {!gpsOn && (
          <button onClick={enableGPS} style={{ width: "100%", padding: 14, marginBottom: 20, background: "#006491", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,100,145,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {t.enableLocationFull}
          </button>
        )}

        
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            🔔 {t.newJobsNear}
            {alerts.length > 0 && <span style={{ background: "#E8002A", color: "#fff", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>{alerts.length}</span>}
          </div>

          {!gpsOn && (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 24, textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 600 }}>{t.enableToSee}</div>
            </div>
          )}

          {gpsOn && alerts.length === 0 && (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 24, textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>{t.noJobsNearby}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}><a href="/jobs" style={{ color: "#006491" }}>{t.browseJobs}</a></div>
            </div>
          )}

          {alerts.map(job => {
            const dist = workerPos && job.latitude && job.longitude
              ? haversine(workerPos.lat, workerPos.lng, job.latitude, job.longitude).toFixed(1) : null;
            return (
              <div key={job._id} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.08)", overflow: "hidden", border: "1px solid #f0f0f0" }}>
                {job.isUrgent && <div style={{ background: "#E8002A", color: "#fff", padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>🚨 {t.urgent}</div>}
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{job.jobTitle?.[language] || job.jobTitle?.en}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>📍 {job.location?.[language] || job.location?.en}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "#E8002A" }}>₹{job.salary}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{job.paymentMethod}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    {dist && <span style={{ background: "#e8f4f8", color: "#006491", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>📏 {dist} {t.kmAway}</span>}
                    {job.skills?.[language] && <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>🛠️ {job.skills[language]}</span>}
                  </div>

                  
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => acceptJob(job)}
                      disabled={!!acceptingId}
                      style={{ flex: 1, padding: "13px 0", background: acceptingId === job._id ? "#9ca3af" : "#006491", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: acceptingId ? "not-allowed" : "pointer", boxShadow: acceptingId ? "none" : "0 4px 14px rgba(0,100,145,.3)" }}
                    >
                      {acceptingId === job._id ? t.accepting : t.acceptNavigate}
                    </button>
                    {job.contactInfo && (
                      <a href={`tel:${job.contactInfo}`} style={{ padding: "13px 16px", background: "#10b981", color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 18, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        📞
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>📋 {t.jobHistory}</div>
          {jobs.length === 0 ? (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 24, textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 600 }}>{t.noJobsYet}</div>
            </div>
          ) : jobs.map(j => {
            const sc = STATUS_CONFIG[j.status] || STATUS_CONFIG.accepted;
            return (
              <div key={j._id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.06)", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f0f0f0" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{j.job?.jobTitle?.[language] || j.job?.jobTitle?.en}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{j.job?.location?.[language] || j.job?.location?.en}</div>
                  <div style={{ fontSize: 12, color: "#006491", marginTop: 2, fontWeight: 600 }}>₹{j.job?.salary}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>{sc.icon} {sc.label}</div>
                  {j.isCompleted && j.rating && <div style={{ fontSize: 12, marginTop: 4 }}>⭐ {j.rating}/5</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}  */



//---------------------
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../translations";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const workerIcon = new L.DivIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#006491;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,100,145,.5);display:flex;align-items:center;justify-content:center;font-size:20px">🚗</div>`,
  iconSize: [42, 42], iconAnchor: [21, 21], className: "",
});
const jobIcon = new L.DivIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#E8002A;border:3px solid #fff;box-shadow:0 3px 12px rgba(232,0,42,.5);display:flex;align-items:center;justify-content:center;font-size:20px">📍</div>`,
  iconSize: [42, 42], iconAnchor: [21, 42], className: "",
});

function FollowWorker({ pos }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!pos) return;
    const dist = prev.current ? map.distance([prev.current.lat, prev.current.lng], [pos.lat, pos.lng]) : 999;
    if (dist > 30) map.setView([pos.lat, pos.lng], 15, { animate: true, duration: 1 });
    prev.current = pos;
  }, [pos, map]);
  return null;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRoute(from, to) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`);
    const d = await r.json();
    if (d.code !== "Ok") return null;
    const route = d.routes[0];
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distKm: (route.distance / 1000).toFixed(1),
      timeMin: Math.round(route.duration / 60),
      steps: route.legs[0].steps.map(s => s.maneuver.instruction).filter(Boolean),
    };
  } catch { return null; }
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN"; u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

const STATUS_CONFIG = {
  accepted:   { label: "Job Accepted", icon: "✅", color: "#006491", bg: "#e8f4f8" },
  on_the_way: { label: "On the Way",   icon: "🚗", color: "#f59e0b", bg: "#fffbeb" },
  arrived:    { label: "Arrived",      icon: "📍", color: "#10b981", bg: "#f0fdf4" },
  completed:  { label: "Completed",    icon: "🎉", color: "#8b5cf6", bg: "#f5f3ff" },
};
const STEPS = ["accepted", "on_the_way", "arrived", "completed"];

// ══ NAVIGATION MODAL ══════════════════════════════════════════════════════
function NavModal({ job, appId, workerPos, onClose, t }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo]     = useState(null);
  const [status, setStatus]           = useState("accepted");
  const [nextStep, setNextStep]       = useState("");
  const [eta, setEta]                 = useState("");
  const [arrived, setArrived]         = useState(false);
  const lastFetch  = useRef(0);
  const prevStep   = useRef("");
  const arrivedRef = useRef(false);
  const destRef    = useRef({ lat: job.latitude, lng: job.longitude });

  useEffect(() => { arrivedRef.current = arrived; }, [arrived]);

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!workerPos || !destRef.current.lat) return;
    const now = Date.now();
    if (now - lastFetch.current < 8000) return;
    lastFetch.current = now;
    const dest = destRef.current;
    fetchRoute(workerPos, dest).then(result => {
      if (!result) return;
      setRouteCoords(result.coords);
      setRouteInfo({ distKm: result.distKm, timeMin: result.timeMin });
      const arrTime = new Date(); arrTime.setMinutes(arrTime.getMinutes() + result.timeMin);
      setEta(arrTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (result.steps[0] && result.steps[0] !== prevStep.current) {
        speak(result.steps[0]); prevStep.current = result.steps[0]; setNextStep(result.steps[0]);
      }
      if (haversine(workerPos.lat, workerPos.lng, dest.lat, dest.lng) < 0.08 && !arrivedRef.current) {
        arrivedRef.current = true; setArrived(true); speak("You have arrived at the job location.");
      }
    });
  }, [workerPos]);

  const updateStatus = async (s) => {
    setStatus(s);
    if (s === "on_the_way") speak("Navigation started.");
    if (s === "completed")  speak("Job completed. Great work!");
    if (appId) {
      await fetch(`${BASE}/api/applications/status/${appId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      }).catch(() => {});
    }
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#f8f9fa" }}>
      {/* Top bar */}
      <div style={{ background: cfg.color, color: "#fff", padding: "12px 16px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{cfg.label}</div>
            {routeInfo && <div style={{ fontSize: 12, opacity: .9 }}>{routeInfo.distKm} km · ETA {eta || `~${routeInfo.timeMin} min`}</div>}
          </div>
        </div>
        <button onClick={() => status === "completed" ? onClose() : setConfirmClose(true)} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>✕</button>
      </div>

      {/* Voice instruction */}
      {nextStep && status === "on_the_way" && (
        <div style={{ background: "#1a1a2e", color: "#fff", padding: "10px 16px", fontSize: 13, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>🗣️</span><span>{nextStep}</span>
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MapContainer center={workerPos ? [workerPos.lat, workerPos.lng] : [destRef.current.lat, destRef.current.lng]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {destRef.current.lat && <Marker position={[destRef.current.lat, destRef.current.lng]} icon={jobIcon}><Popup>{job.location?.en}</Popup></Marker>}
          {workerPos && <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon}><Popup>🚗 You</Popup></Marker>}
          {routeCoords.length > 0 && <>
            <Polyline positions={routeCoords} color="#006491" weight={10} opacity={0.2} />
            <Polyline positions={routeCoords} color="#006491" weight={5} opacity={0.95} />
          </>}
          {workerPos && <FollowWorker pos={workerPos} />}
        </MapContainer>

        {/* Call employer + Google Maps */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
          {job.contactInfo && (
            <a href={`tel:${job.contactInfo}`} style={{ background: "#10b981", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              📞 {t.call}
            </a>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${destRef.current.lat},${destRef.current.lng}`} target="_blank" rel="noreferrer"
            style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, color: "#1a73e8", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
            {t.googleMaps}
          </a>
        </div>
      </div>

      {/* Bottom card */}
      <div style={{ background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -4px 24px rgba(0,0,0,.12)", padding: "16px 20px 28px", flexShrink: 0 }}>
        <div style={{ width: 40, height: 4, background: "#e0e0e0", borderRadius: 2, margin: "0 auto 14px" }} />

        {/* Job info */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{job.jobTitle?.en}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{job.location?.en}</div>
            {routeInfo && <div style={{ fontSize: 12, color: "#006491", marginTop: 2, fontWeight: 600 }}>{routeInfo.distKm} km · ~{routeInfo.timeMin} min</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#E8002A" }}>₹{job.salary}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{job.paymentMethod}</div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          {STEPS.map((step, i) => {
            const done = i <= STEPS.indexOf(status);
            const cur  = step === status;
            const sc   = STATUS_CONFIG[step];
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? sc.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "all .3s", boxShadow: cur ? `0 0 0 4px ${sc.color}30` : "none" }}>{done ? sc.icon : "○"}</div>
                  <div style={{ fontSize: 9, color: done ? sc.color : "#9ca3af", fontWeight: cur ? 700 : 400, textAlign: "center", lineHeight: 1.2, maxWidth: 52 }}>{sc.label}</div>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, marginBottom: 16, background: i < STEPS.indexOf(status) ? "#006491" : "#e5e7eb", transition: "background .3s" }} />}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {status === "accepted" && (
          <button onClick={() => updateStatus("on_the_way")} style={{ width: "100%", padding: "15px 0", background: "#006491", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,100,145,.35)" }}>
            {t.startNavigation}
          </button>
        )}
        {status === "on_the_way" && !arrived && (
          <div style={{ width: "100%", padding: "14px", background: "#f0f9ff", border: "2px solid #006491", borderRadius: 14, textAlign: "center", fontSize: 14, color: "#006491", fontWeight: 600 }}>
            {t.navigating}
          </div>
        )}
        {status === "on_the_way" && arrived && (
          <button onClick={() => updateStatus("arrived")} style={{ width: "100%", padding: "15px 0", background: "#10b981", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {t.iHaveArrived}
          </button>
        )}
        {status === "arrived" && (
          <button onClick={() => updateStatus("completed")} style={{ width: "100%", padding: "15px 0", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {t.markCompleted}
          </button>
        )}
        {status === "completed" && (
          <div style={{ textAlign: "center", padding: "16px", background: "#f0fdf4", borderRadius: 14, border: "2px solid #10b981" }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <div style={{ fontWeight: 700, color: "#065f46", fontSize: 16 }}>{t.jobCompleted}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{t.employerWillRate}</div>
            <button onClick={onClose} style={{ marginTop: 10, padding: "8px 20px", background: "#006491", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>{t.backToDashboard}</button>
          </div>
        )}
      </div>
      {/* Confirm close dialog */}
      {confirmClose && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {t.language === "hi" ? "नेविगेशन बंद करें?" : "Close Navigation?"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
              {t.language === "hi" ? "अगर आप बंद करते हैं तो रूट खो जाएगा।" : "If you close, you will lose your route and directions."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmClose(false)} style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                {t.language === "hi" ? "वापस जाएं" : "Keep Going"}
              </button>
              <button onClick={() => { setConfirmClose(false); onClose(); }} style={{ flex: 1, padding: "11px 0", background: "#E8002A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {t.language === "hi" ? "बंद करें" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══ MAIN DASHBOARD ════════════════════════════════════════════════════════
export default function WorkerDashboard() {
  const { language }              = useLanguage();
  const t                         = translations[language];
  const [alerts, setAlerts]       = useState([]);
  const [jobs, setJobs]           = useState([]);
  const [workerPos, setWorkerPos] = useState(null);
  const [gpsOn, setGpsOn]         = useState(false);
  const [activeNav, setActiveNav] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const watchRef                  = useRef(null);

  const [worker] = useState(() => {
    try { return JSON.parse(localStorage.getItem("worker")) || null; } catch { return null; }
  });

  // Earnings calculation
  const todayEarnings = jobs
    .filter(j => j.isCompleted && new Date(j.updatedAt).toDateString() === new Date().toDateString())
    .reduce((sum, j) => sum + (j.job?.salary || 0), 0);
  const weekEarnings = jobs
    .filter(j => j.isCompleted && (Date.now() - new Date(j.updatedAt)) < 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, j) => sum + (j.job?.salary || 0), 0);
  const totalJobs = jobs.filter(j => j.isCompleted).length;

  const enableGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    setGpsOn(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setWorkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  };

  useEffect(() => () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); }, []);

  useEffect(() => {
    if (!worker || !workerPos) return;
    fetch(`${BASE}/api/workers/job-alerts?lat=${workerPos.lat}&lng=${workerPos.lng}`)
      .then(r => r.json()).then(d => setAlerts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${BASE}/api/workers/job-history/${worker._id}`)
      .then(r => r.json()).then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [worker, workerPos]);

  const acceptJob = async (job) => {
    if (!worker) return;
    setAcceptingId(job._id);
    try {
      const res  = await fetch(`${BASE}/api/workers/accept-job`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker._id, jobId: job._id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Could not accept job"); return; }
      setActiveNav({ job, appId: data.applicationId });
    } catch { alert("Server error"); }
    finally { setAcceptingId(null); }
  };

  if (!worker) return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👷</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        {language === "hi" ? "लॉगिन करें या रजिस्टर करें" : language === "mr" ? "लॉगिन किंवा नोंदणी करा" : "Please Login or Register"}
      </div>
      <a href="/worker-login" style={{ display: "inline-block", background: "#006491", color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 16 }}>
        {language === "hi" ? "लॉगिन करें" : language === "mr" ? "लॉगिन करा" : "Login / Register"}
      </a>
    </div>
  );

  return (
    <>
      {activeNav && (
        <NavModal
          job={activeNav.job} appId={activeNav.appId}
          workerPos={workerPos} onClose={() => setActiveNav(null)} t={t}
        />
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#006491,#004f73)", color: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 4px 20px rgba(0,100,145,.3)" }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{t.workerDashboardTitle}</div>
          <div style={{ fontSize: 14, opacity: .85, marginTop: 4 }}>{t.welcome}, <b>{worker.name}</b></div>
          {gpsOn && workerPos && (
            <div style={{ marginTop: 10, background: "rgba(255,255,255,.15)", borderRadius: 8, padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
              {t.liveActive}
            </div>
          )}
        </div>

        {/* ── EARNINGS TRACKER ─────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>
            💰 {language === "hi" ? "मेरी कमाई" : language === "mr" ? "माझी कमाई" : "My Earnings"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: language === "hi" ? "आज" : language === "mr" ? "आज" : "Today",   value: `₹${todayEarnings}`, color: "#10b981", bg: "#f0fdf4" },
              { label: language === "hi" ? "इस हफ्ते" : language === "mr" ? "या आठवड्यात" : "This Week", value: `₹${weekEarnings}`, color: "#006491", bg: "#e8f4f8" },
              { label: language === "hi" ? "कुल काम" : language === "mr" ? "एकूण काम" : "Total Jobs",  value: totalJobs, color: "#8b5cf6", bg: "#f5f3ff" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", background: s.bg, borderRadius: 12, padding: "12px 6px" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* GPS button */}
        {!gpsOn && (
          <button onClick={enableGPS} style={{ width: "100%", padding: 14, marginBottom: 20, background: "#006491", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,100,145,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {t.enableLocationFull}
          </button>
        )}

        {/* Job Alerts */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            🔔 {t.newJobsNear}
            {alerts.length > 0 && <span style={{ background: "#E8002A", color: "#fff", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>{alerts.length}</span>}
          </div>

          {!gpsOn && (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 24, textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 600 }}>{t.enableToSee}</div>
            </div>
          )}

          {gpsOn && alerts.length === 0 && (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 24, textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>{t.noJobsNearby}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}><a href="/jobs" style={{ color: "#006491" }}>{t.browseJobs}</a></div>
            </div>
          )}

          {alerts.map(job => {
            const dist = workerPos && job.latitude && job.longitude
              ? haversine(workerPos.lat, workerPos.lng, job.latitude, job.longitude).toFixed(1) : null;
            return (
              <div key={job._id} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.08)", overflow: "hidden", border: "1px solid #f0f0f0" }}>
                {job.isUrgent && <div style={{ background: "#E8002A", color: "#fff", padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>🚨 {t.urgent}</div>}
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{job.jobTitle?.[language] || job.jobTitle?.en}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>📍 {job.location?.[language] || job.location?.en}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "#E8002A" }}>₹{job.salary}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{job.paymentMethod}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    {dist && <span style={{ background: "#e8f4f8", color: "#006491", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>📏 {dist} {t.kmAway}</span>}
                    {job.skills?.[language] && <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>🛠️ {job.skills[language]}</span>}
                  </div>

                  {/* Accept + Call buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => acceptJob(job)}
                      disabled={!!acceptingId}
                      style={{ flex: 1, padding: "13px 0", background: acceptingId === job._id ? "#9ca3af" : "#006491", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: acceptingId ? "not-allowed" : "pointer", boxShadow: acceptingId ? "none" : "0 4px 14px rgba(0,100,145,.3)" }}
                    >
                      {acceptingId === job._id ? t.accepting : t.acceptNavigate}
                    </button>
                    {job.contactInfo && (
                      <a href={`tel:${job.contactInfo}`} style={{ padding: "13px 16px", background: "#10b981", color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 18, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        📞
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Job History */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>📋 {t.jobHistory}</div>
          {jobs.length === 0 ? (
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 24, textAlign: "center", color: "#888" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 600 }}>{t.noJobsYet}</div>
            </div>
          ) : jobs.map(j => {
            const sc = STATUS_CONFIG[j.status] || STATUS_CONFIG.accepted;
            return (
              <div key={j._id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.06)", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f0f0f0" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{j.job?.jobTitle?.[language] || j.job?.jobTitle?.en}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{j.job?.location?.[language] || j.job?.location?.en}</div>
                  <div style={{ fontSize: 12, color: "#006491", marginTop: 2, fontWeight: 600 }}>₹{j.job?.salary}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>{sc.icon} {sc.label}</div>
                  {j.isCompleted && j.rating && <div style={{ fontSize: 12, marginTop: 4 }}>⭐ {j.rating}/5</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}