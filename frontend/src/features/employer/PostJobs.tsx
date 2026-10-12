"use client";

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { postJob } from "@/services/jobs";
import { fixLeafletIcons } from "@/lib/leaflet";
import type { JobFormData, LatLng } from "@/types";

interface LocationSuggestion {
  label: string;
  short: string;
  lat: number;
  lng: number;
  src: "photon" | "osm";
}

interface PhotonResponse {
  features?: {
    properties: Record<string, string | undefined>;
    geometry: { coordinates: [number, number] };
  }[];
}

interface NominatimItem {
  address?: Record<string, string | undefined>;
  display_name: string;
  lat: string;
  lon: string;
}


// ── Fix Leaflet icons ──────────────────────────────────────────────────────
fixLeafletIcons();

// Tailwind class strings that replace the old PostJobs.css rules
const FIELD  = "w-full p-3 border border-[#dddddd] rounded-md text-[14px]";
const INPUT  = `${FIELD} mb-3.5`;
const SELECT = "w-full p-2.5 mb-2.5 rounded-md border border-[#cccccc] text-[14px] bg-white cursor-pointer text-[#555555] font-medium focus:border-blue-600 focus:outline-none valid:text-black hover:bg-[#ffffe0]";

const redPin = new L.DivIcon({
  html: `<div class="relative w-8 h-[42px]">
    <div class="w-8 h-8 rounded-[50%_50%_50%_0] bg-danger border-[3px] border-white -rotate-45 shadow-[0_3px_10px_rgba(232,0,42,.5)]"></div>
    <div class="absolute top-1.5 left-1.5 w-3 h-3 rounded-full bg-white"></div></div>`,
  iconSize: [32, 42], iconAnchor: [16, 42], className: "",
});

