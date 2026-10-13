"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/context/AuthContext";
import { ROLE_SELECT } from "@/config/routes";
import { ApiError } from "@/services/api";
import { getWorkerProfile, updateWorkerProfile } from "@/services/workers";
import type { Worker } from "@/types";


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
  const found = SKILL_OPTIONS.find(s => s.value.toLowerCase() === (skill || "").toLowerCase());
  return found ? found.emoji : "👷";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-[3px]">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-[20px] ${i <= Math.round(rating) ? "text-amber-500" : "text-gray-200"}`}>★</span>
      ))}
    </div>
  );
}

export default function WorkerProfile() {
  const router         = useRouter();
  const { language }   = useLanguage();
  const t              = translations[language];
  const { worker: sessionWorker, setWorker: cacheWorker, logout } = useAuth();
  const sessionWorkerId = sessionWorker?._id ?? sessionWorker?.id;

  const [worker, setWorker]           = useState<Worker | null>(null);
  const [editing, setEditing]         = useState(false);
  const [editSkill, setEditSkill]     = useState(false);
  const [form, setForm]               = useState({ name: "", location: "", skills: "" });
  const [saving, setSaving]           = useState(false);
  const [photo, setPhoto]             = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    // The route guard guarantees a worker session; this just narrows the type.
    const savedWorker = sessionWorker;
    if (!savedWorker) return;

    // Try to load full profile from backend
    const id = savedWorker._id || savedWorker.id;
    const useSaved = () => {
      setWorker(savedWorker);
      setForm({ name: savedWorker.name || "", location: savedWorker.location || "", skills: savedWorker.skills || "" });
    };
    if (id) {
      getWorkerProfile(id)
        .then(data => {
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

    // Load saved photo
    const photoKey = `workerPhoto_${savedWorker._id || savedWorker.phone}`;
    const savedPhoto = localStorage.getItem(photoKey);
    if (savedPhoto) setPhoto(savedPhoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionWorkerId]);

  // Photo upload handler
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB"); return; }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhoto(base64);
      const key = `workerPhoto_${worker?._id || worker?.phone}`;
      localStorage.setItem(key, base64);
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

  if (!worker) return (
    <div className="p-10 text-center text-gray-500 text-[16px]">
      Loading profile…
    </div>
  );

  const rating      = parseFloat(String(worker.rating ?? "")) || 0;
  const totalReviews = worker.totalReviews || 0;

  return (
    <div className="max-w-[480px] my-0 mx-auto pt-5 px-4 pb-20 font-plain">

      {/* Profile Card */}
      <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,.09)] overflow-hidden mb-3.5">

        {/* Banner */}
        <div className="bg-[linear-gradient(135deg,#006491,#004f73)] py-7 px-5 text-white text-center">

          {/* Photo with camera button */}
          <div className="relative w-20 h-20 mt-0 mx-auto mb-3">
            <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,.18)] flex items-center justify-center text-[42px] border-[3px] border-[rgba(255,255,255,.3)] overflow-hidden">
              {photo
                ? <img src={photo} alt="profile" className="w-full h-full object-cover" />
                : getSkillEmoji(worker.skills)
              }
            </div>
            <label className="absolute bottom-0 right-0 w-[26px] h-[26px] rounded-full bg-amber-400 border-2 border-white flex items-center justify-center cursor-pointer text-[13px]">
              {uploadingPhoto ? "⏳" : "📷"}
              <input type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          {editing ? (
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="text-[18px] font-bold text-center bg-[rgba(255,255,255,.2)] border-2 border-[rgba(255,255,255,.5)] rounded-lg text-white py-1.5 px-3 w-full box-border" />
          ) : (
            <div className="text-[22px] font-extrabold">{worker.name}</div>
          )}

          <div className="text-[13px] opacity-80 mt-1">📱 {worker.phone}</div>

          <div className="flex justify-center items-center gap-2 mt-2.5">
            <StarRating rating={rating} />
            <span className="text-[13px] opacity-90">
              {rating > 0 ? `${rating}/5 (${totalReviews})` : (language === "hi" ? "अभी कोई रेटिंग नहीं" : language === "mr" ? "अजून रेटिंग नाही" : "No ratings yet")}
            </span>
          </div>
        </div>

        {/* Info section */}
        <div className="p-5">

          {/* Current skill */}
          <div className="flex justify-between items-center mb-3.5 py-3 px-3.5 bg-sky-50 rounded-xl">
            <div className="flex items-center gap-2.5">
              <span className="text-[26px]">{getSkillEmoji(worker.skills)}</span>
              <div>
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.5px]">
                  {language === "hi" ? "काम" : language === "mr" ? "काम" : "Skill"}
                </div>
                <div className="text-[15px] font-bold text-[#111111]">{worker.skills || "—"}</div>
              </div>
            </div>
            <button onClick={() => setEditSkill(v => !v)}
              className={`py-1.5 px-3 rounded-lg font-semibold text-[12px] cursor-pointer ${editSkill ? "bg-red-100 text-danger" : "bg-brand-light text-brand"}`}>
              {editSkill ? "✕" : "✏️ Edit"}
            </button>
          </div>

          {/* Skill editor */}
          {editSkill && (
            <div className="mb-3.5">
              <div className="grid grid-cols-4 gap-2">
                {SKILL_OPTIONS.map(skill => (
                  <button key={skill.value} onClick={() => setForm({...form, skills: skill.value})}
                    className={`py-2.5 px-1 rounded-xl cursor-pointer flex flex-col items-center gap-1 border-2 ${form.skills === skill.value ? "border-brand bg-brand-light" : "border-gray-200 bg-gray-50"}`}>
                    <span className="text-[22px]">{skill.emoji}</span>
                    <span className={`text-[9px] font-semibold text-center leading-[1.2] ${form.skills === skill.value ? "text-brand" : "text-gray-500"}`}>{skill.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="mb-3.5">
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.5px] mb-1.5">
              {language === "hi" ? "इलाका" : language === "mr" ? "परिसर" : "Location"}
            </div>
            {editing ? (
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                placeholder="e.g. Nashik, Pune"
                className="w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-[10px] text-[14px] box-border" />
            ) : (
              <div className="text-[14px] text-gray-700">📍 {worker.location || (language === "hi" ? "स्थान नहीं दिया" : language === "mr" ? "स्थान दिलेले नाही" : "Not provided")}</div>
            )}
          </div>

          {/* Edit / Save buttons */}
          <div className="flex gap-2">
            {editing || editSkill ? (
              <>
                <button onClick={() => { setEditing(false); setEditSkill(false); }}
                  className="flex-1 py-[11px] px-0 bg-gray-100 text-gray-700 rounded-[10px] font-semibold cursor-pointer">
                  {t.cancel}
                </button>
                <button onClick={saveProfile} disabled={saving}
                  className="flex-[2] py-[11px] px-0 bg-brand text-white rounded-[10px] font-bold cursor-pointer">
                  {saving ? (t.saving || "Saving…") : `💾 ${t.save}`}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex-1 py-[11px] px-0 bg-sky-50 text-brand border-[1.5px] border-brand rounded-[10px] font-semibold cursor-pointer">
                ✏️ {language === "hi" ? "नाम/स्थान संपादित करें" : language === "mr" ? "नाव/ठिकाण संपादित करा" : "Edit Name / Location"}
              </button>
            )}
          </div>

          {/* Quick links */}
          {!editing && !editSkill && (
            <div className="flex gap-2.5 mt-3">
              <a href="/jobs" className="flex-1 py-[11px] px-0 bg-brand text-white rounded-[10px] font-bold text-[14px] no-underline text-center">
                🔍 {t.browseJobs || "Browse Jobs"}
              </a>
              <a href="/my-jobs" className="flex-1 py-[11px] px-0 bg-gray-100 text-gray-700 rounded-[10px] font-bold text-[14px] no-underline text-center">
                📋 {t.myJobs || "My Jobs"}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => { logout(); router.push(ROLE_SELECT); }}
        className="w-full py-[13px] px-0 bg-transparent border-2 border-danger rounded-xl text-danger font-bold text-[15px] cursor-pointer"
      >
        🚪 {language === "hi" ? "लॉगआउट करें" : language === "mr" ? "लॉगआउट करा" : "Logout"}
      </button>
    </div>
  );
}