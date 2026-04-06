// import { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import {
// MapContainer,
// TileLayer,
// Marker,
// Popup,
// useMap
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-routing-machine";


// /* ROUTE COMPONENT */

// function Routing({ workerLocation, destination, setRouteInfo }) {

// const map = useMap();

// useEffect(()=>{

// if(!workerLocation || !destination) return;

// const control = L.Routing.control({

// waypoints:[
// L.latLng(workerLocation.lat,workerLocation.lng),
// L.latLng(destination.lat,destination.lng)
// ],

// lineOptions:{
// styles:[{color:"#0066ff",weight:5}]
// },

// addWaypoints:false,
// draggableWaypoints:false,
// fitSelectedRoutes:true,
// show:false

// })
// .on("routesfound",function(e){

// const route = e.routes[0];
// const distance = (route.summary.totalDistance/1000).toFixed(1);
// const time = (route.summary.totalTime/60).toFixed(0);

// setRouteInfo({distance,time});

// })
// .addTo(map);

// return ()=>{
// map.removeControl(control);
// };

// },[workerLocation,destination,map,setRouteInfo]);

// return null;

// }



// export default function JobNavigation(){

// const [searchParams] = useSearchParams();

// const lat = searchParams.get("lat");
// const lng = searchParams.get("lng");
// const address = searchParams.get("address");

// const [workerLocation,setWorkerLocation] = useState(null);
// const [routeInfo,setRouteInfo] = useState(null);



// /* LIVE GPS */

// const startTracking = () => {

//   navigator.geolocation.watchPosition((pos)=>{
//     setWorkerLocation({
//       lat:pos.coords.latitude,
//       lng:pos.coords.longitude
//     });
//   });

// };


// if(!lat || !lng) return <p>Loading...</p>;

// const destination = {
// lat:parseFloat(lat),
// lng:parseFloat(lng)
// };



// return(

// <div style={{height:"100vh",position:"relative"}}>

// {/* MAP */}

// {!workerLocation && (
//   <div style={{padding:"10px",background:"#fff"}}>
//     <button
//       onClick={startTracking}
//       style={{
//         padding:"10px 15px",
//         background:"#0066ff",
//         color:"white",
//         border:"none",
//         borderRadius:"8px"
//       }}
//     >
//       Enable Live Location
//     </button>
//   </div>
// )}



// <MapContainer
// center={[destination.lat,destination.lng]}
// zoom={13}
// style={{height:"100%",width:"100%"}}
// >

// <TileLayer
// url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
// />

// {/* WORKER MARKER */}

// {workerLocation && (

// <Marker position={[
// workerLocation.lat,
// workerLocation.lng
// ]}>
// <Popup>🚶 You</Popup>
// </Marker>

// )}

// {/* DESTINATION */}

// <Marker position={[
// destination.lat,
// destination.lng
// ]}>
// <Popup>📍 Job Location</Popup>
// </Marker>


// {/* ROUTE */}

// {workerLocation && (

// <Routing
// workerLocation={workerLocation}
// destination={destination}
// setRouteInfo={setRouteInfo}
// />

// )}

// </MapContainer>



// {/* UBER STYLE BOTTOM CARD */}

// <div style={{
// position:"absolute",
// bottom:"0",
// left:"0",
// right:"0",
// background:"white",
// padding:"20px",
// borderTopLeftRadius:"20px",
// borderTopRightRadius:"20px",
// boxShadow:"0 -4px 15px rgba(0,0,0,0.2)"
// }}>

// <h3 style={{marginBottom:"5px"}}>
// 📍 {address}
// </h3>

// {routeInfo ? (

// <>
// <p>
// 🛣 Distance: <b>{routeInfo.distance} km</b>
// </p>

// <p>
// ⏱ ETA: <b>{routeInfo.time} mins</b>
// </p>
// </>

// ):(

// <p>Calculating route...</p>

// )}

