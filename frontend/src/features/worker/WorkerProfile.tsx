"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  FiCalendar, FiCamera, FiCheck, FiCheckCircle, FiChevronRight, FiClock, FiCpu, FiEdit2, FiFileText, FiHeadphones, FiMapPin, FiPhone, FiPlus, FiSearch, FiShield, FiStar, FiTrash2, FiUpload, FiUser, FiX,
} from "react-icons/fi";
import { HERO_PEOPLE } from "@/features/home/homeAssets";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { getMyJobs, getWorkerProfile, updateWorkerProfile } from "@/services/workers";
import type { Application, Worker } from "@/types";

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

function getSkillEmoji(skill?: string): string {
  const found = SKILL_OPTIONS.find((s) => s.value.toLowerCase() === (skill || "").toLowerCase());
  return found ? found.emoji : "👷";
}

interface StoredDoc { name: string; type: string; dataUrl: string; addedAt: string }
interface LocalDocs { aadhaar?: StoredDoc; licence?: StoredDoc; other?: StoredDoc[] }
type DocSlot = "aadhaar" | "licence" | "other";
const MAX_OTHER_DOCS = 5;

/** Images are shrunk to ~1280px JPEG so they fit in browser storage; PDFs must be under 1 MB. */
async function fileToStoredDoc(file: File): Promise<StoredDoc> {
  const read = () =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Could not read the file"));
      r.readAsDataURL(file);
    });
  const addedAt = new Date().toISOString();
  if (file.type === "application/pdf") {
    if (file.size > 1024 * 1024) throw new Error("PDF must be under 1 MB");
    return { name: file.name, type: file.type, dataUrl: await read(), addedAt };
  }
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo or a PDF");
  const src = await read();
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not read the image"));
    i.src = src;
  });
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { name: file.name, type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.75), addedAt };
}

const CARD = "rounded-2xl border border-[#e3eaf5] bg-white shadow-[0_4px_18px_rgba(20,50,110,0.05)]";

type DocState = "verified" | "pending" | "added" | "none";

function StatusChip({ state, label }: { state: DocState; label: string }) {
  const cls = state === "verified" ? "bg-[#dff6e8] text-[#0b8a4c]" : state === "pending" ? "bg-[#fff3d6] text-[#a15c00]" : state === "added" ? "bg-[#e3efff] text-[#1a4fb0]" : "bg-[#eef1f7] text-[#8a96ae]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${cls}`}>
      {state === "verified" && <FiCheckCircle size={12} aria-hidden="true" />}
      {label}
    </span>
  );
}

