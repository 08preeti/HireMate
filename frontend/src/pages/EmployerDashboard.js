import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const workerMovingIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#f59e0b;border:3px solid #fff;box-shadow:0 3px 12px rgba(245,158,11,.5);display:flex;align-items:center;justify-content:center;font-size:20px">🚗</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: "",
});
const jobLocationIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#E8002A;border:3px solid #fff;box-shadow:0 3px 12px rgba(232,0,42,.5);display:flex;align-items:center;justify-content:center;font-size:20px">🏠</div>`,
  iconSize: [40, 40], iconAnchor: [20, 40], className: "",
});

const STATUS_CONFIG = {
  accepted:   { label: "Worker Accepted Job", icon: "✅", color: "#006491", bg: "#e8f4f8", notify: "A worker accepted your job!" },
  on_the_way: { label: "Worker On the Way",   icon: "🚗", color: "#f59e0b", bg: "#fffbeb", notify: "Worker is on the way to you!" },
  arrived:    { label: "Worker Arrived",      icon: "📍", color: "#10b981", bg: "#f0fdf4", notify: "Worker has arrived!" },
  completed:  { label: "Job Completed",       icon: "🎉", color: "#8b5cf6", bg: "#f5f3ff", notify: "Job done! Please rate the worker." },
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2-lat1)*Math.PI)/180, dLon = ((lon2-lon1)*Math.PI)/180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function RatingModal({ app, token, onDone }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await axios.post(`${BASE}/api/applications/rate/${app._id}`, { rating, review }, { headers: { Authorization: `Bearer ${token}` } });
      onDone();
    } catch { alert("Failed to save"); } finally { setSaving(false); }
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#fff",borderRadius:20,padding:28,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:28,textAlign:"center",marginBottom:4 }}>⭐</div>
        <div style={{ fontWeight:700,fontSize:18,textAlign:"center",marginBottom:4 }}>Rate the Worker</div>
        <div style={{ fontSize:13,color:"#888",textAlign:"center",marginBottom:20 }}>{app.worker?.name || app.applicantName}</div>
        <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:16 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)} style={{ fontSize:28,background:"none",border:"none",cursor:"pointer",opacity:n<=rating?1:.3,transform:n<=rating?"scale(1.1)":"scale(1)",transition:"all .15s" }}>⭐</button>
          ))}
        </div>
        <textarea placeholder="Write a review (optional)" value={review} onChange={e=>setReview(e.target.value)} style={{ width:"100%",padding:12,borderRadius:10,border:"1px solid #e0e0e0",fontSize:13,resize:"none",marginBottom:16,boxSizing:"border-box" }} rows={3} />
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onDone} style={{ flex:1,padding:12,background:"#f3f4f6",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600 }}>Skip</button>
          <button onClick={submit} disabled={saving} style={{ flex:2,padding:12,background:"#006491",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600 }}>{saving?"Saving…":"Submit Rating"}</button>
        </div>
      </div>
    </div>
  );
}