// <a
// href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
// target="_blank"
// rel="noreferrer"
// style={{
// display:"block",
// marginTop:"10px",
// background:"#0066ff",
// color:"white",
// textAlign:"center",
// padding:"12px",
// borderRadius:"10px",
// textDecoration:"none",
// fontWeight:"bold"
// }}
// >

// Start Navigation

// </a>

// </div>

// </div>

// );

// }  




//----------------------
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ─── ICONS ─────────────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const workerIcon = new L.DivIcon({
  html: `<div style="
    width:44px; height:44px; border-radius:50%;
    background:#006491; border:3px solid #fff;
    box-shadow:0 2px 12px rgba(0,100,145,0.5);
    display:flex; align-items:center; justify-content:center;
    font-size:20px;
  ">🚗</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  className: "",
});

const destIcon = new L.DivIcon({
  html: `<div style="
    width:44px; height:44px; border-radius:50%;
    background:#E8002A; border:3px solid #fff;
    box-shadow:0 2px 12px rgba(232,0,42,0.5);
    display:flex; align-items:center; justify-content:center;
    font-size:20px;
  ">📍</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  className: "",
});

// ─── MOVE MAP TO WORKER LOCATION ───────────────────────────────────────────
function FollowWorker({ pos }) {
  const map = useMap();
  const prevPos = useRef(null);
  useEffect(() => {
    if (!pos) return;
    // Only pan if moved more than ~50m
    if (!prevPos.current) {
      map.setView([pos.lat, pos.lng], 16, { animate: true, duration: 1 });
    } else {
      const dist = map.distance(
        [prevPos.current.lat, prevPos.current.lng],
        [pos.lat, pos.lng]
      );
      if (dist > 50) {
        map.setView([pos.lat, pos.lng], 16, { animate: true, duration: 1 });
      }
    }
    prevPos.current = pos;
  }, [pos, map]);
  return null;
}

// ─── HAVERSINE DISTANCE ────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── OSRM ROUTE FETCH ─────────────────────────────────────────────────────
async function fetchRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes.length) return null;
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distKm = (route.distance / 1000).toFixed(2);
    const timeMin = Math.round(route.duration / 60);
    const steps = route.legs[0].steps.map((s) => s.maneuver.instruction || s.name).filter(Boolean);
    return { coords, distKm, timeMin, steps };
  } catch {
    return null;
  }
}

// ─── VOICE INSTRUCTION ────────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// ─── STATUS STEPS ─────────────────────────────────────────────────────────
const STATUS_STEPS = ["accepted", "on_the_way", "arrived", "completed"];
const STATUS_LABELS = {
  accepted:    { label: "Job Accepted",    icon: "✅", color: "#006491" },
  on_the_way:  { label: "On the Way",      icon: "👷‍♂️", color: "#f59e0b" },
  arrived:     { label: "Arrived",         icon: "📍", color: "#10b981" },
  completed:   { label: "Job Completed",   icon: "🎉", color: "#8b5cf6" },
};

