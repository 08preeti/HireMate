"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { FiCamera, FiCheckCircle, FiEdit2, FiEye, FiMapPin, FiTrash2, FiX } from "react-icons/fi";
import GenderPicker, { type Gender } from "@/components/ui/GenderPicker";
import { toast } from "@/components/ui/Toast";
import { CARD, ErrorPanel, PageContainer, PageHeader, Stars } from "@/components/worker/WorkerUi";
import { useAuth } from "@/context/AuthContext";
import { useL } from "@/hooks/useL";
import { COMPLETION_LABELS, profileCompletion } from "@/lib/profileCompletion";
import { dateOf, isCompleted, jobTitleOf, splitSkills } from "@/lib/workerApplications";
import { ApiError } from "@/services/api";
import { getMyJobs, getWorkerProfile, updateWorkerProfile } from "@/services/workers";
import type { Application, Worker } from "@/types";
import ProfileDocuments from "./profile/ProfileDocuments";

const SKILL_OPTIONS = ["Electrician", "Plumber", "Cook", "Driver", "Carpenter", "Painter", "Cleaner", "Security Guard", "Gardener", "Delivery Boy", "Mechanic", "Mason", "House Maid", "Waiter", "Helper", "Welder"];

const DAYS: { key: string; en: string; hi: string; mr: string }[] = [
  { key: "mon", en: "Mon", hi: "सोम", mr: "सोम" },
  { key: "tue", en: "Tue", hi: "मंगल", mr: "मंगळ" },
  { key: "wed", en: "Wed", hi: "बुध", mr: "बुध" },
  { key: "thu", en: "Thu", hi: "गुरु", mr: "गुरु" },
  { key: "fri", en: "Fri", hi: "शुक्र", mr: "शुक्र" },
  { key: "sat", en: "Sat", hi: "शनि", mr: "शनि" },
  { key: "sun", en: "Sun", hi: "रवि", mr: "रवि" },
];

type SectionKey = "personal" | "contact" | "skills" | "experience" | "preferred" | "availability" | "about";

interface Draft {
  name: string;
  gender: Gender | "";
  location: string;
  skills: string[];
  experienceYears: string;
  experienceDetails: string;
  preferred: string;
  isAvailable: boolean;
  days: string[];
  from: string;
  to: string;
  about: string;
}

const draftFrom = (w: Worker): Draft => ({
  name: w.name || "",
  gender: w.gender || "",
  location: w.location || "",
  skills: splitSkills(w.skills),
  experienceYears: w.experienceYears != null ? String(w.experienceYears) : "",
  experienceDetails: w.experienceDetails || "",
  preferred: (w.serviceAreas || []).join(", "),
  isAvailable: w.availability?.isAvailable !== false,
  days: w.availability?.days || [],
  from: w.availability?.from || "",
  to: w.availability?.to || "",
  about: w.about || "",
});

const inputCls = "w-full rounded-lg border border-[#dde4f0] bg-white px-3.5 py-2.5 text-[14.5px] text-[#0b1b3d] outline-none focus:border-[#1f6bff]";
const chipCls = (on: boolean) => `cursor-pointer rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium ${on ? "border-[#1f6bff] bg-[#eaf2ff] text-[#1a4fc4]" : "border-[#dde4f0] bg-white text-[#33415f] hover:bg-[#f6f8fc]"}`;

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#33415f]">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-[12.5px] font-medium text-[#d6203a]">{error}</span>}
    </label>
  );
}

function Value({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] font-medium uppercase tracking-wide text-[#8a96ae]">{label}</dt>
      <dd className="m-0 mt-1 text-[15px] text-[#0b1b3d]">{children || "—"}</dd>
    </div>
  );
}