export default function EmployerDashboard() {
  const [jobs, setJobs]               = useState([]);
  const [totalApps, setTotalApps]     = useState(0);
  const [liveApps, setLiveApps]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [notifications, setNotifs]    = useState([]);
  const [ratingApp, setRatingApp]     = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const prevStatuses                  = useRef({});
  const navigate                      = useNavigate();
  const token = localStorage.getItem("employerToken");

  const fetchDashboard = useCallback(async () => {
    if (!token) { navigate("/employer-login"); return; }
    try {
      const res = await axios.get(`${BASE}/api/employer/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(res.data.jobs || []);
      setTotalApps(res.data.totalApplications || 0);
    } catch (err) {
      if (err.response?.status === 401) navigate("/employer-login");
    } finally { setLoading(false); }
  }, [token, navigate]);

  const fetchLive = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BASE}/api/applications/employer/live`, { headers: { Authorization: `Bearer ${token}` } });
      const apps = res.data.applications || [];
      setLiveApps(apps);
      apps.forEach(app => {
        const prev = prevStatuses.current[app._id];
        const curr = app.status;
        if (prev && prev !== curr && STATUS_CONFIG[curr]) {
          setNotifs(n => [{ id: Date.now()+Math.random(), text: STATUS_CONFIG[curr].notify, icon: STATUS_CONFIG[curr].icon, color: STATUS_CONFIG[curr].color, jobTitle: app.job?.jobTitle?.en, workerName: app.worker?.name || app.applicantName, status: curr, app }, ...n].slice(0, 5));
          if (curr === "completed") setRatingApp(app);
          if (Notification.permission === "granted") new Notification(`HireMate — ${STATUS_CONFIG[curr].label}`, { body: `${app.worker?.name || "Worker"} · ${app.job?.jobTitle?.en}` });
        }
        prevStatuses.current[app._id] = curr;
      });
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchDashboard(); fetchLive();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, [fetchDashboard, fetchLive]);

  if (loading) return <div style={{ padding:40,textAlign:"center",fontSize:18 }}>Loading…</div>;

  return (
    <>
      {ratingApp && <RatingModal app={ratingApp} token={token} onDone={() => { setRatingApp(null); fetchDashboard(); fetchLive(); }} />}

      {/* Worker tracking modal */}
      {selectedApp && (
        <div style={{ position:"fixed",inset:0,zIndex:8888,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-end" }}>
          <div style={{ background:"#fff",width:"100%",borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden",height:"85vh",display:"flex",flexDirection:"column" }}>
            <div style={{ padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f0f0f0" }}>
              <div>
                <div style={{ fontWeight:700,fontSize:16 }}>🗺️ Live Worker Location</div>
                <div style={{ fontSize:13,color:"#888" }}>{selectedApp.worker?.name} · {selectedApp.job?.jobTitle?.en}</div>
              </div>
              <button onClick={() => setSelectedApp(null)} style={{ background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600 }}>✕ Close</button>
            </div>
            {selectedApp.status && STATUS_CONFIG[selectedApp.status] && (
              <div style={{ background:STATUS_CONFIG[selectedApp.status].bg,padding:"8px 20px",display:"flex",alignItems:"center",gap:8,fontSize:13 }}>
                <span style={{ fontSize:18 }}>{STATUS_CONFIG[selectedApp.status].icon}</span>
                <span style={{ fontWeight:600,color:STATUS_CONFIG[selectedApp.status].color }}>{STATUS_CONFIG[selectedApp.status].label}</span>
                {selectedApp.worker?.currentLocation?.lat && selectedApp.job?.latitude && (
                  <span style={{ color:"#888",marginLeft:"auto" }}>
                    {haversine(selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng, selectedApp.job.latitude, selectedApp.job.longitude).toFixed(1)} km away
                  </span>
                )}
              </div>
            )}
            <div style={{ flex:1,minHeight:0 }}>
              {selectedApp.job?.latitude ? (
                <MapContainer center={selectedApp.worker?.currentLocation?.lat ? [selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng] : [selectedApp.job.latitude, selectedApp.job.longitude]} zoom={14} style={{ height:"100%",width:"100%" }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[selectedApp.job.latitude, selectedApp.job.longitude]} icon={jobLocationIcon}>
                    <Popup>🏠 Your Location<br />{selectedApp.job.location?.en}</Popup>
                  </Marker>
                  {selectedApp.worker?.currentLocation?.lat && (
                    <Marker position={[selectedApp.worker.currentLocation.lat, selectedApp.worker.currentLocation.lng]} icon={workerMovingIcon}>
                      <Popup>🚗 {selectedApp.worker.name}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              ) : (
                <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#888" }}>No location data</div>
              )}
            </div>
            <div style={{ padding:"16px 20px 24px",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700 }}>{selectedApp.worker?.name || selectedApp.applicantName}</div>
                <div style={{ fontSize:13,color:"#888" }}>📞 {selectedApp.worker?.phone || selectedApp.applicantContact}</div>
              </div>
              {selectedApp.status === "completed" && (
                <button onClick={() => { setSelectedApp(null); setRatingApp(selectedApp); }} style={{ padding:"10px 18px",background:"#8b5cf6",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13 }}>⭐ Rate Worker</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:800,margin:"0 auto",padding:"24px 16px",fontFamily:"sans-serif" }}>

        {/* Notifications */}
        {notifications.map(n => (
          <div key={n.id} style={{ background:"#fff",borderRadius:12,padding:"12px 16px",marginBottom:10,boxShadow:"0 4px 16px rgba(0,0,0,.12)",borderLeft:`4px solid ${n.color}`,display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:22 }}>{n.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:n.color }}>{n.text}</div>
              <div style={{ fontSize:12,color:"#888",marginTop:2 }}>{n.workerName} · {n.jobTitle}</div>
            </div>
            {n.app && <button onClick={() => { setSelectedApp(n.app); setNotifs(x => x.filter(i => i.id !== n.id)); }} style={{ padding:"6px 12px",background:n.color,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600 }}>Track →</button>}
            <button onClick={() => setNotifs(x => x.filter(i => i.id !== n.id))} style={{ background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:18 }}>✕</button>
          </div>
        ))}

        <Link to="/post-job" style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#E8002A",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:600,textDecoration:"none",marginBottom:20,boxShadow:"0 4px 14px rgba(232,0,42,.3)" }}>+ Post New Job</Link>

        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20 }}>
          {[{ label:"Jobs Posted",value:jobs.length,color:"#006491" },{ label:"Total Applicants",value:totalApps,color:"#E8002A" },{ label:"Active Now",value:liveApps.length,color:"#10b981" }].map(s => (
            <div key={s.label} style={{ background:"#fff",borderRadius:14,padding:"16px 14px",boxShadow:"0 2px 10px rgba(0,0,0,.07)",textAlign:"center" }}>
              <div style={{ fontSize:26,fontWeight:800,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12,color:"#888",marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Live workers */}
        {liveApps.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:17,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ width:10,height:10,background:"#10b981",borderRadius:"50%",display:"inline-block",animation:"pulse 1.5s infinite" }} />
              Workers Active Right Now
            </div>
            {liveApps.map(app => {
              const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.accepted;
              return (
                <div key={app._id} onClick={() => setSelectedApp(app)} style={{ background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,.08)",cursor:"pointer",border:`1px solid ${sc.color}30`,display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:44,height:44,borderRadius:"50%",background:sc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{sc.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:14 }}>{app.worker?.name || app.applicantName}</div>
                    <div style={{ fontSize:12,color:"#6b7280",marginTop:1 }}>{app.job?.jobTitle?.en}</div>
                    <span style={{ background:sc.bg,color:sc.color,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600 }}>{sc.label}</span>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontSize:12,color:app.worker?.currentLocation?.lat?"#10b981":"#9ca3af",fontWeight:600 }}>{app.worker?.currentLocation?.lat?"📡 Live":"No GPS"}</div>
                    <div style={{ fontSize:11,color:"#006491",marginTop:4,fontWeight:600 }}>Tap to track →</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Jobs list */}
        <div style={{ fontSize:17,fontWeight:700,marginBottom:12 }}>Your Jobs</div>
        {jobs.length === 0 ? (
          <div style={{ background:"#f8f9fa",borderRadius:12,padding:24,textAlign:"center",color:"#888" }}>
            <div style={{ fontSize:36,marginBottom:8 }}>📋</div>
            <div style={{ fontWeight:600 }}>No jobs posted yet</div>
            <Link to="/post-job" style={{ color:"#006491",fontWeight:600,fontSize:13 }}>Post your first job →</Link>
          </div>
        ) : jobs.map(job => (
          <div key={job._id} style={{ background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 10px rgba(0,0,0,.07)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",border:"1px solid #f0f0f0" }}>
            <div>
              <div style={{ fontWeight:700,fontSize:15,color:"#006491" }}>{job.jobTitle?.en}</div>
              <div style={{ fontSize:13,color:"#6b7280",marginTop:2 }}>📍 {job.location?.en}</div>
              <div style={{ fontSize:13,color:"#6b7280",marginTop:1 }}>₹{job.salary} · {job.applicationCount||0} applicants</div>
            </div>
            <span style={{ background:job.status==="active"?"#d1fae5":"#f3f4f6",color:job.status==="active"?"#065f46":"#6b7280",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600 }}>
              {job.status==="active"?"● Active":"Closed"}
            </span>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </>
  );
}