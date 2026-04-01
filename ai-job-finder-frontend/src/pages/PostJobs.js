/*import { useState } from "react";
import axios from "axios";
import "./PostJobs.css";

export default function PostJobs() {

  const [formData, setFormData] = useState({
    jobTitle: "",
    companyName: "",
    location: "",
    salary: "",
    skills: "",
    description: "",
    contactInfo: "",
    isUrgent: false,
    paymentMethod: ""
  });

  // ⭐ NEW: Suggestions state
  const [suggestions, setSuggestions] = useState([]);

  // ✅ Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ⭐ LOCATION INPUT WITH AUTOCOMPLETE
  const handleLocationChange = async (e) => {

    const value = e.target.value;

    setFormData({ ...formData, location: value });

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: value,
            format: "json",
            limit: 5
          }
        }
      );

      setSuggestions(res.data);

    } catch (err) {
      console.log(err);
    }
  };

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      // 🔥 GET LAT LNG
      const geoRes = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: formData.location,
            format: "json",
            limit: 1
          }
        }
      );

      // ❗ FIXED ERROR CHECK
      if (!geoRes.data || geoRes.data.length === 0) {
        alert("Please select location from suggestions");
        return;
      }

      const latitude = parseFloat(geoRes.data[0].lat);
      const longitude = parseFloat(geoRes.data[0].lon);

      // 🔥 SEND DATA
      await axios.post(
        "http://localhost:5000/api/jobs",
        {
          ...formData,
          latitude,
          longitude
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Job posted successfully ✅");

    } catch (err) {
      console.error(err);
      alert("Failed to post job");
    }
  };

  return (
    <div className="post-job-page">
      <h2>Post a Job</h2>

      <form className="post-job-card" onSubmit={handleSubmit}>

        
        <select
          className="job-dropdown"
          onChange={(e) =>
            setFormData({ ...formData, jobTitle: e.target.value })
          }
        >
        

          
          <option value="">Select Job Type (Optional)</option>

<option value="Electrician">Electrician</option>
<option value="Plumber">Plumber</option>
<option value="Carpenter">Carpenter</option>
<option value="Painter">Painter</option>
<option value="AC Technician">AC Technician</option>
<option value="Mechanic">Mechanic</option>
<option value="Mobile Repair Technician">Mobile Repair Technician</option>


<option value="Driver">Driver</option>
<option value="Auto Driver">Auto Driver</option>
<option value="Truck Driver">Truck Driver</option>
<option value="Delivery Boy">Delivery Boy</option>


<option value="House Maid">House Maid</option>
<option value="Cleaner">Cleaner</option>
<option value="Cook">Cook</option>
<option value="Babysitter">Babysitter</option>

<option value="Construction Worker">Construction Worker</option>
<option value="Mason">Mason</option>
<option value="Welder">Welder</option>
<option value="Tile Worker">Tile Worker</option>
<option value="Steel Fixer">Steel Fixer</option>


<option value="Shop Helper">Shop Helper</option>
<option value="Sales Boy">Sales Boy</option>
<option value="Cashier">Cashier</option>
<option value="Store Assistant">Store Assistant</option>


<option value="Security Guard">Security Guard</option>
<option value="Watchman">Watchman</option>
<option value="Gardener">Gardener</option>


<option value="Waiter">Waiter</option>
<option value="Kitchen Helper">Kitchen Helper</option>
<option value="Hotel Staff">Hotel Staff</option>


<option value="Factory Worker">Factory Worker</option>
<option value="Packing Worker">Packing Worker</option>
<option value="Machine Operator">Machine Operator</option>


<option value="Helper">Helper</option>
<option value="Labour">Labour</option>

        </select>

        <input name="jobTitle" placeholder="Job Title" value={formData.jobTitle} onChange={handleChange} required />
        <input name="companyName" placeholder="Company / Name" value={formData.companyName} onChange={handleChange} required />

        
        <input
          name="location"
          placeholder="Enter location"
          value={formData.location}
          onChange={handleLocationChange}
          required
        />

       
        {suggestions.length > 0 && (
          <ul style={{
            background: "#fff",
            border: "1px solid #ccc",
            maxHeight: "150px",
            overflowY: "auto",
            padding: 0,
            listStyle: "none",
            marginTop: "5px"
          }}>
            {suggestions.map((item, index) => (
              <li
                key={index}
                onClick={() => {
                  setFormData({
                    ...formData,
                    location: item.display_name
                  });
                  setSuggestions([]);
                }}
                style={{
                  padding: "8px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee"
                }}
              >
                {item.display_name}
              </li>
            ))}
          </ul>
        )}

        <input name="salary" placeholder="Salary" value={formData.salary} onChange={handleChange} required />
        <input name="skills" placeholder="Skills" value={formData.skills} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />

        <select
          name="paymentMethod"
          className="job-dropdown"
          value={formData.paymentMethod}
          onChange={handleChange}
        >
          <option value="">Select Payment Method</option>
          <option value="Cash">💵 Cash</option>
          <option value="UPI">📱 UPI</option>
          <option value="After Work">🤝 After Work</option>
        </select>

        <input name="contactInfo" placeholder="Contact Info" value={formData.contactInfo} onChange={handleChange} required />

        <div style={{ marginTop: "10px" }}>
          <label>
            <input
              type="checkbox"
              name="isUrgent"
              checked={formData.isUrgent}
              onChange={(e) =>
                setFormData({ ...formData, isUrgent: e.target.checked })
              }
            />
            🚨 Urgent Hiring
          </label>
        </div>

        <button type="submit" className="post-job-btn">Post Job</button>

      </form>
    </div>
  );
}    */


 //-----------------------
 
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./PostJobs.css";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ── Fix Leaflet icons ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redPin = new L.DivIcon({
  html: `<div style="position:relative;width:32px;height:42px">
    <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#E8002A;
      border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(232,0,42,.5)"></div>
    <div style="position:absolute;top:6px;left:6px;width:12px;height:12px;
      border-radius:50%;background:#fff"></div></div>`,
  iconSize: [32, 42], iconAnchor: [16, 42], className: "",
});