// ══════════════════════════════════════════════════════════════════════════
export default function JobNavigation() {
  const location   = useLocation();
  const params     = new URLSearchParams(location.search);
  const destLat    = parseFloat(params.get("lat"));
  const destLng    = parseFloat(params.get("lng"));
  const address    = params.get("address") || "Job Location";
  const appId      = params.get("appId");     // application _id for status update

  const dest = { lat: destLat, lng: destLng };

  const [workerPos, setWorkerPos]         = useState(null);
  const [routeCoords, setRouteCoords]     = useState([]);
  const [routeInfo, setRouteInfo]         = useState(null);   // { distKm, timeMin }
  const [nextStep, setNextStep]           = useState("");
  const [tracking, setTracking]           = useState(false);
  const [status, setStatus]               = useState("accepted");
  const [arrived, setArrived]             = useState(false);
  const [eta, setEta]                     = useState(null);   // HH:MM string
  const [routeLoading, setRouteLoading]   = useState(false);
  const [mapReady, setMapReady]           = useState(false);
  const watchIdRef                        = useRef(null);
  const lastRouteFetch                    = useRef(0);
  const prevStepRef                       = useRef("");

  // ─── FETCH ROUTE whenever worker moves significantly ─────────────────
  const refreshRoute = useCallback(async (pos) => {
    const now = Date.now();
    if (now - lastRouteFetch.current < 8000) return; // throttle 8s
    lastRouteFetch.current = now;

    setRouteLoading(true);
    const result = await fetchRoute(pos, dest);
    setRouteLoading(false);

    if (!result) return;
    setRouteCoords(result.coords);
    setRouteInfo({ distKm: result.distKm, timeMin: result.timeMin });

    // ETA
    const now2 = new Date();
    now2.setMinutes(now2.getMinutes() + result.timeMin);
    setEta(now2.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

    // Voice next step
    const step = result.steps[0];
    if (step && step !== prevStepRef.current) {
      speak(step);
      prevStepRef.current = step;
      setNextStep(step);
    }

    // Arrived check — within 80m
    const dist = haversine(pos.lat, pos.lng, dest.lat, dest.lng);
    if (dist < 0.08 && !arrived) {
      setArrived(true);
      setStatus("arrived");
      speak("You have arrived at the job location.");
    }
  }, [dest, arrived]);

  // ─── START GPS TRACKING ──────────────────────────────────────────────
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser");
      return;
    }
    setTracking(true);
    setStatus("on_the_way");
    speak("Navigation started. Head towards the job location.");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setWorkerPos(newPos);

        // Send location to backend
        try {
          const worker = JSON.parse(localStorage.getItem("worker"));
          if (worker) {
            await fetch(`${BASE}/api/workers/update-location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workerId: worker._id, lat: newPos.lat, lng: newPos.lng }),
            });
          }
        } catch {}

        await refreshRoute(newPos);
      },
      (err) => { console.error(err); alert("Please allow location access."); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  // ─── UPDATE JOB STATUS ───────────────────────────────────────────────
  const updateStatus = async (newStatus) => {
    setStatus(newStatus);
    if (newStatus === "completed") {
      speak("Job completed. Great work!");
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        setTracking(false);
      }
    }
    if (appId) {
      try {
        await fetch(`${BASE}/api/applications/status/${appId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {}
    }
  };

  // ─── CLEANUP ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ─── INVALID PARAMS CHECK ─────────────────────────────────────────────
  if (isNaN(destLat) || isNaN(destLng)) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>❌ Invalid job location</h2>
        <p>No coordinates found. Go back and accept a job first.</p>
      </div>
    );
  }

  const currentStatus = STATUS_LABELS[status];
  const distToJob = workerPos
    ? haversine(workerPos.lat, workerPos.lng, dest.lat, dest.lng).toFixed(2)
    : null;

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8f9fa" }}>

      {/* ── TOP STATUS BAR ── */}
      <div style={{
        background: currentStatus.color,
        color: "#fff",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 500,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{currentStatus.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{currentStatus.label}</div>
            {routeInfo && (
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {routeInfo.distKm} km away · ETA {eta || `~${routeInfo.timeMin} min`}
              </div>
            )}
          </div>
        </div>
        {routeLoading && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Updating route…</div>
        )}
      </div>

      {/* ── NEXT INSTRUCTION BANNER ── */}
      {nextStep && tracking && status !== "completed" && (
        <div style={{
          background: "#1a1a2e",
          color: "#fff",
          padding: "10px 20px",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 20 }}>🗣️</span>
          <span>{nextStep}</span>
        </div>
      )}

      {/* ── MAP ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <MapContainer
          center={workerPos ? [workerPos.lat, workerPos.lng] : [destLat, destLng]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          whenReady={() => setMapReady(true)}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &amp; CARTO'
          />

          {/* Destination marker */}
          <Marker position={[destLat, destLng]} icon={destIcon}>
            <Popup>
              <b>📍 Job Location</b><br />{address}
            </Popup>
          </Marker>

          {/* Worker marker */}
          {workerPos && (
            <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon}>
              <Popup>👷‍♂️ You are here</Popup>
            </Marker>
          )}

          {/* Route polyline */}
          {routeCoords.length > 0 && (
            <>
              {/* Outer glow line */}
              <Polyline
                positions={routeCoords}
                color="#006491"
                weight={10}
                opacity={0.25}
              />
              {/* Main route line */}
              <Polyline
                positions={routeCoords}
                color="#006491"
                weight={5}
                opacity={0.9}
                dashArray={status === "arrived" ? "8 4" : null}
              />
            </>
          )}

          {workerPos && <FollowWorker pos={workerPos} />}
        </MapContainer>

        {/* Zoom controls — custom position */}
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 1000,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {/* Google Maps button */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: "#1a73e8",
              textDecoration: "none",
              display: "block",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            🗺️ Google Maps
          </a>
        </div>
      </div>

      {/* ── BOTTOM UBER-STYLE CARD ── */}
      <div style={{
        background: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        padding: "20px 20px 32px",
        flexShrink: 0,
        zIndex: 500,
      }}>

        {/* Handle bar */}
        <div style={{
          width: 40, height: 4, background: "#e0e0e0",
          borderRadius: 2, margin: "0 auto 16px",
        }} />

        {/* Destination info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#fee2e2", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 20, flexShrink: 0,
          }}>📍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>
              {address}
            </div>
            {distToJob && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                {distToJob} km from your location
                {routeInfo && ` · ~${routeInfo.timeMin} min`}
              </div>
            )}
          </div>
        </div>

        {/* Progress steps */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20, padding: "12px 0",
        }}>
          {STATUS_STEPS.map((step, i) => {
            const stepIndex    = STATUS_STEPS.indexOf(status);
            const isDone       = i <= stepIndex;
            const isCurrent    = i === stepIndex;
            const info         = STATUS_LABELS[step];
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: isDone ? info.color : "#e5e7eb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, transition: "all 0.3s",
                    boxShadow: isCurrent ? `0 0 0 4px ${info.color}30` : "none",
                  }}>
                    {isDone ? info.icon : "○"}
                  </div>
                  <div style={{
                    fontSize: 10, marginTop: 4, color: isDone ? info.color : "#9ca3af",
                    fontWeight: isCurrent ? 700 : 400, textAlign: "center", lineHeight: 1.2,
                  }}>
                    {info.label.split(" ").map((w, j) => <div key={j}>{w}</div>)}
                  </div>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 20,
                    background: i < STATUS_STEPS.indexOf(status) ? "#006491" : "#e5e7eb",
                    transition: "background 0.3s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {!tracking && status === "accepted" && (
          <button
            onClick={startTracking}
            style={{
              width: "100%", padding: "16px 0",
              background: "#006491", color: "#fff",
              border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,100,145,0.35)",
            }}
          >
            🚀 Start Navigation
          </button>
        )}

        {tracking && status === "on_the_way" && arrived && (
          <button
            onClick={() => updateStatus("arrived")}
            style={{
              width: "100%", padding: "16px 0",
              background: "#10b981", color: "#fff",
              border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
            }}
          >
            📍 I Have Arrived
          </button>
        )}

        {tracking && status === "on_the_way" && !arrived && (
          <div style={{
            width: "100%", padding: "14px 0",
            background: "#f0f9ff",
            border: "2px solid #006491",
            borderRadius: 14, textAlign: "center",
            fontSize: 14, color: "#006491", fontWeight: 600,
          }}>
            🛣️ Navigating to job…
          </div>
        )}

        {status === "arrived" && (
          <button
            onClick={() => updateStatus("completed")}
            style={{
              width: "100%", padding: "16px 0",
              background: "#8b5cf6", color: "#fff",
              border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(139,92,246,0.35)",
            }}
          >
            🎉 Mark Job as Completed
          </button>
        )}

        {status === "completed" && (
          <div style={{
            textAlign: "center", padding: "16px 0",
            background: "#f0fdf4", borderRadius: 14,
            border: "2px solid #10b981",
          }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <div style={{ fontWeight: 700, color: "#065f46", fontSize: 16 }}>
              Job Completed!
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              The employer will rate your work shortly.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}