function Stat({ icon, iconBg, label, children, action }: { icon: ReactNode; iconBg: string; label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-[#e9eef7] px-4 py-4 last:border-b-0 sm:px-5 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-[#6b7a95]">{label}</div>
        <div className="text-[19px] font-extrabold leading-tight text-[#0d2250]">{children}</div>
      </div>
      {action}
    </div>
  );
}

export default function WorkerProfile() {
  const { language } = useLanguage();
  const t = translations[language];
  const { worker: sessionWorker, setWorker: cacheWorker } = useAuth();
  const sessionWorkerId = sessionWorker?._id ?? sessionWorker?.id;
  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  const [worker, setWorker] = useState<Worker | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSkill, setEditSkill] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", skills: "" });
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [available, setAvailable] = useState(true);
  const [activity, setActivity] = useState<Application[]>([]);
  const [localDocs, setLocalDocs] = useState<LocalDocs>({});
  const [docModal, setDocModal] = useState<DocSlot | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<DocSlot>("aadhaar");

  useEffect(() => {
    // The route guard guarantees a worker session; this just narrows the type.
    const savedWorker = sessionWorker;
    if (!savedWorker) return;

    const id = savedWorker._id || savedWorker.id;
    const useSaved = () => {
      setWorker(savedWorker);
      setForm({ name: savedWorker.name || "", location: savedWorker.location || "", skills: savedWorker.skills || "" });
    };
    if (id) {
      getWorkerProfile(id)
        .then((data) => {
          if (data && data._id) {
            setWorker(data);
            setForm({ name: data.name || "", location: data.location || "", skills: data.skills || "" });
          } else {
            useSaved();
          }
        })
        .catch(useSaved);
    } else {
      useSaved();
    }

    // Saved photo + availability are per-device settings kept in the browser.
    try {
      const savedPhoto = localStorage.getItem(`workerPhoto_${savedWorker._id || savedWorker.phone}`);
      if (savedPhoto) setPhoto(savedPhoto);
      const v = localStorage.getItem("hm_available");
      if (v !== null) setAvailable(v === "1");
      const rawDocs = localStorage.getItem(`workerDocs_${savedWorker._id || savedWorker.phone}`);
      if (rawDocs) setLocalDocs(JSON.parse(rawDocs) as LocalDocs);
    } catch { /* storage unavailable or corrupt */ }

    if (savedWorker.phone) getMyJobs(savedWorker.phone).then((d) => setActivity(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionWorkerId]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB"); return; }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhoto(base64);
      try { localStorage.setItem(`workerPhoto_${worker?._id || worker?.phone}`, base64); } catch { /* ignore */ }
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!worker) return;
    if (!form.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const id = worker._id || worker.id;
      if (!id) throw new Error("Missing worker id");
      await updateWorkerProfile(id, form);
      const updated: Worker = { ...worker, ...form };
      setWorker(updated);
      cacheWorker(updated);
      setEditing(false);
      setEditSkill(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message || "Update failed" : "Update failed");
    }
    setSaving(false);
  };

  const docsKey = `workerDocs_${worker?._id || worker?.phone}`;
  const persistDocs = (next: LocalDocs) => {
    try {
      localStorage.setItem(docsKey, JSON.stringify(next));
      setLocalDocs(next);
    } catch {
      alert(L("Not enough storage on this device. Try a smaller file.", "इस डिवाइस पर जगह कम है। छोटी फ़ाइल चुनें।", "या डिव्हाइसवर जागा कमी आहे. लहान फाइल निवडा."));
    }
  };
  const pickFile = (slot: DocSlot) => {
    pendingSlot.current = slot;
    docInputRef.current?.click();
  };
  const onDocChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file) return;
    const slot = pendingSlot.current;
    setDocBusy(true);
    try {
      const doc = await fileToStoredDoc(file);
      persistDocs(slot === "other" ? { ...localDocs, other: [...(localDocs.other || []), doc].slice(-MAX_OTHER_DOCS) } : { ...localDocs, [slot]: doc });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    }
    setDocBusy(false);
  };
  const removeDoc = (slot: DocSlot, index = 0) => {
    if (!window.confirm(L("Remove this document?", "यह दस्तावेज़ हटाएँ?", "हे कागदपत्र काढायचे?"))) return;
    if (slot === "other") {
      const rest = (localDocs.other || []).filter((_, i) => i !== index);
      persistDocs({ ...localDocs, other: rest });
      if (rest.length === 0) setDocModal(null);
    } else {
      const next = { ...localDocs };
      delete next[slot];
      persistDocs(next);
      setDocModal(null);
    }
  };

  if (!worker) return <div className="p-10 text-center text-[16px] text-gray-500">Loading profile…</div>;

  const rating = parseFloat(String(worker.rating ?? "")) || 0;
  const totalReviews = worker.totalReviews || 0;
  const skillList = (worker.skills || "").split(/[,،;、]/).map((s) => s.trim()).filter(Boolean);

  // ── verification (only what the data actually says) ──
  const docs = worker.documents || [];
  const findDoc = (re: RegExp) => docs.find((d) => re.test(d.title));
  const aadhaar = findDoc(/aadhaar|aadhar|आधार/i);
  const licence = findDoc(/licen[cs]e|driving|लाइसेंस|परवाना/i);
  const otherDocs = docs.filter((d) => d !== aadhaar && d !== licence);
  const docState = (d?: { verified: boolean }): DocState => (!d ? "none" : d.verified ? "verified" : "pending");
  const mobileVerified = !!worker.phone; // signed in with an OTP sent to this number
  const bgVerified = !!worker.backgroundVerified;
  const allVerified = !!aadhaar?.verified && mobileVerified && bgVerified;
  const stateLabel = (s: DocState) => (s === "verified" ? L("Verified", "सत्यापित", "सत्यापित") : s === "pending" ? L("Pending", "बाकी", "प्रलंबित") : L("Not added", "जोड़ा नहीं", "जोडलेले नाही"));

  const verifyRows: { label: string; ok: boolean }[] = [
    { label: L("Aadhaar Verified", "आधार सत्यापित", "आधार सत्यापित"), ok: !!aadhaar?.verified },
    { label: L("Mobile Verified", "मोबाइल सत्यापित", "मोबाइल सत्यापित"), ok: mobileVerified },
    { label: L("Background Checked", "पृष्ठभूमि जाँची गई", "पार्श्वभूमी तपासली"), ok: bgVerified },
  ];

  // ── recent activity (from the worker's real applications) ──
  const ago = (iso?: string) => {
    if (!iso) return "";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
    if (mins < 60) return rtf.format(-Math.max(mins, 1), "minute");
    if (mins < 1440) return rtf.format(-Math.round(mins / 60), "hour");
    return rtf.format(-Math.round(mins / 1440), "day");
  };
  const recent = [...activity].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()).slice(0, 3);
  const activityText = (a: Application) => {
    const title = a.job?.jobTitle?.[language] || a.job?.jobTitle?.en || "";
    if (a.isCompleted || a.status === "completed") return { done: true, text: L(`You completed the job for ${title}`, `आपने ${title} का काम पूरा किया`, `तुम्ही ${title} चे काम पूर्ण केले`), title };
    if (a.status) return { done: true, text: L(`Employer accepted you for ${title}`, `नियोक्ता ने ${title} के लिए आपको चुना`, `मालकाने ${title} साठी तुमची निवड केली`), title };
    return { done: false, text: L(`You applied for ${title}`, `आपने ${title} के लिए आवेदन किया`, `तुम्ही ${title} साठी अर्ज केला`), title };
  };

  const editingAny = editing || editSkill;

  return (
    <div className="mx-auto max-w-[1180px] space-y-4 px-4 py-5 sm:px-6">

      {/* ── BANNER ─────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[#d6e4fb] bg-[linear-gradient(100deg,#cfe2fa_0%,#dcebfd_55%,#e6f0fc_100%)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_PEOPLE}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[52%] select-none object-cover object-[center_25%] [mask-image:linear-gradient(to_right,transparent_0%,#000_45%)] md:block"
          draggable={false}
        />
        <p
          className="pointer-events-none absolute right-8 top-5 m-0 hidden max-w-[160px] -rotate-6 text-[24px] font-semibold italic leading-tight text-[#0d2250] xl:block"
          style={{ fontFamily: '"Segoe Script","Brush Script MT","Comic Sans MS",cursive' }}
          aria-hidden="true"
        >
          Mehnat se behtar kal
        </p>

        <div className="relative z-10 flex flex-wrap items-center gap-5 px-5 py-6 sm:px-7">
          <div className="relative h-[116px] w-[116px] shrink-0">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-[#2a7be4] text-[54px] shadow-[0_8px_22px_rgba(26,108,240,0.3)]">
              {photo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photo} alt="profile" className="h-full w-full object-cover" />
                : getSkillEmoji(worker.skills)}
            </div>
            <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-[#fbbf24] text-[#3b2a00]" title={L("Change photo", "फोटो बदलें", "फोटो बदला")}>
              {uploadingPhoto ? "…" : <FiCamera size={16} aria-hidden="true" />}
              <input type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          <div className="min-w-0">
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-label={L("Name", "नाम", "नाव")}
                className="w-full max-w-[320px] rounded-lg border-2 border-[#1a6cf0] bg-white px-3 py-1.5 text-[22px] font-extrabold text-[#0d2250] outline-none"
              />
            ) : (
              <h1 className="m-0 text-[clamp(26px,3vw,34px)] font-extrabold leading-tight text-[#0d2250]">{worker.name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[17px] font-semibold text-[#0d2250]"><FiPhone size={17} aria-hidden="true" /> {worker.phone}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold ${available ? "border-[#a7e8c8] bg-[#e6f8ee] text-[#0b6b3a]" : "border-[#d5dbe8] bg-white/70 text-[#6b7a95]"}`}>
                <FiCheckCircle size={14} aria-hidden="true" /> {available ? L("Active", "सक्रिय", "सक्रिय") : L("Not available", "उपलब्ध नहीं", "उपलब्ध नाही")}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <span className="inline-flex gap-0.5" aria-label={`${rating} / 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <FiStar key={n} size={24} className={n <= Math.round(rating) ? "fill-[#f5b301] text-[#f5b301]" : "fill-[#dfe5f0] text-[#dfe5f0]"} aria-hidden="true" />
                ))}
              </span>
              <span className="text-[15px] font-medium text-[#0d2250]">
                {rating > 0 ? `${rating}/5 (${totalReviews})` : L("No ratings yet", "अभी कोई रेटिंग नहीं", "अजून रेटिंग नाही")}
              </span>
            </div>
            {!editingAny && (
              <button
                onClick={() => setEditing(true)}
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1a6cf0] bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-[#1a4fb0] hover:bg-white"
              >
                <FiEdit2 size={14} aria-hidden="true" /> {L("Edit Name / Location", "नाम/स्थान संपादित करें", "नाव/ठिकाण संपादित करा")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── SKILL / LOCATION / EXPERIENCE / BACKGROUND ─────────────────────────── */}
      <section className={`${CARD} grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4`}>
        <Stat
          icon={<FiUser size={26} className="text-[#1a6cf0]" aria-hidden="true" />} iconBg="bg-[#e6efff]"
          label={L("Skill", "काम", "काम")}
          action={
            <button
              onClick={() => setEditSkill((v) => !v)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${editSkill ? "bg-red-50 text-[#d6203a]" : "bg-[#e9f1ff] text-[#1a4fb0] hover:bg-[#dbe8ff]"}`}
            >
              {editSkill ? <FiX size={14} aria-hidden="true" /> : <FiEdit2 size={13} aria-hidden="true" />} {editSkill ? L("Close", "बंद", "बंद") : L("Edit", "बदलें", "बदला")}
            </button>
          }
        >
          {worker.skills || "—"}
        </Stat>

        <Stat icon={<FiMapPin size={26} className="text-[#e5334f]" aria-hidden="true" />} iconBg="bg-[#ffe9ed]" label={L("Location", "इलाका", "परिसर")}>
          {editing ? (
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Nashik, Pune"
              aria-label={L("Location", "इलाका", "परिसर")}
              className="w-full rounded-lg border-2 border-[#1a6cf0] px-2.5 py-1 text-[15px] font-semibold outline-none"
            />
          ) : (
            worker.location || <span className="text-[15px] font-medium text-[#8a96ae]">{L("Not provided", "नहीं दिया", "दिलेले नाही")}</span>
          )}
        </Stat>

        <Stat icon={<FiCalendar size={26} className="text-[#1a6cf0]" aria-hidden="true" />} iconBg="bg-[#e6efff]" label={L("Experience", "अनुभव", "अनुभव")}>
          {worker.experienceYears ? `${worker.experienceYears}+ ${L("Years", "साल", "वर्षे")}` : <span className="text-[15px] font-medium text-[#8a96ae]">{L("Not added", "जोड़ा नहीं", "जोडलेले नाही")}</span>}
        </Stat>

        <Stat icon={<FiShield size={26} className={bgVerified ? "text-[#13a05a]" : "text-[#8a96ae]"} aria-hidden="true" />} iconBg={bgVerified ? "bg-[#dff6e8]" : "bg-[#eef1f7]"} label={L("Background Check", "पृष्ठभूमि जाँच", "पार्श्वभूमी तपासणी")}>
          {bgVerified
            ? <span className="text-[#0b8a4c]">{L("Verified", "सत्यापित", "सत्यापित")} ✓</span>
            : <span className="text-[15px] font-medium text-[#8a96ae]">{L("Not verified yet", "अभी सत्यापित नहीं", "अजून सत्यापित नाही")}</span>}
        </Stat>
      </section>

      {/* Skill picker + save bar */}
      {editSkill && (
        <section className={`${CARD} p-4 sm:p-5`}>
          <h2 className="m-0 mb-3 text-[15px] font-bold text-[#0d2250]">{L("Choose your skill", "अपना काम चुनें", "तुमचे काम निवडा")}</h2>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill.value}
                onClick={() => setForm({ ...form, skills: skill.value })}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-1 py-3 ${form.skills === skill.value ? "border-[#1a6cf0] bg-[#eaf1ff]" : "border-[#e6ecf5] bg-[#fbfcff] hover:bg-[#f2f7ff]"}`}
              >
                <span className="text-[24px]">{skill.emoji}</span>
                <span className={`text-center text-[10.5px] font-semibold leading-tight ${form.skills === skill.value ? "text-[#1a4fb0]" : "text-[#5b6a85]"}`}>{skill.value}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {editingAny && (
        <div className="flex flex-wrap justify-end gap-2.5">
          <button
            onClick={() => { setEditing(false); setEditSkill(false); setForm({ name: worker.name || "", location: worker.location || "", skills: worker.skills || "" }); }}
            className="cursor-pointer rounded-xl bg-[#eef1f7] px-6 py-2.5 text-[14px] font-semibold text-[#33415f] hover:bg-[#e3e8f2]"
          >
            {t.cancel}
          </button>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1a6cf0] px-6 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(26,108,240,0.3)] hover:brightness-95 disabled:opacity-70"
          >
            <FiCheck size={16} aria-hidden="true" /> {saving ? (t.saving || "Saving…") : t.save}
          </button>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* ═════════ LEFT ═════════ */}
        <div className="min-w-0 space-y-4">
          {/* About + verification */}
          <section className={`${CARD} grid gap-4 p-4 sm:p-5 md:grid-cols-[1fr_290px]`}>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6efff] text-[#1a6cf0]"><FiUser size={22} aria-hidden="true" /></span>
                <h2 className="m-0 text-[20px] font-bold text-[#0d2250]">{L("About Me", "मेरे बारे में", "माझ्याबद्दल")}</h2>
              </div>
              <p className="m-0 mt-3 text-[15px] leading-relaxed text-[#1f2a44]">
                {worker.about || L(
                  `I am a ${worker.skills || "worker"}${worker.location ? ` from ${worker.location}` : ""}, ready for work on HireMate.`,
                  `मैं ${worker.location ? worker.location + " का " : ""}${worker.skills || "कामगार"} हूँ और हायरमेट पर काम के लिए तैयार हूँ।`,
                  `मी ${worker.location ? worker.location + " येथील " : ""}${worker.skills || "कामगार"} आहे आणि हायरमेटवर कामासाठी तयार आहे.`
                )}
              </p>
              {skillList.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2.5">
                  {skillList.map((s) => (
                    <span key={s} className="rounded-full border border-[#cfe0fb] bg-[#eef5ff] px-4 py-1.5 text-[13.5px] font-medium text-[#1a4fb0]">{s}</span>
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-xl border p-4 ${allVerified ? "border-[#bfe9d1] bg-[#effaf4]" : "border-[#e3eaf5] bg-[#f7f9fd]"}`}>
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${allVerified ? "bg-[#d3f3e1] text-[#13a05a]" : "bg-[#e9eef8] text-[#6b7a95]"}`}><FiShield size={20} aria-hidden="true" /></span>
                <h3 className="m-0 text-[16px] font-bold text-[#0d2250]">{allVerified ? L("Profile Verified", "प्रोफ़ाइल सत्यापित", "प्रोफाइल सत्यापित") : L("Verification", "सत्यापन", "पडताळणी")}</h3>
              </div>
              <ul className="m-0 mt-3 list-none space-y-2 p-0">
                {verifyRows.map((r) => (
                  <li key={r.label} className={`flex items-center gap-2.5 text-[14px] ${r.ok ? "text-[#0d2250]" : "text-[#8a96ae]"}`}>
                    {r.ok
                      ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#13a05a] text-white"><FiCheck size={13} strokeWidth={3.5} aria-hidden="true" /></span>
                      : <span className="h-5 w-5 rounded-full border-2 border-[#cfd6e4]" />}
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Documents */}
          <section className={`${CARD} p-4 sm:p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg text-[#1a6cf0]"><FiFileText size={24} aria-hidden="true" /></span>
              <h2 className="m-0 text-[20px] font-bold text-[#0d2250]">{L("My Documents", "मेरे दस्तावेज़", "माझी कागदपत्रे")}</h2>
              {docBusy && <span className="text-[12.5px] text-[#6b7a95]">{L("Saving…", "सेव हो रहा है…", "सेव्ह होत आहे…")}</span>}
            </div>
            <p className="m-0 mt-1.5 text-[12.5px] text-[#6b7a95]">
              {L("Tap a card to upload, view or remove. Files are saved on this device only (photo or PDF under 1 MB).", "अपलोड, देखने या हटाने के लिए कार्ड दबाएँ। फ़ाइलें सिर्फ़ इसी डिवाइस पर सेव होती हैं (फोटो या 1 MB से छोटा PDF)।", "अपलोड, पाहणे किंवा काढण्यासाठी कार्ड दाबा. फाइल्स फक्त याच डिव्हाइसवर सेव्ह होतात (फोटो किंवा 1 MB खालील PDF).")}
            </p>

            <input ref={docInputRef} type="file" accept="image/*,application/pdf" onChange={onDocChosen} className="hidden" />
            <input ref={photoInputRef} type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="hidden" />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                { slot: "aadhaar" as const, title: L("Aadhaar Card", "आधार कार्ड", "आधार कार्ड"), admin: docState(aadhaar), count: localDocs.aadhaar ? 1 : 0, tone: "bg-[#e6efff] text-[#1a6cf0]" },
                { slot: "licence" as const, title: L("Driving License", "ड्राइविंग लाइसेंस", "ड्रायव्हिंग लायसन्स"), admin: docState(licence), count: localDocs.licence ? 1 : 0, tone: "bg-[#ece8ff] text-[#6a4fe0]" },
                { slot: "photo" as const, title: L("Profile Photo", "प्रोफ़ाइल फोटो", "प्रोफाइल फोटो"), admin: "none" as DocState, count: photo ? 1 : 0, tone: "bg-[#dff6e8] text-[#13a05a]" },
                { slot: "other" as const, title: L("Other Documents", "अन्य दस्तावेज़", "इतर कागदपत्रे"), admin: (otherDocs.length ? (otherDocs.every((d) => d.verified) ? "verified" : "pending") : "none") as DocState, count: localDocs.other?.length || 0, tone: "bg-[#fff3d6] text-[#d97706]" },
              ]).map((d) => {
                const has = d.count > 0;
                const state: DocState = d.admin !== "none" ? d.admin : has ? "added" : "none";
                const label = d.admin !== "none" ? stateLabel(d.admin) : has ? (d.slot === "other" ? `${d.count} ${L("added", "जोड़े", "जोडले")}` : L("Added", "जोड़ा गया", "जोडले")) : stateLabel("none");
                const onClick = () => {
                  if (d.slot === "photo") return photoInputRef.current?.click();
                  if (has) return setDocModal(d.slot);
                  pickFile(d.slot);
                };
                return (
                  <button
                    key={d.slot}
                    type="button"
                    onClick={onClick}
                    title={d.title}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#e3eaf5] bg-[#fbfcff] p-3 text-left transition hover:border-[#bcd3ff] hover:bg-[#f2f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a6cf0]"
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${d.tone}`}><FiFileText size={21} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[#0d2250]">{d.title}</span>
                      <span className="mt-1 block"><StatusChip state={state} label={label} /></span>
                    </span>
                    {has
                      ? <FiChevronRight size={18} className="shrink-0 text-[#8a96ae]" aria-hidden="true" />
                      : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9f1ff] text-[#1a4fb0]"><FiUpload size={15} aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent activity */}
          <section className={`${CARD} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-[#1a6cf0]"><FiClock size={24} aria-hidden="true" /></span>
                <h2 className="m-0 text-[20px] font-bold text-[#0d2250]">{L("Recent Activity", "हाल की गतिविधि", "अलीकडील हालचाल")}</h2>
              </div>
              <Link href="/my-jobs" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1a4fb0] no-underline hover:underline">
                {L("View All Jobs", "सभी काम देखें", "सर्व कामे पहा")} <FiChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="mt-3 rounded-xl bg-[#f6f8fc] px-4 py-5 text-center text-[13.5px] text-[#6b7a95]">
                {L("No activity yet. Browse jobs to get started.", "अभी कोई गतिविधि नहीं। शुरू करने के लिए जॉब ब्राउज़ करें।", "अजून हालचाल नाही. सुरुवात करण्यासाठी नोकऱ्या पहा.")}
              </div>
            ) : (
              <ul className="m-0 mt-3 list-none space-y-2.5 p-0">
                {recent.map((a) => {
                  const info = activityText(a);
                  const place = (a.job?.location?.[language] || a.job?.location?.en || "").split(",")[0];
                  return (
                    <li key={a._id} className="flex items-center gap-3.5 rounded-xl bg-[#f6f8fc] px-4 py-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${info.done ? "bg-[#13a05a]" : "bg-[#f59e0b]"}`}>
                        {info.done ? <FiCheck size={19} strokeWidth={3} aria-hidden="true" /> : <FiClock size={17} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-semibold text-[#0d2250]">{info.text}</div>
                        <div className="text-[12px] text-[#6b7a95]">{[place, ago(a.updatedAt)].filter(Boolean).join(" • ")}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ═════════ RIGHT ═════════ */}
        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl bg-[linear-gradient(160deg,#1f78f5_0%,#1a62dc_100%)] p-5 text-white shadow-[0_10px_26px_rgba(26,108,240,0.3)]">
            <div className="flex items-start gap-3.5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20"><FiPhone size={26} aria-hidden="true" /></span>
              <div>
                <h2 className="m-0 text-[20px] font-bold">{L("Need Work?", "काम चाहिए?", "काम हवे?")}</h2>
                <p className="m-0 mt-1 text-[13.5px] leading-snug text-[#e1ecff]">
                  {L("Tell us what kind of job you want. We'll match you with the right work.", "बताइए आपको कैसा काम चाहिए। हम सही काम से मिलाएँगे।", "तुम्हाला कसले काम हवे ते सांगा. आम्ही योग्य कामाशी जुळवू.")}
                </p>
              </div>
            </div>
            <Link href="/jobs" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[15px] font-bold text-[#1a4fb0] no-underline hover:bg-[#f2f7ff]">
              <FiSearch size={18} aria-hidden="true" /> {t.browseJobs || "Browse Jobs"}
            </Link>
          </section>

          <Link href="/ai-suggestions" className={`${CARD} flex items-center gap-3.5 p-4 no-underline hover:bg-[#fbfdff]`}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a6cf0] text-white"><FiCpu size={23} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[15px] font-bold text-[#0d2250]">{L("Need Help?", "मदद चाहिए?", "मदत हवी?")}</span>
              <span className="block text-[13px] text-[#1a4fb0]">{L("Ask HireMate AI Bot", "हायरमेट AI बॉट से पूछें", "हायरमेट AI बॉटला विचारा")}</span>
            </span>
            <FiChevronRight size={18} className="shrink-0 text-[#1a4fb0]" aria-hidden="true" />
          </Link>

          <section className={`${CARD} p-4`}>
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0f3a73] text-white"><FiPhone size={22} aria-hidden="true" /></span>
              <div className="leading-tight">
                <h3 className="m-0 text-[15px] font-bold text-[#0d2250]">{L("Need to update your details?", "विवरण बदलना है?", "तपशील बदलायचे आहेत?")}</h3>
                <p className="m-0 mt-1 text-[13px] text-[#6b7a95]">{L("Contact our support team", "हमारी सपोर्ट टीम से संपर्क करें", "आमच्या सपोर्ट टीमशी संपर्क साधा")}</p>
              </div>
            </div>
            <Link href="/ai-suggestions" className="mt-3.5 flex items-center justify-center gap-2 rounded-xl border border-[#1a6cf0] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1a4fb0] no-underline hover:bg-[#f2f7ff]">
              <FiHeadphones size={17} aria-hidden="true" /> {L("Help Center", "सहायता केंद्र", "मदत केंद्र")}
            </Link>
          </section>
        </aside>
      </div>

      {docModal && (() => {
        const list: StoredDoc[] = docModal === "other" ? localDocs.other || [] : localDocs[docModal] ? [localDocs[docModal] as StoredDoc] : [];
        const title = docModal === "aadhaar" ? L("Aadhaar Card", "आधार कार्ड", "आधार कार्ड") : docModal === "licence" ? L("Driving License", "ड्राइविंग लाइसेंस", "ड्रायव्हिंग लायसन्स") : L("Other Documents", "अन्य दस्तावेज़", "इतर कागदपत्रे");
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setDocModal(null)}>
            <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-[18px] font-bold text-[#0d2250]">{title}</h3>
                <button onClick={() => setDocModal(null)} aria-label={t.cancel} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#eef1f7] text-[#33415f] hover:bg-[#e3e8f2]"><FiX size={18} /></button>
              </div>
              <div className="mt-4 space-y-4">
                {list.map((d, i) => (
                  <div key={`${d.name}-${i}`} className="rounded-xl border border-[#e3eaf5] p-3">
                    {d.type === "application/pdf"
                      ? <iframe src={d.dataUrl} title={d.name} className="h-72 w-full rounded-lg border-0 bg-[#f6f8fc]" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={d.dataUrl} alt={d.name} className="max-h-72 w-full rounded-lg bg-[#f6f8fc] object-contain" />}
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-[#0d2250]">{d.name}</div>
                        <div className="text-[12px] text-[#8a96ae]">{new Date(d.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <button onClick={() => removeDoc(docModal, i)} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#f7b9c4] bg-[#fff1f3] px-3 py-1.5 text-[12.5px] font-semibold text-[#d6203a] hover:bg-[#ffe4e8]">
                        <FiTrash2 size={14} aria-hidden="true" /> {L("Remove", "हटाएँ", "काढा")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {(docModal !== "other" || list.length < MAX_OTHER_DOCS) && (
                <button onClick={() => pickFile(docModal)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1a6cf0] px-4 py-3 text-[14px] font-semibold text-white hover:brightness-95">
                  {docModal === "other" ? <FiPlus size={17} aria-hidden="true" /> : <FiUpload size={16} aria-hidden="true" />}
                  {docModal === "other" ? L("Add another", "और जोड़ें", "आणखी जोडा") : L("Replace", "बदलें", "बदला")}
                </button>
              )}
              <p className="m-0 mt-3 text-center text-[12px] text-[#8a96ae]">{L("Saved on this device only.", "सिर्फ़ इसी डिवाइस पर सेव है।", "फक्त याच डिव्हाइसवर सेव्ह आहे.")}</p>
            </div>
          </div>
        );
      })()}

      <p className="m-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-[12.5px] text-[#6b7a95]">
        <span>{L("Safe Workers", "सुरक्षित कामगार", "सुरक्षित कामगार")}</span><span aria-hidden="true">|</span>
        <span>{L("Stronger Communities", "मज़बूत समुदाय", "मजबूत समाज")}</span><span aria-hidden="true">|</span>
        <span>{L("Better Tomorrow", "बेहतर कल", "चांगला उद्या")}</span>
      </p>
    </div>
  );
}