function MapMover({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 17, { animate: true, duration: 0.8 }); }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
//  SEARCH — hits Photon + Nominatim in parallel, merges results
//  Photon (komoot) has much better Indian locality/street coverage
//  Nominatim gives detailed address breakdowns
// ─────────────────────────────────────────────────────────────────────────
async function searchLocations(query) {
  const results = [];

  const photonP = fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en&bbox=68.1,8.0,97.4,37.6`
  )
    .then((r) => r.json())
    .then((data) => {
      (data.features || []).forEach((f) => {
        const p = f.properties;
        const parts = [
          p.name,
          p.housenumber,
          p.street,
          p.suburb || p.neighbourhood || p.district,
          p.city || p.town || p.village,
          p.state,
        ].filter(Boolean);
        const label = [...new Set(parts)].join(", ");
        const [lng, lat] = f.geometry.coordinates;
        if (lat && lng && label)
          results.push({ label, short: p.name || parts[0], lat, lng, src: "photon" });
      });
    })
    .catch(() => {});

  const osmP = fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=8&addressdetails=1&countrycodes=in&accept-language=en`,
    { headers: { "User-Agent": "HireMate/1.0" } }
  )
    .then((r) => r.json())
    .then((data) => {
      data.forEach((item) => {
        const a = item.address || {};
        const parts = [
          a.road || a.pedestrian || a.footway,
          a.neighbourhood || a.suburb || a.quarter,
          a.village || a.town || a.city_district,
          a.city || a.county,
          a.state,
        ].filter(Boolean);
        const label = parts.length > 1
          ? [...new Set(parts)].join(", ")
          : item.display_name.split(",").slice(0, 4).join(",");
        results.push({
          label,
          short: parts[0] || item.display_name.split(",")[0],
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          src: "osm",
        });
      });
    })
    .catch(() => {});

  await Promise.allSettled([photonP, osmP]);

  // Deduplicate — drop results within ~150m of an earlier one
  const unique = [];
  for (const r of results) {
    const dup = unique.some(
      (u) => Math.abs(u.lat - r.lat) < 0.0015 && Math.abs(u.lng - r.lng) < 0.0015
    );
    if (!dup) unique.push(r);
  }
  return unique.slice(0, 9);
}

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
      { headers: { "User-Agent": "HireMate/1.0" } }
    );
    const d = await r.json();
    const a = d.address || {};
    const parts = [
      a.road || a.pedestrian || a.neighbourhood,
      a.suburb || a.quarter,
      a.village || a.town || a.city_district,
      a.city || a.county,
      a.state,
    ].filter(Boolean);
    return [...new Set(parts)].join(", ") || d.display_name;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════
