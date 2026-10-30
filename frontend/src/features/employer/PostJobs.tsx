"use client";

import { useState, useRef, useEffect, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import {
  FiBox, FiCheck, FiChevronRight, FiClock, FiCrosshair, FiEdit2, FiHome, FiInfo, FiLayers,
  FiMapPin, FiMaximize2, FiMoon, FiNavigation, FiPhone, FiSend, FiStar, FiSun, FiTool,
  FiTruck, FiZap, FiEdit3, FiSearch, FiPlus, FiCoffee, FiShield, FiDroplet, FiScissors,
} from "react-icons/fi";
import { postJob } from "@/services/jobs";
import { fixLeafletIcons } from "@/lib/leaflet";
import { useAuth } from "@/context/AuthContext";
import EmployerTopNav from "@/components/layout/EmployerTopNav";
import type { LatLng } from "@/types";

// ── Location search types ──────────────────────────────────────────────────
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

fixLeafletIcons();

// Default map centre: Nashik
const DEFAULT_CENTER: [number, number] = [19.9975, 73.7898];

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

// Photon (better Indian locality coverage) + Nominatim (detailed addresses), merged.
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
          p.name, p.housenumber, p.street,
          p.suburb || p.neighbourhood || p.district,
          p.city || p.town || p.village, p.state,
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
          a.city || a.county, a.state,
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

  // Drop results within ~150m of an earlier one
  const unique: LocationSuggestion[] = [];
  for (const r of results) {
    const dup = unique.some((u) => Math.abs(u.lat - r.lat) < 0.0015 && Math.abs(u.lng - r.lng) < 0.0015);
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
      a.city || a.county, a.state,
    ].filter(Boolean);
    return [...new Set(parts)].join(", ") || d.display_name;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ── Static option lists ────────────────────────────────────────────────────
const JOB_GROUPS: { key: string; label: string; icon: ReactNode; jobs: string[] }[] = [
  { key: "construction", label: "Construction & Civil", icon: <FiHome />, jobs: [
    "Construction Helper", "Mason / Rajmistri", "Concrete Worker", "Bar Bender / Steel Fixer", "Shuttering Carpenter",
    "Scaffolder", "Tile / Marble Fitter", "Plasterer", "Waterproofing Worker", "Road Construction Labour",
    "Paver Block Worker", "JCB / Crane Operator", "Site Supervisor / Mukadam", "Demolition Labour", "Borewell / Well Digger",
    "False Ceiling Worker", "Glass & Aluminium Fitter", "Stone Cutter", "Brick Layer",
  ] },
  { key: "electrical", label: "Electrical & Repair", icon: <FiZap />, jobs: [
    "Electrician", "Wireman", "AC Technician", "Fridge / Washing Machine Technician", "Solar Panel Installer",
    "CCTV Installer", "Mobile Repair Technician", "TV / Appliance Repair", "Inverter / Battery Technician",
    "Generator Mechanic", "Lift Technician", "Lineman / Cable Puller", "Computer / Laptop Technician", "RO / Water Purifier Technician",
  ] },
  { key: "mechanical", label: "Plumbing & Mechanical", icon: <FiTool />, jobs: [
    "Plumber", "Pipe Fitter", "Sanitary Fitter", "Pump / Motor Mechanic", "Welder", "Fabricator",
    "Lathe / Turner", "Fitter", "Machine Operator", "Gas Pipeline Fitter", "Bike Mechanic", "Car Mechanic",
    "Tyre / Puncture Repair", "Car Denter / Painter", "Auto Electrician", "Truck Mechanic",
  ] },
  { key: "painting", label: "Painting & Carpentry", icon: <FiEdit3 />, jobs: [
    "Painter", "Polisher", "POP / Gypsum Worker", "Texture / Wallpaper Painter", "Carpenter", "Furniture Maker",
    "Modular Kitchen Installer", "Sign Board / Flex Installer", "Door & Window Fitter", "Upholstery Worker",
  ] },
  { key: "driving", label: "Driving & Delivery", icon: <FiTruck />, jobs: [
    "Car Driver", "Auto Rickshaw Driver", "Truck Driver", "Tempo / Pickup Driver", "Bus Driver", "Tractor Driver",
    "Cab Driver", "Forklift Operator", "Bike Delivery Rider", "Courier Delivery Boy", "Packers & Movers Helper",
    "Vehicle Cleaner / Helper", "Driver Cum Helper", "School Van Driver",
  ] },
  { key: "factory", label: "Warehouse & Factory", icon: <FiBox />, jobs: [
    "Warehouse & Loader", "Packing Worker", "Factory Worker", "General Helper / Labour", "Quality Checker",
    "Sorting Worker", "Hamal / Mathadi (Loading-Unloading)", "Tailor / Stitching Worker", "Textile / Power Loom Worker",
    "Garment Ironing Worker", "Food Processing Worker", "Dispatch Helper", "Store Keeper", "Printing Press Worker",
    "Bakery Helper", "Brick Kiln Worker",
  ] },
  { key: "home", label: "Housekeeping & Home Help", icon: <FiStar />, jobs: [
    "House Maid", "Cook", "Babysitter / Nanny", "Elderly Care Attendant", "Patient Attendant / Ward Boy",
    "Post-Work Cleaner", "Office Cleaner", "Sweeper", "Dishwasher", "Laundry / Dhobi", "Gardener / Mali",
    "Pest Control Worker", "Car Washer", "Water Tank Cleaner", "Sofa / Carpet Cleaner", "Home Shifting Helper",
  ] },
  { key: "hospitality", label: "Hotel, Food & Retail", icon: <FiCoffee />, jobs: [
    "Waiter", "Kitchen Helper", "Chef / Head Cook", "Tandoor / Roti Maker", "Chai / Tea Maker", "Cashier",
    "Sales Boy / Girl", "Shop Helper", "Street Food Helper", "Catering Boy", "Event Helper", "Tent / Decoration Worker",
    "Banquet Staff", "Sound / DJ Helper", "Hotel Room Boy", "Delivery Packer",
  ] },
  { key: "security", label: "Security & Office", icon: <FiShield />, jobs: [
    "Security Guard", "Watchman", "Gatekeeper", "Society Caretaker", "Peon / Office Boy", "Receptionist",
    "Data Entry Operator", "Telecaller", "Office Helper", "Lift Operator", "Parking Attendant", "Bouncer",
  ] },
  { key: "farm", label: "Agriculture & Outdoor", icon: <FiDroplet />, jobs: [
    "Farm Labour", "Harvesting Worker", "Sugarcane Cutter", "Fruit / Vegetable Picker", "Nursery / Plant Worker",
    "Dairy / Cattle Worker", "Poultry Worker", "Irrigation Worker", "Fishing Worker", "Tree Cutter / Climber",
    "Sheep / Goat Herder", "Grain Loader",
  ] },
  { key: "personal", label: "Beauty & Personal Services", icon: <FiScissors />, jobs: [
    "Barber / Hair Cutter", "Beautician", "Massage Therapist", "Mehendi Artist", "Cobbler",
    "Tailor (Ladies / Gents)", "Photographer", "Videographer", "Pharmacy Helper", "Salon Helper",
  ] },
];

const CUSTOM_JOBS_KEY = "hiremate_custom_jobs";
const ALL_JOBS = JOB_GROUPS.flatMap((g) => g.jobs.map((label) => ({ label, group: g.key, icon: g.icon })));

type ShiftKey = "day" | "night" | "half";
const SHIFTS: { key: ShiftKey; title: string; time: string; note: string; icon: ReactNode }[] = [
  { key: "day", title: "Standard Day Shift", time: "08:00 AM – 05:00 PM", note: "9 hrs (includes 1 hr lunch)", icon: <FiSun /> },
  { key: "night", title: "Night Shift", time: "08:00 PM – 04:00 AM", note: "8 hrs night allowance", icon: <FiMoon /> },
  { key: "half", title: "Half Day / Hourly", time: "4 Hours Flexible", note: "Short turnaround", icon: <FiClock /> },
];

type DateMode = "today" | "tomorrow" | "custom";
const DATES: { key: DateMode; title: string; sub: string }[] = [
  { key: "today", title: "Today", sub: "Immediate Start" },
  { key: "tomorrow", title: "Tomorrow", sub: "Morning 08:00 AM" },
  { key: "custom", title: "Custom Date", sub: "Multi-day booking" },
];

const PERKS = ["Free Lunch / Chai", "Safety Helmets", "Travel Allowance", "Filtered Water & Shade"];

// Values stay compatible with what the backend / AI scoring already expects.
const SETTLEMENTS = [
  { value: "Cash", label: "Cash at end of the day" },
  { value: "UPI", label: "UPI / Bank transfer" },
  { value: "After Work", label: "After work is completed" },
];

// ── Small UI helpers ───────────────────────────────────────────────────────
const LABEL = "block text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase mb-2";
const INPUT =
  "w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100";

function SectionCard({ n, title, subtitle, badge, children }: { n: number; title: string; subtitle: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,.04)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 shrink-0 rounded-lg bg-red-50 text-red-600 font-bold text-[14px] flex items-center justify-center">{n}</span>
          <div>
            <h2 className="text-[18px] font-bold text-slate-900 leading-tight">{title}</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Tile({ active, onClick, children, className = "" }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 text-left cursor-pointer transition-colors ${
        active ? "border-red-500 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Check({ checked, onChange, children, className = "" }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer text-[13px] text-slate-700 ${className}`}>
      <span className={`w-[18px] h-[18px] shrink-0 rounded flex items-center justify-center border ${checked ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-300"}`}>
        {checked && <FiCheck size={12} strokeWidth={3} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ══════════════════════════════════════════════════════════════════════════
export default function PostJobs() {
  const { employer } = useAuth();

  // 1 · Role
  const [trade, setTrade] = useState("Construction Helper");
  const [groupKey, setGroupKey] = useState("construction");
  const [jobSearch, setJobSearch] = useState("");
  const [customJobs, setCustomJobs] = useState<string[]>([]);
  const [addingJob, setAddingJob] = useState(false);
  const [newJob, setNewJob] = useState("");
  const lastAutoTitle = useRef("");
  const [jobTitle, setJobTitle] = useState("");
  const [workers, setWorkers] = useState(1);
  const [company, setCompany] = useState("");

  // 2 · Site
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pinPos, setPinPos] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [satellite, setSatellite] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [gateNote, setGateNote] = useState("");
  const [phone, setPhone] = useState("");

  // 3 · Shift
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [customDate, setCustomDate] = useState("");
  const [shift, setShift] = useState<ShiftKey>("day");
  const [overtime, setOvertime] = useState(false);
  const [otRate, setOtRate] = useState("120");

  // 4 · Wage
  const [wage, setWage] = useState("");
  const [settlement, setSettlement] = useState("Cash");
  const [perks, setPerks] = useState<string[]>([]);

  // Urgent + note
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState("");

  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill the hiring entity with the signed-in company.
  useEffect(() => {
    if (employer?.companyName) setCompany((c) => c || employer.companyName || "");
  }, [employer?.companyName]);

  // "Quick worker request" links from the employer dashboard arrive as /post-job?skill=Driver.
  useEffect(() => {
    const skill = new URLSearchParams(window.location.search).get("skill");
    if (!skill) return;
    setJobTitle((t) => t || skill);
    const s = skill.toLowerCase();
    const hit =
      ALL_JOBS.find((j) => j.label.toLowerCase() === s) ??
      ALL_JOBS.find((j) => j.label.toLowerCase().includes(s) || s.includes(j.label.toLowerCase()));
    if (hit) { setTrade(hit.label); setGroupKey(hit.group); } else setTrade(skill);
  }, []);

  // Saved custom jobs (this browser only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_JOBS_KEY);
      const list: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) setCustomJobs(list.filter((x): x is string => typeof x === "string"));
    } catch { /* storage unavailable */ }
  }, []);

  const saveCustomJobs = (list: string[]) => {
    setCustomJobs(list);
    try { localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  };

  // Selecting a job also fills the title, unless the employer already typed their own.
  const pickJob = (label: string) => {
    setTrade(label);
    if (!jobTitle.trim() || jobTitle === lastAutoTitle.current) {
      setJobTitle(label);
      lastAutoTitle.current = label;
    }
  };

  const addCustomJob = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) return;
    const lower = name.toLowerCase();
    const known = ALL_JOBS.find((j) => j.label.toLowerCase() === lower);
    const mine = customJobs.find((j) => j.toLowerCase() === lower);
    if (known) { setGroupKey(known.group); pickJob(known.label); }
    else if (mine) { setGroupKey("custom"); pickJob(mine); }
    else { saveCustomJobs([...customJobs, name]); setGroupKey("custom"); pickJob(name); }
    setNewJob("");
    setAddingJob(false);
    setJobSearch("");
  };

  const removeCustomJob = (name: string) => saveCustomJobs(customJobs.filter((j) => j !== name));

  const q = jobSearch.trim().toLowerCase();
  const customTiles = customJobs.map((label) => ({ label, icon: <FiPlus />, custom: true }));
  const visibleJobs: { label: string; icon: ReactNode; custom?: boolean }[] = q
    ? [...ALL_JOBS, ...customTiles].filter((j) => j.label.toLowerCase().includes(q))
    : groupKey === "custom"
      ? customTiles
      : ALL_JOBS.filter((j) => j.group === groupKey);

  const wageNum = Number(wage) || 0;
  const total = workers * wageNum;
  const shiftInfo = SHIFTS.find((s) => s.key === shift)!;


  // ── Location handlers ────────────────────────────────────────────────────
  const onLocationInput = (value: string) => {
    setLocation(value);
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
    setLocation(item.label);
    setSuggestions([]);
    setShowDropdown(false);
    setPinPos({ lat: item.lat, lng: item.lng });
    setMapCenter([item.lat, item.lng]);
  };

  // Click on the map or drag of the pin: move the pin and refresh the address.
  const movePin = async (lat: number, lng: number) => {
    setPinPos({ lat, lng });
    const addr = await reverseGeocode(lat, lng);
    setLocation(addr);
  };

  const detectGps = () => {
    if (!navigator.geolocation) { setError("Geolocation is not supported on this device."); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMapCenter([lat, lng]);
        setSuggestions([]);
        await movePin(lat, lng);
        setDetecting(false);
      },
      () => { setDetecting(false); setError("Please allow location access to detect GPS."); }
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const digits = phone.replace(/\D/g, "");
    if (!jobTitle.trim()) return setError("Please enter a job title.");
    if (!company.trim()) return setError("Please enter the hiring entity / contractor name.");
    if (workers < 1) return setError("At least 1 worker is needed.");
    if (!location.trim() || !pinPos) return setError("Please search the site address or tap the map to pin the exact gate location.");
    if (digits.length !== 10) return setError("Enter a valid 10-digit on-site contact number.");
    if (dateMode === "custom" && !customDate) return setError("Please choose the work date.");
    if (wageNum <= 0) return setError("Please enter the daily wage per worker.");

    const dateLabel =
      dateMode === "today" ? "Today (immediate start)"
      : dateMode === "tomorrow" ? "Tomorrow, 08:00 AM"
      : customDate;

    // The backend stores one description text, so the extra details travel inside it.
    const description = [
      `${trade} — ${workers} worker${workers > 1 ? "s" : ""} needed.`,
      `Work date: ${dateLabel}.`,
      `Shift: ${shiftInfo.title} (${shiftInfo.time}).`,
      overtime && Number(otRate) > 0 ? `Overtime paid extra at ₹${Number(otRate)}/hour beyond shift hours.` : "",
      perks.length ? `Provided: ${perks.join(", ")}.` : "",
      gateNote.trim() ? `Gate instructions: ${gateNote.trim()}` : "",
      note.trim() ? `Note: ${note.trim()}` : "",
    ].filter(Boolean).join(" ");

    setLoading(true);
    try {
      await postJob({
        jobTitle: jobTitle.trim(),
        companyName: company.trim(),
        location: location.trim(),
        latitude: pinPos.lat,
        longitude: pinPos.lng,
        salary: wageNum,
        skills: trade,
        description,
        contactInfo: `+91${digits}`,
        paymentMethod: settlement,
        isUrgent: urgent,
      });
      setPosted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("Failed to post job. Make sure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6FA] font-app text-slate-900">
      <EmployerTopNav />

      {/* ── Title area ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-3">
            <Link href="/employer-dashboard" className="no-underline text-slate-500 hover:text-slate-800">Dashboard</Link>
            <FiChevronRight size={12} />
            <span className="text-slate-900 font-semibold">Post a Job &amp; Request Workers</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight leading-tight">Post a Job &amp; Request Workers</h1>
              <p className="text-[14px] text-slate-600 mt-1.5 max-w-[620px]">
                Find daily-wage helpers, skilled tradesmen and loaders. Pin your site gate so workers can navigate straight to you.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-[13px] font-semibold">
              <button
                type="button"
                onClick={() => setUrgent(false)}
                className={`rounded-lg px-3.5 py-2 cursor-pointer ${!urgent ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
              >
                Standard Posting
              </button>
              <button
                type="button"
                onClick={() => setUrgent(true)}
                className={`rounded-lg px-3.5 py-2 cursor-pointer flex items-center gap-1.5 ${urgent ? "bg-white shadow-sm text-red-600" : "text-slate-500"}`}
              >
                <FiZap className="text-amber-500" /> Urgent Dispatch
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form + summary ──────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex-1 w-full max-w-[1400px] mx-auto px-4 lg:px-8 py-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-6 min-w-0">

          {/* 1 · Role & requirements */}
          <SectionCard n={1} title="Job Role & Worker Requirements" subtitle="Select the worker trade or describe the site task" badge={<span className="text-[12px] font-semibold text-red-600 bg-red-50 rounded px-2.5 py-1">Required</span>}>
            <span className={LABEL}>Select worker trade / category</span>

            {/* Search all jobs */}
            <div className="relative mb-3">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={jobSearch} onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search all jobs — mason, driver, cook, electrician…"
                className={`${INPUT} pl-10`} aria-label="Search jobs"
              />
            </div>

            {/* Category chips */}
            {!q && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {[...JOB_GROUPS.map((g) => ({ key: g.key, label: g.label })), ...(customJobs.length ? [{ key: "custom", label: "My Added Jobs" }] : [])].map((g) => (
                  <button
                    key={g.key} type="button" onClick={() => setGroupKey(g.key)}
                    className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold cursor-pointer ${
                      groupKey === g.key ? "border-red-500 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            {/* Job tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 max-h-[300px] overflow-y-auto pr-1">
              {visibleJobs.map((j) => (
                <Tile key={j.label} active={trade === j.label} onClick={() => pickJob(j.label)} className="relative min-h-[72px] flex flex-col items-center justify-center gap-1.5 px-2 py-2 text-center">
                  <span className={`text-[18px] ${trade === j.label ? "text-red-600" : "text-slate-500"}`}>{j.icon}</span>
                  <span className="text-[12.5px] font-semibold text-slate-800 leading-tight">{j.label}</span>
                  {j.custom && (
                    <span
                      role="button" aria-label={`Remove ${j.label}`}
                      onClick={(e) => { e.stopPropagation(); removeCustomJob(j.label); }}
                      className="absolute top-1 right-1.5 text-[12px] text-slate-400 hover:text-red-500"
                    >✕</span>
                  )}
                </Tile>
              ))}

              {/* Add your own job */}
              {!addingJob && (
                <button
                  type="button" onClick={() => { setAddingJob(true); setNewJob(q ? jobSearch.trim() : ""); }}
                  className="min-h-[72px] rounded-lg border-2 border-dashed border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600 flex flex-col items-center justify-center gap-1.5 px-2 cursor-pointer"
                >
                  <FiPlus className="text-[18px]" />
                  <span className="text-[12.5px] font-semibold">Add other job</span>
                </button>
              )}
            </div>

            {q && visibleJobs.length === 0 && (
              <p className="text-[13px] text-slate-500 mb-3">No job matches &quot;{jobSearch}&quot;. Use <b>Add other job</b> to create it.</p>
            )}

            {addingJob && (
              <div className="flex gap-2 mb-3">
                <input
                  autoFocus value={newJob} onChange={(e) => setNewJob(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomJob(newJob); } }}
                  placeholder="Type the job name, e.g. Tent Decorator" maxLength={60}
                  className={INPUT} aria-label="New job name"
                />
                <button type="button" onClick={() => addCustomJob(newJob)} className="h-11 shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold px-4 cursor-pointer">Add</button>
                <button type="button" onClick={() => { setAddingJob(false); setNewJob(""); }} className="h-11 shrink-0 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-semibold px-3 cursor-pointer">Cancel</button>
              </div>
            )}

            <p className="text-[12.5px] text-slate-500 mb-6">Selected job: <b className="text-slate-900">{trade}</b></p>

            <div className="grid sm:grid-cols-[1fr_200px] gap-4 mb-4">
              <div>
                <label className={LABEL} htmlFor="jobTitle">Job title / primary task details *</label>
                <div className="relative">
                  <input id="jobTitle" className={`${INPUT} pr-10`} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Site helpers for shuttering & concrete pouring" />
                  <FiEdit2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="mt-2 text-[12px] text-blue-600 flex items-center gap-1.5"><FiInfo /> Add the specific task for faster acceptances.</p>
              </div>
              <div>
                <span className={LABEL}>Workers needed *</span>
                <div className="flex h-11 rounded-lg border border-slate-200 overflow-hidden">
                  <button type="button" onClick={() => setWorkers((w) => Math.max(1, w - 1))} className="w-11 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer" aria-label="Fewer workers">-</button>
                  <input
                    type="number" min={1} max={500} value={workers}
                    onChange={(e) => setWorkers(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    className="flex-1 min-w-0 text-center font-bold text-[15px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Workers needed"
                  />
                  <button type="button" onClick={() => setWorkers((w) => Math.min(500, w + 1))} className="w-11 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer" aria-label="More workers">+</button>
                </div>
              </div>
            </div>

            <label className={LABEL} htmlFor="company">Hiring entity / contractor name</label>
            <input id="company" className={INPUT} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company or contractor name" />
          </SectionCard>

          {/* 2 · Site & map */}
          <SectionCard n={2} title="Job Site Navigation & Exact Map Pin" subtitle="Workers navigate straight to the gate you mark" badge={<span className="hidden sm:flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 rounded px-2.5 py-1"><FiCrosshair /> GPS Precision Pin</span>}>
            <span className={LABEL}>Site address / chowk / landmark *</span>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1 min-w-0">
                <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500" />
                <input
                  className={`${INPUT} pl-10 pr-9`}
                  value={location}
                  onChange={(e) => onLocationInput(e.target.value)}
                  onFocus={() => location.length >= 2 && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Type area, street, landmark, chowk…"
                  autoComplete="off"
                />
                {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px]">⏳</span>}
                {!searching && location && (
                  <span
                    onMouseDown={() => { setLocation(""); setSuggestions([]); setPinPos(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[14px] text-slate-400"
                  >✕</span>
                )}

                {showDropdown && suggestions.length > 0 && (
                  <ul className="absolute top-[calc(100%+4px)] left-0 right-0 z-[1000] bg-white border border-slate-200 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.16)] list-none m-0 p-0 max-h-[300px] overflow-y-auto">
                    {suggestions.map((item, i) => (
                      <li
                        key={i}
                        onMouseDown={() => selectSuggestion(item)}
                        className="py-3 px-4 cursor-pointer flex items-start gap-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                      >
                        <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[16px] border border-slate-100 ${item.src === "photon" ? "bg-red-50" : "bg-indigo-50"}`}>
                          {item.src === "photon" ? "🏠" : "📍"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[14px] text-slate-900 leading-snug">{item.short}</div>
                          <div className="text-[12px] text-slate-500 truncate">
                            {item.label.startsWith(item.short) ? item.label.slice(item.short.length).replace(/^,\s*/, "") : item.label}
                          </div>
                        </div>
                      </li>
                    ))}
                    <li className="py-2 px-4 text-[11px] text-slate-400 border-t border-slate-100 bg-slate-50 rounded-b-xl">🗺️ OpenStreetMap</li>
                  </ul>
                )}
                {showDropdown && !searching && location.length >= 2 && suggestions.length === 0 && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[1000] bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
                    <div className="text-[13px] text-slate-600 font-semibold">No results found</div>
                    <div className="text-[12px] text-slate-500 mt-1">Try adding the city, e.g. <b>&quot;Sambhaji Chowk Nashik&quot;</b></div>
                  </div>
                )}
              </div>
              <button
                type="button" onClick={detectGps} disabled={detecting}
                className="h-11 shrink-0 rounded-lg bg-[#0B1228] text-white text-[13px] font-semibold px-4 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <FiNavigation /> {detecting ? "Detecting…" : "Detect GPS"}
              </button>
            </div>

            <p className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-[12px] px-3 py-2 mb-4">
              <b>Pro Tip:</b> Always include the local chowk or labor naka name so workers recognise the meeting spot immediately.
            </p>

            {/* Map */}
            <div className="isolate relative h-[300px] rounded-xl overflow-hidden border border-slate-200">
              <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
                {satellite ? (
                  <TileLayer
                    key="sat"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri"
                  />
                ) : (
                  <TileLayer
                    key="map"
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  />
                )}
                <MapClickHandler onMapClick={movePin} />
                <MapMover center={mapCenter} />
                {pinPos && (
                  <Marker
                    position={[pinPos.lat, pinPos.lng]}
                    icon={redPin}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = (e.target as L.Marker).getLatLng();
                        movePin(ll.lat, ll.lng);
                      },
                    }}
                  >
                    <Tooltip permanent direction="bottom" offset={[0, 4]}>Drag to move gate pin</Tooltip>
                  </Marker>
                )}
              </MapContainer>

              {!pinPos && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] rounded-full bg-white/95 shadow px-3.5 py-1.5 text-[12px] font-semibold text-slate-700 pointer-events-none">
                  Tap the map to drop the gate pin
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center justify-between gap-3 rounded-lg bg-white/95 shadow px-3 py-2 text-[12px]">
                <span className="flex items-center gap-2 text-slate-700 min-w-0">
                  <FiMapPin className="text-red-500 shrink-0" />
                  <span className="truncate">
                    {pinPos ? `${pinPos.lat.toFixed(4)}° N, ${pinPos.lng.toFixed(4)}° E (exact entrance)` : "No pin yet"}
                  </span>
                </span>
                <button type="button" onClick={() => setSatellite((s) => !s)} className="shrink-0 flex items-center gap-1.5 text-red-600 font-bold cursor-pointer">
                  {satellite ? <FiLayers /> : <FiMaximize2 />} {satellite ? "Map View" : "Full Satellite View"}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label className={LABEL} htmlFor="gate">Specific gate instructions / landmark note</label>
                <input id="gate" className={INPUT} value={gateNote} onChange={(e) => setGateNote(e.target.value)} placeholder="e.g. Gate 3, opposite the metro pillar" />
              </div>
              <div>
                <label className={LABEL} htmlFor="phone">On-site gate contact &amp; WhatsApp *</label>
                <div className="flex h-11 rounded-lg border border-slate-200 overflow-hidden focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
                  <span className="flex items-center gap-1.5 px-3 bg-slate-50 border-r border-slate-200 text-[13px] text-slate-700"><FiPhone size={13} /> +91</span>
                  <input
                    id="phone" inputMode="numeric" maxLength={10}
                    value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 min-w-0 px-3.5 text-[14px] outline-none" placeholder="98230 44192"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 3 · Shift */}
          <SectionCard n={3} title="Shift Timings & Reporting Schedule" subtitle="Specify the date and shift so workers can plan their turnup">
            <span className={LABEL}>Work date</span>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {DATES.map((d) => (
                <Tile key={d.key} active={dateMode === d.key} onClick={() => setDateMode(d.key)} className="py-3 px-2 text-center">
                  <span className="block text-[13px] font-bold text-slate-900">{d.title}</span>
                  <span className="block text-[11.5px] text-slate-500 mt-0.5">{d.sub}</span>
                </Tile>
              ))}
            </div>
            {dateMode === "custom" && (
              <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={`${INPUT} max-w-[240px] mb-3`} aria-label="Custom work date" />
            )}

            <div className="grid sm:grid-cols-3 gap-3 mt-3 mb-4">
              {SHIFTS.map((s) => (
                <Tile key={s.key} active={shift === s.key} onClick={() => setShift(s.key)} className="p-3.5">
                  <span className="flex items-start justify-between">
                    <span className="text-[13px] font-bold text-slate-900">{s.title}</span>
                    <span className={shift === s.key ? "text-amber-500" : "text-blue-500"}>{s.icon}</span>
                  </span>
                  <span className="block text-[12.5px] text-slate-700 mt-2">{s.time}</span>
                  <span className="block text-[11.5px] text-slate-400 mt-1">{s.note}</span>
                </Tile>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Check checked={overtime} onChange={setOvertime}>Overtime paid extra beyond shift hours</Check>
              {overtime && (
                <span className="flex items-center gap-1 text-[13px] text-slate-700">
                  at ₹
                  <input
                    inputMode="numeric" value={otRate} onChange={(e) => setOtRate(e.target.value.replace(/\D/g, ""))}
                    className="w-16 h-8 rounded-md border border-slate-200 px-2 text-[13px] outline-none focus:border-red-400" aria-label="Overtime rate per hour"
                  />
                  / hour
                </span>
              )}
            </div>
          </SectionCard>

          {/* 4 · Wage */}
          <SectionCard n={4} title="Daily Wage, Perks & Payment Mode" subtitle="Clear pricing attracts more workers">
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className={LABEL} htmlFor="wage">Daily wage rate per worker (₹ / day) *</label>
                <div className="flex h-12 items-center rounded-lg border border-slate-200 px-3.5 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
                  <span className="text-slate-500 mr-2">₹</span>
                  <input
                    id="wage" inputMode="numeric" value={wage}
                    onChange={(e) => setWage(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 min-w-0 text-[18px] font-bold outline-none" placeholder="850"
                  />
                  <span className="text-[12px] text-slate-400">/ Day</span>
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="settle">Worker settlement method *</label>
                <select
                  id="settle" value={settlement} onChange={(e) => setSettlement(e.target.value)}
                  className={`${INPUT} h-12 cursor-pointer`}
                >
                  {SETTLEMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <span className={LABEL}>On-site amenities &amp; perks provided</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PERKS.map((p) => (
                <div key={p} className="rounded-lg border border-slate-200 px-3 py-3">
                  <Check
                    checked={perks.includes(p)}
                    onChange={(v) => setPerks((cur) => (v ? [...cur, p] : cur.filter((x) => x !== p)))}
                  >
                    {p}
                  </Check>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Urgent + note */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="rounded-xl border border-red-100 bg-red-50/70 p-4 flex items-start gap-4">
              <span className="w-11 h-11 shrink-0 rounded-lg bg-red-500 text-white flex items-center justify-center text-[20px]"><FiZap /></span>
              <div className="flex-1">
                <h3 className="text-[15px] font-bold text-slate-900">Activate Urgent Hiring Priority</h3>
                <p className="text-[12.5px] text-slate-600 mt-1">Marks the job as urgent and pins it to the top of the worker feed so it gets seen first.</p>
              </div>
              <button
                type="button" role="switch" aria-checked={urgent} onClick={() => setUrgent((u) => !u)}
                className={`relative w-12 h-7 rounded-full shrink-0 cursor-pointer transition-colors ${urgent ? "bg-red-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${urgent ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            <label className={`${LABEL} mt-6`} htmlFor="note">Specific instructions / worker note (optional)</label>
            <textarea
              id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="e.g. Please bring your own steel measuring tape if possible. Must carry a valid Aadhaar card."
              className="w-full rounded-lg border border-slate-200 p-3.5 text-[14px] placeholder:text-slate-400 outline-none resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </section>
        </div>

        {/* ── Summary ────────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,.08)]">
            <div className="bg-[#0B1228] text-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-[0.1em] text-slate-300">ESTIMATED SUMMARY</span>
                <span className={`text-[10px] font-bold rounded px-2 py-0.5 ${urgent ? "bg-red-500/20 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                  {urgent ? "URGENT" : "STANDARD"}
                </span>
              </div>
              <h3 className="text-[22px] font-extrabold mt-2">Daily Gig Budget</h3>
              <p className="text-[12.5px] text-slate-400 mt-1">Live calculation for this booking</p>
            </div>

            <div className="p-5">
              {posted && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[13px] p-3">
                  <b>Job posted ✅</b>
                  <div className="mt-1">
                    <Link href="/employer-dashboard" className="text-emerald-700 font-semibold underline">View on dashboard</Link>
                  </div>
                </div>
              )}

              <dl className="text-[13.5px] text-slate-600 space-y-3">
                <div className="flex justify-between gap-3">
                  <dt>Worker wage (<b className="text-slate-800">{workers} worker{workers > 1 ? "s" : ""}</b> × ₹{wageNum.toLocaleString("en-IN")})</dt>
                  <dd className="font-semibold text-slate-900 whitespace-nowrap">{fmt(total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Shift</dt>
                  <dd className="text-slate-900 text-right">{shiftInfo.title}</dd>
                </div>
                {overtime && Number(otRate) > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Overtime (per worker)</dt>
                    <dd className="text-slate-900">₹{Number(otRate)} / hour</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt>Payment</dt>
                  <dd className="text-slate-900 text-right">{SETTLEMENTS.find((s) => s.value === settlement)?.label}</dd>
                </div>
              </dl>

              <div className="border-t border-slate-100 mt-5 pt-5 flex items-end justify-between gap-3">
                <span className="text-[15px] font-bold text-slate-900">Total wage budget</span>
                <span className="text-[30px] font-extrabold tracking-tight leading-none">{fmt(total).replace(/\.00$/, "")}</span>
              </div>
              <p className="text-right text-[11.5px] text-slate-400 mt-1.5">Excludes overtime and any perks you provide</p>

              {error && (
                <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[12.5px] p-3">{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                className="mt-5 w-full h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[14.5px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <FiSend /> {loading ? "Publishing…" : urgent ? "Publish & Dispatch Urgently" : "Publish Job"}
              </button>
              <Link
                href="/employer-dashboard"
                className="mt-3 w-full h-11 rounded-lg border border-slate-200 text-slate-700 font-semibold text-[13.5px] flex items-center justify-center no-underline hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </div>
        </aside>
      </form>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 flex items-center gap-3 text-[12.5px] text-slate-500">
          <span className="bg-red-500 text-white font-extrabold text-[10px] rounded px-1.5 py-1">HM</span>
          <span><b className="text-slate-700">HireMate</b> — On-demand daily wage work</span>
        </div>
      </footer>
    </div>
  );
}