export default function WorkerProfile() {
  const { L, language } = useL();
  const { worker: sessionWorker, setWorker: cacheWorker } = useAuth();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [preview, setPreview] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const id = sessionWorker?._id ?? sessionWorker?.id;
  const photoKey = `workerPhoto_${sessionWorker?._id || sessionWorker?.phone}`;

  const load = () => {
    if (!sessionWorker || !id) return;
    setLoadError(false);
    getWorkerProfile(id)
      .then((d) => setWorker(d && d._id ? d : sessionWorker))
      .catch(() => {
        setWorker(sessionWorker);
        setLoadError(true);
      });
  };

  useEffect(() => {
    load();
    try {
      const saved = localStorage.getItem(photoKey);
      if (saved) setPhoto(saved);
    } catch {
      /* storage unavailable */
    }
    if (sessionWorker?.phone) {
      getMyJobs(sessionWorker.phone)
        .then((d) => setApps(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const completion = useMemo(() => profileCompletion(worker), [worker]);
  const reviews = useMemo(
    () => apps.filter((a) => isCompleted(a) && (a.rating ?? 0) > 0).sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()),
    [apps],
  );

  if (!worker) return <div className="p-10 text-center text-[16px] text-[#5b6a88]">{L("Loading profile…", "प्रोफ़ाइल लोड हो रही है…", "प्रोफाइल लोड होत आहे…")}</div>;

  const rating = parseFloat(String(worker.rating ?? "")) || 0;
  const totalReviews = worker.totalReviews || 0;
  const skills = splitSkills(worker.skills);
  const areas = worker.serviceAreas || [];
  const av = worker.availability;

  const startEdit = (key: SectionKey) => {
    setDraft(draftFrom(worker));
    setErrors({});
    setEditing(key);
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
    setErrors({});
  };
  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const validate = (key: SectionKey, d: Draft): Record<string, string> => {
    const e: Record<string, string> = {};
    if (key === "personal") {
      const n = d.name.trim();
      if (n.length < 2) e.name = L("Enter your name (at least 2 characters).", "अपना नाम लिखें (कम से कम 2 अक्षर)।", "तुमचे नाव लिहा (किमान 2 अक्षरे).");
      else if (n.length > 60) e.name = L("Name can be at most 60 characters.", "नाम अधिकतम 60 अक्षर का हो सकता है।", "नाव जास्तीत जास्त 60 अक्षरांचे असू शकते.");
    }
    if (key === "contact" && d.location.length > 100) e.location = L("At most 100 characters.", "अधिकतम 100 अक्षर।", "जास्तीत जास्त 100 अक्षरे.");
    if (key === "skills") {
      if (d.skills.length === 0) e.skills = L("Choose at least one skill.", "कम से कम एक कौशल चुनें।", "किमान एक कौशल्य निवडा.");
      else if (d.skills.join(", ").length > 200) e.skills = L("Too many skills selected.", "बहुत ज़्यादा कौशल चुने गए।", "खूप कौशल्ये निवडली.");
    }
    if (key === "experience") {
      if (d.experienceYears.trim() !== "") {
        const n = Number(d.experienceYears);
        if (!Number.isInteger(n) || n < 0 || n > 60) e.experienceYears = L("Enter whole years between 0 and 60.", "0 से 60 के बीच पूरे वर्ष लिखें।", "0 ते 60 दरम्यान पूर्ण वर्षे लिहा.");
      }
      if (d.experienceDetails.length > 500) e.experienceDetails = L("At most 500 characters.", "अधिकतम 500 अक्षर।", "जास्तीत जास्त 500 अक्षरे.");
    }
    if (key === "preferred") {
      const list = d.preferred.split(",").map((x) => x.trim()).filter(Boolean);
      if (list.length > 10) e.preferred = L("Add at most 10 areas.", "अधिकतम 10 इलाके जोड़ें।", "जास्तीत जास्त 10 परिसर जोडा.");
      else if (list.some((x) => x.length > 60)) e.preferred = L("Each area can be at most 60 characters.", "हर इलाका अधिकतम 60 अक्षर का हो।", "प्रत्येक परिसर जास्तीत जास्त 60 अक्षरांचा असावा.");
    }
    if (key === "availability" && d.from && d.to && d.from >= d.to) e.to = L("End time must be after start time.", "समाप्ति समय शुरू के बाद होना चाहिए।", "समाप्ती वेळ सुरुवातीनंतर असावी.");
    if (key === "about" && d.about.length > 500) e.about = L("At most 500 characters.", "अधिकतम 500 अक्षर।", "जास्तीत जास्त 500 अक्षरे.");
    return e;
  };

  const payloadFor = (key: SectionKey, d: Draft): Parameters<typeof updateWorkerProfile>[1] => {
    switch (key) {
      case "personal":
        return { name: d.name.trim(), gender: d.gender };
      case "contact":
        return { location: d.location.trim() };
      case "skills":
        return { skills: d.skills.join(", ") };
      case "experience":
        return { experienceYears: d.experienceYears.trim() === "" ? null : Number(d.experienceYears), experienceDetails: d.experienceDetails };
      case "preferred":
        return { serviceAreas: d.preferred.split(",").map((x) => x.trim()).filter(Boolean) };
      case "availability":
        return { availability: { isAvailable: d.isAvailable, days: d.days, from: d.from, to: d.to } };
      case "about":
        return { about: d.about };
    }
  };

  const save = async () => {
    if (!editing || !draft || !id) return;
    const found = validate(editing, draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const updated = await updateWorkerProfile(id, payloadFor(editing, draft));
      const merged: Worker = { ...worker, ...updated, rating: worker.rating, totalReviews: worker.totalReviews };
      setWorker(merged);
      cacheWorker(merged);
      cancelEdit();
      toast(L("Profile saved.", "प्रोफ़ाइल सेव हो गई।", "प्रोफाइल सेव्ह झाली."), "success");
    } catch (err) {
      toast(err instanceof ApiError && err.message ? err.message : L("Could not save. Please try again.", "सेव नहीं हो सका। फिर कोशिश करें।", "सेव्ह करता आले नाही. पुन्हा प्रयत्न करा."), "error");
    }
    setSaving(false);
  };

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast(L("Please choose an image.", "कृपया एक फोटो चुनें।", "कृपया फोटो निवडा."), "error");
    if (file.size > 2 * 1024 * 1024) return void toast(L("Photo must be under 2 MB.", "फोटो 2 MB से छोटा होना चाहिए।", "फोटो 2 MB पेक्षा लहान असावा."), "error");
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result as string;
      try {
        localStorage.setItem(photoKey, data);
        setPhoto(data);
        toast(L("Photo updated on this device.", "फोटो इस डिवाइस पर अपडेट हुआ।", "फोटो या डिव्हाइसवर अपडेट झाला."), "success");
      } catch {
        toast(L("Not enough storage on this device.", "इस डिवाइस पर जगह कम है।", "या डिव्हाइसवर जागा कमी आहे."), "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    try {
      localStorage.removeItem(photoKey);
    } catch {
      /* ignore */
    }
    setPhoto(null);
  };

  const initial = (worker.name || "W").trim().charAt(0).toUpperCase();
  const dayLabel = (k: string) => {
    const d = DAYS.find((x) => x.key === k);
    return d ? (language === "hi" ? d.hi : language === "mr" ? d.mr : d.en) : k;
  };
  const availabilityText = av?.days?.length
    ? `${av.days.map(dayLabel).join(", ")}${av.from && av.to ? ` • ${av.from}–${av.to}` : ""}`
    : "";

  const section = (key: SectionKey, title: string, view: ReactNode, form: ReactNode) => {
    const isEditing = editing === key && draft;
    return (
      <section className={`${CARD} p-5 sm:p-6`} aria-labelledby={`sec-${key}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={`sec-${key}`} className="m-0 text-[18px] font-bold text-[#0b1b3d]">{title}</h2>
          {!isEditing && (
            <button type="button" onClick={() => startEdit(key)} disabled={editing !== null} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#dde4f0] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1a4fc4] hover:bg-[#f2f7ff] disabled:cursor-not-allowed disabled:opacity-40">
              <FiEdit2 size={13} aria-hidden="true" /> {L("Edit", "बदलें", "बदला")}
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-4">
            {form}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={cancelEdit} disabled={saving} className="cursor-pointer rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0b1b3d] hover:bg-[#f6f8fc] disabled:opacity-50">{L("Cancel", "रद्द करें", "रद्द करा")}</button>
              <button type="button" onClick={() => void save()} disabled={saving} className="cursor-pointer rounded-lg bg-[#1f6bff] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1859d6] disabled:opacity-60">{saving ? "…" : L("Save", "सेव करें", "सेव्ह करा")}</button>
            </div>
          </div>
        ) : (
          view
        )}
      </section>
    );
  };

  const d = draft;
  const err = (k: string) => errors[k];

  return (
    <PageContainer>
      <PageHeader
        title={L("My Profile", "मेरी प्रोफ़ाइल", "माझी प्रोफाइल")}
        subtitle={L("Keep your details up to date to get better job matches.", "बेहतर नौकरी के लिए अपनी जानकारी अपडेट रखें।", "चांगल्या नोकऱ्यांसाठी माहिती अद्ययावत ठेवा.")}
        action={
          <button type="button" onClick={() => setPreview(true)} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#0b1b3d] hover:bg-[#f6f8fc]">
            <FiEye size={16} aria-hidden="true" /> {L("Preview as employer", "नियोक्ता के रूप में देखें", "मालकाच्या दृष्टीने पहा")}
          </button>
        }
      />

      {loadError && <ErrorPanel message={L("Could not refresh your profile from the server.", "सर्वर से प्रोफ़ाइल रिफ्रेश नहीं हो सकी।", "सर्व्हरवरून प्रोफाइल रिफ्रेश करता आली नाही.")} onRetry={load} />}

      <section className={`${CARD} p-5 sm:p-6`}>
        <div className="flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e6ecf5]" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label={L("Profile completion", "प्रोफ़ाइल पूर्णता", "प्रोफाइल पूर्णता")}>
            <div className="h-full rounded-full bg-[#1f6bff]" style={{ width: `${completion.percent}%` }} />
          </div>
          <span className="text-[18px] font-bold text-[#0b1b3d]">{completion.percent}%</span>
        </div>
        <p className="mb-0 mt-3 text-[13.5px] text-[#5b6a88]">
          {completion.percent === 100 ? (
            <span className="inline-flex items-center gap-2 font-medium text-[#047857]"><FiCheckCircle size={15} aria-hidden="true" />{L("Your profile is complete.", "आपकी प्रोफ़ाइल पूरी है।", "तुमची प्रोफाइल पूर्ण आहे.")}</span>
          ) : (
            <>{L("Still missing: ", "बाकी: ", "बाकी: ")}{completion.items.filter((i) => !i.done).map((i) => ((c) => L(c[0], c[1], c[2]))(COMPLETION_LABELS[i.key])).join(", ")}</>
          )}
        </p>
      </section>

      {section(
        "personal",
        L("Personal Information", "व्यक्तिगत जानकारी", "वैयक्तिक माहिती"),
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          <Value label={L("Name", "नाम", "नाव")}>{worker.name}</Value>
          <Value label={L("Gender", "लिंग", "लिंग")}>{worker.gender === "male" ? L("Male", "पुरुष", "पुरुष") : worker.gender === "female" ? L("Female", "महिला", "महिला") : ""}</Value>
        </dl>,
        d && (
          <>
            <Field label={L("Name", "नाम", "नाव")} error={err("name")}><input value={d.name} onChange={(e) => patch({ name: e.target.value })} maxLength={60} className={inputCls} /></Field>
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-[#33415f]">{L("Gender", "लिंग", "लिंग")}</span>
              <GenderPicker value={d.gender} onChange={(g) => patch({ gender: g })} maleLabel={L("Male", "पुरुष", "पुरुष")} femaleLabel={L("Female", "महिला", "महिला")} />
            </div>
          </>
        ),
      )}

      <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="sec-photo">
        <h2 id="sec-photo" className="m-0 mb-4 text-[18px] font-bold text-[#0b1b3d]">{L("Profile Photo", "प्रोफ़ाइल फोटो", "प्रोफाइल फोटो")}</h2>
        <div className="flex flex-wrap items-center gap-5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={L("Your profile photo", "आपकी प्रोफ़ाइल फोटो", "तुमचा प्रोफाइल फोटो")} className="h-24 w-24 rounded-full border-2 border-[#e6ecf5] object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fbbf24] text-[34px] font-bold text-[#3b2a00]">{initial}</span>
          )}
          <div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => photoRef.current?.click()} className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1859d6]"><FiCamera size={15} aria-hidden="true" />{photo ? L("Change photo", "फोटो बदलें", "फोटो बदला") : L("Add photo", "फोटो जोड़ें", "फोटो जोडा")}</button>
              {photo && <button type="button" onClick={removePhoto} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#f0b4be] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#d6203a] hover:bg-[#fff1f3]"><FiTrash2 size={15} aria-hidden="true" />{L("Remove", "हटाएँ", "काढा")}</button>}
            </div>
            <p className="mb-0 mt-2 text-[12.5px] text-[#8a96ae]">{L("Saved on this device only. Image under 2 MB.", "केवल इस डिवाइस पर सेव। 2 MB से छोटी फोटो।", "फक्त या डिव्हाइसवर सेव्ह. 2 MB खालील फोटो.")}</p>
          </div>
        </div>
      </section>

      {section(
        "contact",
        L("Contact Information", "संपर्क जानकारी", "संपर्क माहिती"),
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          <Value label={L("Phone", "फ़ोन", "फोन")}>{worker.phone || worker.contact}</Value>
          <Value label={L("Home area", "घर का इलाका", "घराचा परिसर")}>{worker.location}</Value>
        </dl>,
        d && (
          <>
            <Field label={L("Phone (used to sign in, cannot be changed)", "फ़ोन (साइन इन के लिए, बदला नहीं जा सकता)", "फोन (साइन इनसाठी, बदलता येत नाही)")}><input value={worker.phone || worker.contact || ""} readOnly disabled className={`${inputCls} bg-[#f3f5f9]`} /></Field>
            <Field label={L("Home area", "घर का इलाका", "घराचा परिसर")} error={err("location")}><input value={d.location} onChange={(e) => patch({ location: e.target.value })} maxLength={100} className={inputCls} /></Field>
          </>
        ),
      )}

      {section(
        "skills",
        L("Skills", "कौशल", "कौशल्ये"),
        skills.length ? <div className="flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="rounded-full bg-[#eef4ff] px-3.5 py-1.5 text-[13.5px] font-medium text-[#1a4fb0]">{s}</span>)}</div> : <p className="m-0 text-[14px] text-[#8a96ae]">{L("No skills added yet.", "अभी कोई कौशल नहीं जोड़ा।", "अजून कौशल्य जोडलेले नाही.")}</p>,
        d && (
          <div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={L("Skills", "कौशल", "कौशल्ये")}>
              {[...SKILL_OPTIONS, ...d.skills.filter((s) => !SKILL_OPTIONS.some((o) => o.toLowerCase() === s.toLowerCase()))].map((s) => {
                const on = d.skills.some((x) => x.toLowerCase() === s.toLowerCase());
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => patch({ skills: on ? d.skills.filter((x) => x.toLowerCase() !== s.toLowerCase()) : [...d.skills, s] })} className={chipCls(on)}>{s}</button>
                );
              })}
            </div>
            {err("skills") && <span role="alert" className="mt-2 block text-[12.5px] font-medium text-[#d6203a]">{err("skills")}</span>}
          </div>
        ),
      )}

      {section(
        "experience",
        L("Work Experience", "कार्य अनुभव", "कामाचा अनुभव"),
        <dl className="m-0 space-y-4">
          <Value label={L("Years of experience", "अनुभव के वर्ष", "अनुभवाची वर्षे")}>{worker.experienceYears != null ? `${worker.experienceYears} ${L("years", "वर्ष", "वर्षे")}` : ""}</Value>
          <Value label={L("Previous work", "पिछला काम", "मागील काम")}>{worker.experienceDetails}</Value>
        </dl>,
        d && (
          <>
            <Field label={L("Years of experience", "अनुभव के वर्ष", "अनुभवाची वर्षे")} error={err("experienceYears")}><input type="number" inputMode="numeric" min={0} max={60} value={d.experienceYears} onChange={(e) => patch({ experienceYears: e.target.value })} className={inputCls} /></Field>
            <Field label={L("Previous work (optional)", "पिछला काम (वैकल्पिक)", "मागील काम (पर्यायी)")} error={err("experienceDetails")}><textarea rows={4} maxLength={500} value={d.experienceDetails} onChange={(e) => patch({ experienceDetails: e.target.value })} className={`${inputCls} resize-none`} /></Field>
          </>
        ),
      )}

      {section(
        "preferred",
        L("Preferred Work Location", "पसंदीदा काम का स्थान", "पसंतीचे कामाचे ठिकाण"),
        areas.length ? <div className="flex flex-wrap gap-2">{areas.map((a) => <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1f3] px-3.5 py-1.5 text-[13.5px] font-medium text-[#b4233a]"><FiMapPin size={13} aria-hidden="true" />{a}</span>)}</div> : <p className="m-0 text-[14px] text-[#8a96ae]">{L("No preferred areas added yet.", "अभी कोई पसंदीदा इलाका नहीं जोड़ा।", "अजून पसंतीचा परिसर जोडलेला नाही.")}</p>,
        d && <Field label={L("Areas, separated by commas (up to 10)", "इलाके, कॉमा से अलग करें (अधिकतम 10)", "परिसर, स्वल्पविरामाने वेगळे करा (कमाल 10)")} error={err("preferred")}><input value={d.preferred} onChange={(e) => patch({ preferred: e.target.value })} placeholder={L("e.g. Dharampeth, Sitabuldi", "जैसे धरमपेठ, सीताबर्डी", "उदा. धरमपेठ, सीताबर्डी")} className={inputCls} /></Field>,
      )}

      {section(
        "availability",
        L("Work Availability", "काम की उपलब्धता", "कामाची उपलब्धता"),
        <dl className="m-0 space-y-4">
          <Value label={L("Status", "स्थिति", "स्थिती")}>{av?.isAvailable === false ? L("Not available for work", "काम के लिए उपलब्ध नहीं", "कामासाठी उपलब्ध नाही") : L("Available for work", "काम के लिए उपलब्ध", "कामासाठी उपलब्ध")}</Value>
          <Value label={L("Working days & hours", "काम के दिन और समय", "कामाचे दिवस आणि वेळ")}>{availabilityText}</Value>
        </dl>,
        d && (
          <>
            <label className="flex cursor-pointer items-center gap-3 text-[14.5px] font-medium text-[#0b1b3d]">
              <input type="checkbox" checked={d.isAvailable} onChange={(e) => patch({ isAvailable: e.target.checked })} className="h-4 w-4 accent-[#1f6bff]" />
              {L("I am available for work", "मैं काम के लिए उपलब्ध हूँ", "मी कामासाठी उपलब्ध आहे")}
            </label>
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-[#33415f]">{L("Working days", "काम के दिन", "कामाचे दिवस")}</span>
              <div className="flex flex-wrap gap-2" role="group">
                {DAYS.map((day) => {
                  const on = d.days.includes(day.key);
                  return <button key={day.key} type="button" aria-pressed={on} onClick={() => patch({ days: on ? d.days.filter((x) => x !== day.key) : [...d.days, day.key] })} className={chipCls(on)}>{dayLabel(day.key)}</button>;
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L("From", "से", "पासून")}><input type="time" value={d.from} onChange={(e) => patch({ from: e.target.value })} className={inputCls} /></Field>
              <Field label={L("To", "तक", "पर्यंत")} error={err("to")}><input type="time" value={d.to} onChange={(e) => patch({ to: e.target.value })} className={inputCls} /></Field>
            </div>
          </>
        ),
      )}

      {section(
        "about",
        L("About Me", "मेरे बारे में", "माझ्याबद्दल"),
        <p className="m-0 whitespace-pre-line text-[15px] leading-relaxed text-[#0b1b3d]">{worker.about || <span className="text-[#8a96ae]">{L("Tell employers a little about yourself.", "नियोक्ताओं को अपने बारे में थोड़ा बताएं।", "मालकांना तुमच्याबद्दल थोडे सांगा.")}</span>}</p>,
        d && (
          <Field label={L("A short introduction", "संक्षिप्त परिचय", "थोडक्यात परिचय")} error={err("about")}>
            <textarea rows={5} maxLength={500} value={d.about} onChange={(e) => patch({ about: e.target.value })} className={`${inputCls} resize-none`} />
            <span className="mt-1 block text-right text-[12px] text-[#8a96ae]">{d.about.length}/500</span>
          </Field>
        ),
      )}

      <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="sec-ratings">
        <h2 id="sec-ratings" className="m-0 mb-4 text-[18px] font-bold text-[#0b1b3d]">{L("Ratings & Reviews", "रेटिंग और समीक्षाएं", "रेटिंग आणि पुनरावलोकने")}</h2>
        {totalReviews > 0 ? (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[32px] font-bold leading-none text-[#0b1b3d]">{rating.toFixed(1)}</span>
            <div><Stars value={rating} size={18} /><div className="mt-1 text-[13px] text-[#5b6a88]">{totalReviews} {L("completed jobs", "पूरे काम", "पूर्ण कामे")}</div></div>
          </div>
        ) : (
          <p className="m-0 text-[14px] text-[#8a96ae]">{L("No ratings yet. They appear after employers rate your completed jobs.", "अभी कोई रेटिंग नहीं। पूरे काम पर नियोक्ता रेटिंग देंगे तो यहाँ दिखेगी।", "अजून रेटिंग नाही. पूर्ण कामांवर मालकांनी रेटिंग दिल्यावर येथे दिसेल.")}</p>
        )}
        {reviews.length > 0 && (
          <ul className="m-0 list-none space-y-3 p-0">
            {reviews.slice(0, 5).map((a) => (
              <li key={a._id} className="rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[14px] font-semibold text-[#0b1b3d]">{jobTitleOf(a, language)}</span><Stars value={a.rating!} size={14} /></div>
                {a.review && <p className="mb-0 mt-1.5 text-[14px] italic text-[#1f2a44]">&ldquo;{a.review}&rdquo;</p>}
                <p className="mb-0 mt-1 text-[12.5px] text-[#8a96ae]">{a.job?.companyName} {dateOf(a.updatedAt) && `• ${dateOf(a.updatedAt)}`}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mb-0 mt-4 text-[13px]"><Link href="/work-history" className="font-semibold text-[#1a4fc4] no-underline hover:underline">{L("See Work History", "कार्य इतिहास देखें", "कामाचा इतिहास पहा")}</Link></p>
      </section>

      <ProfileDocuments worker={worker} />

      {preview && (
        <div className="fixed inset-0 z-[9997] flex items-end justify-center bg-[rgba(11,27,61,0.5)] sm:items-center sm:p-5" onClick={() => setPreview(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="preview-title" className="m-0 text-[18px] font-bold text-[#0b1b3d]">{L("How employers see you", "नियोक्ता आपको कैसे देखते हैं", "मालक तुम्हाला कसे पाहतात")}</h2>
                <p className="mb-0 mt-1 text-[12.5px] text-[#5b6a88]">{L("Your phone number is shared only after an employer accepts your application. Documents and live location are never shown here.", "आपका फ़ोन नंबर तभी साझा होता है जब नियोक्ता आवेदन स्वीकार करे। दस्तावेज़ और लाइव लोकेशन यहाँ कभी नहीं दिखते।", "मालकाने अर्ज स्वीकारल्यावरच तुमचा फोन नंबर शेअर होतो. कागदपत्रे आणि लाइव्ह लोकेशन येथे कधीही दिसत नाहीत.")}</p>
              </div>
              <button type="button" onClick={() => setPreview(false)} aria-label={L("Close", "बंद करें", "बंद करा")} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#f3f6fb] hover:bg-[#e6ecf5]"><FiX size={18} aria-hidden="true" /></button>
            </div>
            <div className="mt-5 flex items-center gap-4">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fbbf24] text-[24px] font-bold text-[#3b2a00]">{initial}</span>
              )}
              <div>
                <div className="text-[18px] font-bold text-[#0b1b3d]">{worker.name}</div>
                {totalReviews > 0 && <div className="mt-1 flex items-center gap-2 text-[13px] text-[#5b6a88]"><Stars value={rating} size={14} />{rating.toFixed(1)} ({totalReviews})</div>}
              </div>
            </div>
            <dl className="mb-0 mt-5 space-y-4">
              <Value label={L("Skills", "कौशल", "कौशल्ये")}>{skills.join(", ")}</Value>
              <Value label={L("Location", "स्थान", "ठिकाण")}>{worker.location}</Value>
              {areas.length > 0 && <Value label={L("Preferred work locations", "पसंदीदा काम के स्थान", "पसंतीची कामाची ठिकाणे")}>{areas.join(", ")}</Value>}
              {worker.experienceYears != null && <Value label={L("Experience", "अनुभव", "अनुभव")}>{`${worker.experienceYears} ${L("years", "वर्ष", "वर्षे")}`}</Value>}
              {worker.experienceDetails && <Value label={L("Previous work", "पिछला काम", "मागील काम")}>{worker.experienceDetails}</Value>}
              <Value label={L("Availability", "उपलब्धता", "उपलब्धता")}>{av?.isAvailable === false ? L("Not available for work", "काम के लिए उपलब्ध नहीं", "कामासाठी उपलब्ध नाही") : availabilityText || L("Available for work", "काम के लिए उपलब्ध", "कामासाठी उपलब्ध")}</Value>
              {worker.about && <Value label={L("About", "परिचय", "परिचय")}>{worker.about}</Value>}
            </dl>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