export default function PostJobs() {
  const [formData, setFormData] = useState({
    jobTitle: "", companyName: "", location: "",
    salary: "", skills: "", description: "",
    contactInfo: "", isUrgent: false, paymentMethod: "",
  });

  const [suggestions, setSuggestions]   = useState([]);
  const [searching, setSearching]       = useState(false);
  const [pinPos, setPinPos]             = useState(null);
  const [mapCenter, setMapCenter]       = useState([20.0, 74.7]);
  const [showMap, setShowMap]           = useState(false);
  const [pinLabel, setPinLabel]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef                     = useRef(null);
  const inputRef                        = useRef(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, location: value });
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchLocations(value);
      setSuggestions(res);
      setSearching(false);
      setShowDropdown(true);
    }, 300);
  };

  const selectSuggestion = (item) => {
    setFormData({ ...formData, location: item.label });
    setSuggestions([]);
    setShowDropdown(false);
    setPinPos({ lat: item.lat, lng: item.lng });
    setMapCenter([item.lat, item.lng]);
    setPinLabel(item.label);
    setShowMap(true);
  };

  const handleMapClick = async (lat, lng) => {
    setPinPos({ lat, lng });
    const addr = await reverseGeocode(lat, lng);
    setFormData((prev) => ({ ...prev, location: addr }));
    setPinLabel(addr);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPinPos({ lat, lng });
        setMapCenter([lat, lng]);
        setShowMap(true);
        const addr = await reverseGeocode(lat, lng);
        setFormData((prev) => ({ ...prev, location: addr }));
        setPinLabel(addr);
        setSuggestions([]);
      },
      () => alert("Please allow location access.")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pinPos) { setShowMap(true); alert("Please pin the job location on the map."); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("employerToken");
      await axios.post(
        `${BASE}/api/jobs`,
        { ...formData, latitude: pinPos.lat, longitude: pinPos.lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Job posted successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to post job. Make sure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-job-page">
      <h2 style={{ marginBottom: 4 }}>Post a Job</h2>
      <p style={{ color: "#888", marginBottom: 20, fontSize: 13 }}>
        Workers will navigate directly to the location you pin on the map
      </p>

      <form className="post-job-card" onSubmit={handleSubmit}>

        {/* Job type dropdown */}
        <select className="job-dropdown" onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}>
          <option value="">Select Job Type (Optional)</option>
          <optgroup label="Home Services">
            {["Electrician","Plumber","Carpenter","Painter","AC Technician","Mechanic","Mobile Repair Technician"].map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="Driving & Delivery">
            {["Driver","Auto Driver","Truck Driver","Delivery Boy"].map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="House Work">
            {["House Maid","Cleaner","Cook","Babysitter"].map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="Construction">
            {["Construction Worker","Mason","Welder","Tile Worker","Steel Fixer"].map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="Shop & Service">
            {["Shop Helper","Sales Boy","Cashier","Security Guard","Gardener","Waiter","Kitchen Helper"].map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="Factory & General">
            {["Factory Worker","Packing Worker","Machine Operator","Helper","Labour"].map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
        </select>

        <input name="jobTitle"    placeholder="Job Title"      value={formData.jobTitle}    onChange={handleChange} required />
        <input name="companyName" placeholder="Company / Name" value={formData.companyName} onChange={handleChange} required />

        {/* ── LOCATION SEARCH ─────────────────────────────────────────── */}
        <div style={{ position: "relative", marginBottom: 4 }}>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                name="location"
                placeholder="Type area, street, landmark, chowk…"
                value={formData.location}
                onChange={handleLocationChange}
                onFocus={() => formData.location.length >= 2 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                required
                autoComplete="off"
                style={{ width: "100%", paddingRight: 34, marginBottom: 0, boxSizing: "border-box" }}
              />
              {searching && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>⏳</span>
              )}
              {!searching && formData.location && (
                <span
                  onMouseDown={() => { setFormData({ ...formData, location: "" }); setSuggestions([]); setPinPos(null); setPinLabel(""); }}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 14, color: "#aaa" }}
                >✕</span>
              )}
            </div>

            {/* GPS button */}
            <button
              type="button" onClick={useMyLocation} title="Use my GPS location"
              style={{ padding: "0 14px", background: "#006491", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 18, flexShrink: 0, height: 44 }}
            >📍</button>
          </div>

          {/* Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              zIndex: 99999, background: "#fff",
              border: "1px solid #e0e0e0", borderRadius: 12,
              boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
              listStyle: "none", margin: 0, padding: 0,
              maxHeight: 300, overflowY: "auto",
            }}>
              {suggestions.map((item, i) => (
                <li
                  key={i}
                  onMouseDown={() => selectSuggestion(item)}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    borderBottom: i < suggestions.length - 1 ? "1px solid #f5f5f5" : "none",
                    display: "flex", alignItems: "flex-start", gap: 12,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7fa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  {/* Pin icon with subtle color difference */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: item.src === "photon" ? "#fff0f0" : "#f0f0ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, border: "1px solid #eee",
                  }}>
                    {item.src === "photon" ? "🏠" : "📍"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111", lineHeight: 1.3, marginBottom: 2 }}>
                      {item.short}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label.startsWith(item.short)
                        ? item.label.slice(item.short.length).replace(/^,\s*/, "")
                        : item.label}
                    </div>
                  </div>
                </li>
              ))}
              <li style={{
                padding: "8px 16px", fontSize: 11, color: "#ccc",
                borderTop: "1px solid #f5f5f5", background: "#fafafa",
                borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                🗺️ OpenStreetMap
              </li>
            </ul>
          )}

          {/* No results */}
          {showDropdown && !searching && formData.location.length >= 2 && suggestions.length === 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 99999,
              background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              padding: "16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>No results found</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4, lineHeight: 1.5 }}>
                Try adding the city name:<br />
                <b>"Sambhaji Chowk Nashik"</b> or <b>"Untwadi Road Nashik"</b>
              </div>
            </div>
          )}
        </div>

        {/* Tip */}
        <p style={{ fontSize: 11, color: "#bbb", margin: "4px 0 12px", textAlign: "left" }}>
          💡 Tip: Include city name for best results — e.g. <i>"Murli Apartment Nashik"</i>
        </p>

        {/* Map toggle */}
        <button
          type="button" onClick={() => setShowMap((v) => !v)}
          style={{
            width: "100%", padding: "10px 0", marginBottom: 14,
            background: showMap ? "#e8f4f8" : "#f8f8f8",
            color: "#006491", border: "1.5px dashed #006491",
            borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <span>{showMap ? "▲ Hide Map" : "🗺️  Pin Exact Location on Map"}</span>
          {pinPos && <span style={{ color: "#10b981", fontWeight: 700, fontSize: 12 }}>✓ Pinned</span>}
        </button>

        {/* ── MAP ───────────────────────────────────────────────────── */}
        {showMap && (
          <div style={{ marginBottom: 16 }}>
            {!pinPos ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 8, padding: "9px 12px", marginBottom: 8, fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>👆</span>
                <span>Tap the map to drop a pin at the exact job location</span>
              </div>
            ) : (
              <div style={{ background: "#f0fdf4", border: "1px solid #10b981", borderRadius: 8, padding: "9px 12px", marginBottom: 8, fontSize: 12, color: "#065f46", display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                <div><b>Location pinned!</b><div style={{ opacity: 0.8, marginTop: 2 }}>{pinLabel}</div></div>
              </div>
            )}

            <div style={{ height: 300, borderRadius: 12, overflow: "hidden", border: "2px solid #006491", boxShadow: "0 4px 20px rgba(0,100,145,.18)" }}>
              <MapContainer center={mapCenter} zoom={15} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <MapClickHandler onMapClick={handleMapClick} />
                <MapMover center={mapCenter} />
                {pinPos && <Marker position={[pinPos.lat, pinPos.lng]} icon={redPin} />}
              </MapContainer>
            </div>
            <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 6 }}>
              Workers navigate directly to this pin
            </p>
          </div>
        )}

        <input name="salary"   placeholder="Salary (₹)"       value={formData.salary}   onChange={handleChange} required />
        <input name="skills"   placeholder="Skills Required"   value={formData.skills}   onChange={handleChange} required />
        <textarea name="description" placeholder="Job Description (optional)" value={formData.description} onChange={handleChange} />

        <select name="paymentMethod" className="job-dropdown" value={formData.paymentMethod} onChange={handleChange}>
          <option value="">Select Payment Method</option>
          <option value="Cash">💵 Cash</option>
          <option value="UPI">📱 UPI</option>
          <option value="After Work">🤝 After Work</option>
        </select>

        <input name="contactInfo" placeholder="Contact Info" value={formData.contactInfo} onChange={handleChange} required />

        <div style={{ marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" name="isUrgent" checked={formData.isUrgent}
              onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })} />
            🚨 Urgent Hiring
          </label>
        </div>

        {!pinPos && (
          <div style={{ padding: "10px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 12, color: "#9a3412", marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <span>⚠️</span>
            <span>Open the map and pin the job location so workers can navigate to you.</span>
          </div>
        )}

        <button
          type="submit" className="post-job-btn"
          disabled={loading || !pinPos}
          style={{ opacity: (!pinPos || loading) ? 0.65 : 1, marginTop: 16 }}
        >
          {loading ? "Posting…" : pinPos ? "Post Job ✅" : "Pin Location First"}
        </button>
      </form>
    </div>
  );
}