function MapMover({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 17, { animate: true, duration: 0.8 }); }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
//  SEARCH — hits Photon + Nominatim in parallel, merges results
//  Photon (komoot) has much better Indian locality/street coverage
//  Nominatim gives detailed address breakdowns
// ─────────────────────────────────────────────────────────────────────────
async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const results: LocationSuggestion[] = [];

  const photonP = fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en&bbox=68.1,8.0,97.4,37.6`
  )
    .then((r) => r.json())
    .then((data: PhotonResponse) => {
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
          results.push({ label, short: p.name || parts[0] || label, lat, lng, src: "photon" });
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
    .then((data: NominatimItem[]) => {
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
  const unique: LocationSuggestion[] = [];
  for (const r of results) {
    const dup = unique.some(
      (u) => Math.abs(u.lat - r.lat) < 0.0015 && Math.abs(u.lng - r.lng) < 0.0015
    );
    if (!dup) unique.push(r);
  }
  return unique.slice(0, 9);
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
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
  const [formData, setFormData] = useState<JobFormData>({
    jobTitle: "", companyName: "", location: "",
    salary: "", skills: "", description: "",
    contactInfo: "", isUrgent: false, paymentMethod: "",
  });

  const [suggestions, setSuggestions]   = useState<LocationSuggestion[]>([]);
  const [searching, setSearching]       = useState(false);
  const [pinPos, setPinPos]             = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter]       = useState<[number, number]>([20.0, 74.7]);
  const [showMap, setShowMap]           = useState(false);
  const [pinLabel, setPinLabel]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                        = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLocationChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const selectSuggestion = (item: LocationSuggestion) => {
    setFormData({ ...formData, location: item.label });
    setSuggestions([]);
    setShowDropdown(false);
    setPinPos({ lat: item.lat, lng: item.lng });
    setMapCenter([item.lat, item.lng]);
    setPinLabel(item.label);
    setShowMap(true);
  };

  const handleMapClick = async (lat: number, lng: number) => {
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pinPos) { setShowMap(true); alert("Please pin the job location on the map."); return; }
    setLoading(true);
    try {
      await postJob({ ...formData, latitude: pinPos.lat, longitude: pinPos.lng });
      alert("Job posted successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to post job. Make sure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-0 text-center">
      <h2 className="mb-1">Post a Job</h2>
      <p className="text-[#888888] mb-5 text-[13px]">
        Workers will navigate directly to the location you pin on the map
      </p>

      <form className="max-w-[520px] mx-auto bg-white p-[25px] rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]" onSubmit={handleSubmit}>

        {/* Job type dropdown */}
        <select className={SELECT} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}>
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

        <input className={INPUT} name="jobTitle"    placeholder="Job Title"      value={formData.jobTitle}    onChange={handleChange} required />
        <input className={INPUT} name="companyName" placeholder="Company / Name" value={formData.companyName} onChange={handleChange} required />

        {/* ── LOCATION SEARCH ─────────────────────────────────────────── */}
        <div className="relative mb-1">

          <div className="flex gap-2">
            <div className="flex-1 relative">
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
                className={`${FIELD} pr-[34px] box-border`}
              />
              {searching && (
                <span className="absolute right-2.5 top-1/2 [transform:translateY(-50%)] text-[13px]">⏳</span>
              )}
              {!searching && formData.location && (
                <span
                  onMouseDown={() => { setFormData({ ...formData, location: "" }); setSuggestions([]); setPinPos(null); setPinLabel(""); }}
                  className="absolute right-2.5 top-1/2 [transform:translateY(-50%)] cursor-pointer text-[14px] text-[#aaaaaa]"
                >✕</span>
              )}
            </div>

            {/* GPS button */}
            <button
              type="button" onClick={useMyLocation} title="Use my GPS location"
              className="py-0 px-3.5 bg-brand text-white rounded-md cursor-pointer text-[18px] shrink-0 h-11"
            >📍</button>
          </div>

          {/* Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute top-[calc(100%_+_4px)] left-0 right-0 z-[99999] bg-white border border-[#e0e0e0] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.16)] list-none m-0 p-0 max-h-[300px] overflow-y-auto">
              {suggestions.map((item, i) => (
                <li
                  key={i}
                  onMouseDown={() => selectSuggestion(item)}
                  className={`py-3 px-4 cursor-pointer flex items-start gap-3 transition-[background] duration-100 ${i < suggestions.length - 1 ? "border-b border-b-neutral-100" : "border-b-0"}`}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7fa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  {/* Pin icon with subtle color difference */}
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[18px] border border-[#eeeeee] ${item.src === "photon" ? "bg-[#fff0f0]" : "bg-[#f0f0ff]"}`}>
                    {item.src === "photon" ? "🏠" : "📍"}
                  </div>
                  <div className="flex-1 min-w-[0px]">
                    <div className="font-semibold text-[14px] text-[#111111] leading-[1.3] mb-0.5">
                      {item.short}
                    </div>
                    <div className="text-[12px] text-[#888888] leading-[1.4] whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label.startsWith(item.short)
                        ? item.label.slice(item.short.length).replace(/^,\s*/, "")
                        : item.label}
                    </div>
                  </div>
                </li>
              ))}
              <li className="py-2 px-4 text-[11px] text-[#cccccc] border-t border-t-neutral-100 bg-zinc-50 rounded-bl-xl rounded-br-xl flex items-center gap-1.5">
                🗺️ OpenStreetMap
              </li>
            </ul>
          )}

          {/* No results */}
          {showDropdown && !searching && formData.location.length >= 2 && suggestions.length === 0 && (
            <div className="absolute top-[calc(100%_+_4px)] left-0 right-0 z-[99999] bg-white border border-[#e0e0e0] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] p-4 text-center">
              <div className="text-[24px] mb-1.5">🔍</div>
              <div className="text-[13px] text-[#555555] font-semibold">No results found</div>
              <div className="text-[11px] text-[#999999] mt-1 leading-normal">
                Try adding the city name:<br />
                <b>"Sambhaji Chowk Nashik"</b> or <b>"Untwadi Road Nashik"</b>
              </div>
            </div>
          )}
        </div>

        {/* Tip */}
        <p className="text-[11px] text-[#bbbbbb] mt-1 mx-0 mb-3 text-left">
          💡 Tip: Include city name for best results — e.g. <i>"Murli Apartment Nashik"</i>
        </p>

        {/* Map toggle */}
        <button
          type="button" onClick={() => setShowMap((v) => !v)}
          className={`w-full py-2.5 px-0 mb-3.5 text-brand border-[1.5px] border-dashed border-brand rounded-lg cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-2 ${showMap ? "bg-brand-light" : "bg-[#f8f8f8]"}`}
        >
          <span>{showMap ? "▲ Hide Map" : "🗺️  Pin Exact Location on Map"}</span>
          {pinPos && <span className="text-emerald-500 font-bold text-[12px]">✓ Pinned</span>}
        </button>

        {/* ── MAP ───────────────────────────────────────────────────── */}
        {showMap && (
          <div className="mb-4">
            {!pinPos ? (
              <div className="bg-amber-50 border border-amber-400 rounded-lg py-[9px] px-3 mb-2 text-[12px] text-amber-800 flex items-center gap-1.5">
                <span className="text-[16px]">👆</span>
                <span>Tap the map to drop a pin at the exact job location</span>
              </div>
            ) : (
              <div className="bg-green-50 border border-emerald-500 rounded-lg py-[9px] px-3 mb-2 text-[12px] text-emerald-800 flex items-start gap-1.5">
                <span className="text-[16px] shrink-0">✅</span>
                <div><b>Location pinned!</b><div className="opacity-80 mt-0.5">{pinLabel}</div></div>
              </div>
            )}

            <div className="h-[300px] rounded-xl overflow-hidden border-2 border-brand shadow-[0_4px_20px_rgba(0,100,145,.18)]">
              <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <MapClickHandler onMapClick={handleMapClick} />
                <MapMover center={mapCenter} />
                {pinPos && <Marker position={[pinPos.lat, pinPos.lng]} icon={redPin} />}
              </MapContainer>
            </div>
            <p className="text-[11px] text-[#aaaaaa] text-center mt-1.5">
              Workers navigate directly to this pin
            </p>
          </div>
        )}

        <input className={INPUT} name="salary"   placeholder="Salary (₹)"       value={formData.salary}   onChange={handleChange} required />
        <input className={INPUT} name="skills"   placeholder="Skills Required"   value={formData.skills}   onChange={handleChange} required />
        <textarea className={`${INPUT} min-h-[100px] resize-none`} name="description" placeholder="Job Description (optional)" value={formData.description} onChange={handleChange} />

        <select name="paymentMethod" className={SELECT} value={formData.paymentMethod} onChange={handleChange}>
          <option value="">Select Payment Method</option>
          <option value="Cash">💵 Cash</option>
          <option value="UPI">📱 UPI</option>
          <option value="After Work">🤝 After Work</option>
        </select>

        <input className={INPUT} name="contactInfo" placeholder="Contact Info" value={formData.contactInfo} onChange={handleChange} required />

        <div className="mt-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isUrgent" checked={formData.isUrgent}
              onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })} />
            🚨 Urgent Hiring
          </label>
        </div>

        {!pinPos && (
          <div className="py-2.5 px-3.5 bg-orange-50 border border-orange-200 rounded-lg text-[12px] text-orange-800 mt-3 flex gap-1.5 items-center">
            <span>⚠️</span>
            <span>Open the map and pin the job location so workers can navigate to you.</span>
          </div>
        )}

        <button
          type="submit" className={`w-full mt-5 py-3.5 px-0 bg-[#e60023] hover:bg-[#b4001a] text-white rounded-md text-[16px] font-semibold text-center cursor-pointer ${!pinPos || loading ? "opacity-[0.65]" : "opacity-100"}`}
          disabled={loading || !pinPos}
          
        >
          {loading ? "Posting…" : pinPos ? "Post Job ✅" : "Pin Location First"}
        </button>
      </form>
    </div>
  );
}