"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";
import { LuArrowLeft, LuArrowRight, LuChevronDown, LuMapPin, LuRocket, LuShieldCheck, LuSparkles, LuTriangleAlert } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useLanguage } from "@/context/LanguageContext";
import VoiceSearch from "@/components/ui/VoiceSearch";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import { ApiError } from "@/services/api";
import { workerSendOtp, workerVerifyOtp } from "@/services/auth";
import { updateWorkerProfile } from "@/services/workers";
import { HERO_PEOPLE } from "@/features/home/homeAssets";
import type { Language, WorkerSession } from "@/types";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const INPUT =
  "w-full rounded-xl border-[1.5px] border-[#dbe4f0] bg-white px-4 py-3 text-[15px] text-[#0d2250] outline-none transition placeholder:text-[#a9b3c5] focus:border-[#1a6cf0] focus:shadow-[0_0_0_4px_rgba(26,108,240,0.12)]";
const LABEL = "mb-1.5 block text-[13px] font-semibold text-[#0d2250]";
const PRIMARY =
  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]";

interface SkillOption {
  value: string;
  emoji: string;
  labelEn: string;
  labelHi: string;
  labelMr: string;
}

type LabelKey = "labelEn" | "labelHi" | "labelMr";


// Picture-based skill selection — no typing needed
const SKILL_OPTIONS: SkillOption[] = [
  { value: "Electrician",        emoji: "⚡", labelEn: "Electrician",  labelHi: "इलेक्ट्रीशियन", labelMr: "इलेक्ट्रिशियन" },
  { value: "Plumber",            emoji: "🔧", labelEn: "Plumber",      labelHi: "प्लम्बर",         labelMr: "प्लंबर" },
  { value: "Cook",               emoji: "🍳", labelEn: "Cook",         labelHi: "रसोइया",          labelMr: "स्वयंपाकी" },
  { value: "Driver",             emoji: "🚗", labelEn: "Driver",       labelHi: "ड्राइवर",         labelMr: "चालक" },
  { value: "Carpenter",          emoji: "🪚", labelEn: "Carpenter",    labelHi: "बढ़ई",            labelMr: "सुतार" },
  { value: "Painter",            emoji: "🎨", labelEn: "Painter",      labelHi: "पेंटर",           labelMr: "रंगारी" },
  { value: "Cleaner",            emoji: "🧹", labelEn: "Cleaner",      labelHi: "सफाईकर्मी",       labelMr: "सफाई कामगार" },
  { value: "Security Guard",     emoji: "🛡️", labelEn: "Security",    labelHi: "गार्ड",           labelMr: "सुरक्षारक्षक" },
  { value: "Gardener",           emoji: "🌿", labelEn: "Gardener",     labelHi: "माली",            labelMr: "माळी" },
  { value: "Delivery Boy",       emoji: "📦", labelEn: "Delivery",     labelHi: "डिलीवरी",         labelMr: "डिलिव्हरी" },
  { value: "Mechanic",           emoji: "⚙️", labelEn: "Mechanic",    labelHi: "मैकेनिक",         labelMr: "मेकॅनिक" },
  { value: "Mason",              emoji: "🏗️", labelEn: "Mason",       labelHi: "राजमिस्त्री",     labelMr: "गवंडी" },
  { value: "House Maid",         emoji: "🏠", labelEn: "Maid",         labelHi: "घरेलू काम",       labelMr: "घरकाम" },
  { value: "Waiter",             emoji: "🍽️", labelEn: "Waiter",      labelHi: "वेटर",            labelMr: "वेटर" },
  { value: "Helper",             emoji: "👷", labelEn: "Helper",       labelHi: "मजदूर",           labelMr: "मजूर" },
  { value: "Welder",             emoji: "🔥", labelEn: "Welder",       labelHi: "वेल्डर",          labelMr: "वेल्डर" },
];

const STEPS = { PHONE: "phone", OTP: "otp", PROFILE: "profile" } as const;
type Step = (typeof STEPS)[keyof typeof STEPS];

export default function WorkerLogin() {
  const router               = useRouter();
  const { language }         = useLanguage();
  const { login }            = useAuth();

  const [step, setStep]         = useState<Step>(STEPS.PHONE);
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [name, setName]         = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [devOtp, setDevOtp]     = useState(""); // shown in dev mode
  // Existing worker who verified their OTP but has no skill yet: signed in only after the profile is completed.
  const [pending, setPending]   = useState<WorkerSession | null>(null);

  const labels: Record<Language, { s: LabelKey }> = {
    en: { s: "labelEn" }, hi: { s: "labelHi" }, mr: { s: "labelMr" },
  };
  const skillLabel = (skill: SkillOption): string => skill[labels[language]?.s || "labelEn"];

  const finishLogin = (session: WorkerSession) => {
    login(session);
    router.push(ROLE_HOME.worker);
  };

  // Step 1 — Send OTP
  const sendOTP = async () => {
    if (phone.length < 10) { setError("Please enter a valid 10-digit phone number"); return; }
    setError(""); setLoading(true);
    try {
      const data = await workerSendOtp(phone);
      if (data.otp) setDevOtp(data.otp); // always show for demo
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Server error. Please try again.");
    }
    setLoading(false);
  };

  // Step 2 — Verify OTP
  const verifyOTP = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try {
      const session = await workerVerifyOtp({ phone, otp });
      // Existing worker — if no skill is set yet, finish the profile before signing in
      if (!session.user.skills) {
        setPending(session);
        setStep(STEPS.PROFILE);
      } else {
        finishLogin(session);
      }
    } catch (err) {
      // New worker — need profile setup
      if (err instanceof ApiError && err.message === "Name required for new registration") {
        setStep(STEPS.PROFILE);
      } else {
        setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
      }
    }
    setLoading(false);
  };

  // Step 3 — Complete profile (new worker, or existing worker without a skill)
  const completeProfile = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!selectedSkill) { setError("Please select your skill"); return; }
    setError(""); setLoading(true);
    try {
      if (pending) {
        const updated = await updateWorkerProfile(
          pending.user._id,
          { name, skills: selectedSkill, location },
          pending.token
        );
        finishLogin({ ...pending, user: { ...pending.user, ...updated } });
      } else {
        // The OTP is only consumed once the profile arrives with it, so this call is the sign-up.
        finishLogin(await workerVerifyOtp({ phone, otp, name, skills: selectedSkill, location }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);
  const stepIndex = step === STEPS.PHONE ? 0 : step === STEPS.OTP ? 1 : 2;

  const BENEFITS: { icon: IconType; text: string }[] = [
    { icon: LuMapPin, text: L("Jobs near you, found with GPS", "GPS से अपने पास की नौकरियां", "GPS ने जवळच्या नोकऱ्या") },
    { icon: LuRocket, text: L("Search and apply with your voice", "बोलकर खोजें और आवेदन करें", "बोलून शोधा आणि अर्ज करा") },
    { icon: LuSparkles, text: L("Smart AI matching to the right work", "AI से सही काम का मिलान", "AI द्वारे योग्य कामाची जुळवणी") },
    { icon: LuShieldCheck, text: L("Verified employers, safe and trusted", "सत्यापित नियोक्ता, सुरक्षित और भरोसेमंद", "पडताळलेले नियोक्ते, सुरक्षित आणि विश्वासार्ह") },
  ];

  const primaryBtn = (enabled: boolean) =>
    `${PRIMARY} ${enabled ? "bg-[linear-gradient(180deg,#1a73f5_0%,#0b57d0_100%)] shadow-[0_10px_24px_rgba(11,87,208,0.30)] hover:brightness-95 cursor-pointer" : "bg-[#b4c2d8] cursor-not-allowed"}`;

  const ErrorBox = () =>
    error ? (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-danger">
        <LuTriangleAlert className="shrink-0" size={16} aria-hidden="true" /> {error}
      </div>
    ) : null;

  const Logo = ({ size = "lg" }: { size?: "lg" | "sm" }) => (
    <Link href="/" className="flex items-center gap-3 no-underline">
      <span className={`flex items-center justify-center rounded-xl bg-[#1a6cf0] font-extrabold text-white ${size === "lg" ? "h-10 w-11 text-[17px]" : "h-9 w-10 text-[15px]"}`}>HM</span>
      <span className={`font-extrabold text-[#0d2250] ${size === "lg" ? "text-[22px]" : "text-[19px]"}`}>HireMate</span>
    </Link>
  );

  return (
    <div className={`${poppins.className} min-h-screen bg-white lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden`}>
      {/* ───────── Left: brand panel (desktop only) ───────── */}
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#f3f7ff_0%,#fbfcff_100%)] px-[clamp(32px,4.5vw,80px)] py-8 lg:flex lg:min-h-0 lg:flex-col">
        <div className="pointer-events-none absolute -right-28 -top-40 h-[340px] w-[340px] rounded-full bg-[#dbe8fb]/70" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[260px] w-[260px] rounded-full bg-[#dbe8fb]/60" />

        <div className="relative z-10"><Logo /></div>

        <div className="relative z-10 mt-8 max-w-[560px]">
          <h2 className="text-[clamp(28px,2.5vw,38px)] font-extrabold leading-[1.12] text-[#0d2250]">
            {L("Find work near you.", "अपने पास काम खोजें।", "जवळ काम शोधा.")}
            <br />
            <span className="text-[#1a6cf0]">{L("Get paid daily.", "रोज़ कमाएं।", "रोज कमवा.")}</span>
          </h2>
          <p className="mt-3 text-[15px] leading-[1.45] text-[#5b6a85]">
            {L(
              "Trusted platform connecting skilled workers with local jobs — simple, fast and secure.",
              "कुशल कामगारों को स्थानीय नौकरियों से जोड़ने वाला भरोसेमंद प्लेटफ़ॉर्म — आसान, तेज़ और सुरक्षित।",
              "कुशल कामगारांना स्थानिक नोकऱ्यांशी जोडणारे विश्वासार्ह प्लॅटफॉर्म — सोपे, जलद आणि सुरक्षित."
            )}
          </p>
          <ul className="mt-5 space-y-2.5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[14px] text-[#16295a]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3edfd] text-[#1a6cf0]">
                  <Icon size={16} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_PEOPLE}
          alt="Smiling workers on a rooftop at sunset"
          className="relative z-10 mt-6 h-0 min-h-[120px] w-full max-w-[640px] flex-1 rounded-[22px] object-cover object-[center_30%] shadow-[0_18px_44px_rgba(20,50,110,0.18)]"
          draggable={false}
        />
      </aside>

      {/* ───────── Right: form ───────── */}
      <main className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_55%)] px-5 py-6 sm:px-10 lg:h-screen lg:overflow-y-auto lg:px-[clamp(40px,5vw,96px)] lg:py-5">
        <div className="flex items-center justify-between">
          <div className="lg:hidden"><Logo size="sm" /></div>
          <Link href="/" className="ml-auto flex items-center gap-2 text-[13px] font-medium text-[#5b6a85] no-underline hover:text-[#1a6cf0]">
            <LuArrowLeft size={16} aria-hidden="true" /> {L("Back to home", "होम पर वापस", "होमवर परत")}
          </Link>
        </div>

        <div className="mx-auto flex w-full flex-1 items-center py-4">
          <div className={`w-full ${step === STEPS.PROFILE ? "max-w-[520px]" : "max-w-[480px]"}`}>
            {/* Heading + progress */}
            <div className="mb-5">
              <div className="mb-4 flex items-center gap-2" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1 w-9 rounded-full transition-colors ${i <= stepIndex ? "bg-[#1a6cf0]" : "bg-[#dfe6f1]"}`} />
                ))}
              </div>
              <h1 className="text-[clamp(26px,2.1vw,32px)] font-extrabold leading-tight text-[#0d2250]">
                {step === STEPS.PHONE && L("Worker Login", "कामगार लॉगिन", "कामगार लॉगिन")}
                {step === STEPS.OTP && L("Verify your number", "नंबर सत्यापित करें", "नंबर सत्यापित करा")}
                {step === STEPS.PROFILE && L("Create your account", "नया अकाउंट बनाएं", "नवीन खाते तयार करा")}
              </h1>
              <p className="mt-1 text-[15px] text-[#5b6a85]">
                {step === STEPS.PHONE && L("Enter your phone number to continue", "अपना फ़ोन नंबर दर्ज करें", "तुमचा फोन नंबर टाका")}
                {step === STEPS.OTP && L(`We sent a 6-digit code to +91 ${phone}`, `+91 ${phone} पर 6-अंकों का कोड भेजा गया`, `+91 ${phone} वर 6-अंकी कोड पाठवला`)}
                {step === STEPS.PROFILE && L("Just once — next time login with your phone", "सिर्फ एक बार — फिर हमेशा फ़ोन से लॉगिन", "फक्त एकदा — नंतर फोनने लॉगिन")}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#e6ecf5] bg-white p-5 shadow-[0_12px_40px_rgba(20,50,110,0.07)] sm:p-6">

              {/* ── STEP 1: PHONE ───────────────────────────── */}
              {step === STEPS.PHONE && (
                <>
                  <label className={LABEL} htmlFor="phone">
                    {L("Phone Number", "फ़ोन नंबर", "फोन नंबर")}
                  </label>
                  <div className="mb-4 flex gap-2.5">
                    <div className="flex shrink-0 items-center gap-2 rounded-xl border-[1.5px] border-[#dbe4f0] bg-white px-3.5 text-[14px] font-semibold text-[#0d2250]" aria-label="India +91">
                      <svg viewBox="0 0 24 16" width="22" height="15" aria-hidden="true" className="rounded-[2px]">
                        <rect width="24" height="5.34" fill="#f28c28" />
                        <rect y="5.33" width="24" height="5.34" fill="#fff" />
                        <rect y="10.66" width="24" height="5.34" fill="#1f9d55" />
                        <circle cx="12" cy="8" r="1.8" fill="none" stroke="#2b3f9e" strokeWidth="0.6" />
                      </svg>
                      +91
                      <LuChevronDown size={16} className="text-[#5b6a85]" aria-hidden="true" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && phone.length >= 10 && !loading) sendOTP(); }}
                      placeholder="9876543210"
                      className={`${INPUT} min-w-0 flex-1 text-[16px]`}
                    />
                  </div>

                  <ErrorBox />

                  <button onClick={sendOTP} disabled={loading || phone.length < 10} className={primaryBtn(phone.length >= 10)}>
                    {loading ? "Sending…" : <>{L("Send OTP", "OTP भेजें", "OTP पाठवा")} <LuArrowRight size={17} aria-hidden="true" /></>}
                  </button>
                  <p className="mt-4 text-center text-[12px] text-[#7d889e]">
                    {L("We'll send a one-time code by SMS. No password needed.", "हम SMS से एक बार का कोड भेजेंगे। पासवर्ड की ज़रूरत नहीं।", "आम्ही SMS ने एकदाच कोड पाठवू. पासवर्ड नको.")}
                  </p>
                </>
              )}

              {/* ── STEP 2: OTP ─────────────────────────────── */}
              {step === STEPS.OTP && (
                <>
                  {devOtp && (
                    <div className="mb-4 rounded-lg border border-[#ffc107] bg-[#fff3cd] px-3 py-1.5 text-[13px] text-[#856404]">
                      Dev OTP: <b>{devOtp}</b>
                    </div>
                  )}

                  <label className={LABEL} htmlFor="otp">{L("Enter OTP", "OTP दर्ज करें", "OTP टाका")}</label>
                  <input
                    id="otp"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && otp.length === 6 && !loading) verifyOTP(); }}
                    placeholder="● ● ● ● ● ●"
                    className={`${INPUT} mb-6 py-4 text-center text-[24px] tracking-[8px]`}
                  />

                  <ErrorBox />

                  <button onClick={verifyOTP} disabled={loading || otp.length !== 6} className={`${primaryBtn(otp.length === 6)} mb-3`}>
                    {loading ? "Verifying…" : <>{L("Verify OTP", "सत्यापित करें", "सत्यापित करा")} <LuArrowRight size={17} aria-hidden="true" /></>}
                  </button>

                  <button
                    onClick={() => { setStep(STEPS.PHONE); setOtp(""); setError(""); setDevOtp(""); }}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dbe4f0] bg-transparent py-3 text-[14px] text-[#5b6a85] transition hover:bg-[#f4f7fb]"
                  >
                    <LuArrowLeft size={16} aria-hidden="true" /> {L("Change Number", "वापस जाएं", "परत जा")}
                  </button>
                </>
              )}

              {/* ── STEP 3: NEW WORKER PROFILE ──────────────── */}
              {step === STEPS.PROFILE && (
                <>
                  <label className={LABEL} htmlFor="name">{L("Your Name", "आपका नाम", "तुमचे नाव")}</label>
                  <input
                    id="name"
                    placeholder={L("e.g. Ramesh Patil", "जैसे: रमेश पाटिल", "उदा: रमेश पाटील")}
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    className={`${INPUT} mb-5`}
                  />

                  {/* Voice search for skill */}
                  <div className="mb-5 rounded-[14px] border border-[#d6e4fb] bg-[#f2f7ff] p-3.5 text-center">
                    <div className="mb-2.5 text-[13px] font-semibold text-[#16295a]">
                      {L("Or speak your skill", "बोलकर अपना काम बताएं", "बोलून तुमचे काम सांगा")}
                    </div>
                    <VoiceSearch
                      onResult={(skill) => {
                        if (skill) setSelectedSkill(skill);
                      }}
                    />
                  </div>

                  {/* Skill — picture grid */}
                  <div className={LABEL}>{L("Select Your Skill", "आपका काम चुनें", "तुमचे काम निवडा")}</div>
                  <div className="mb-5 grid grid-cols-4 gap-2">
                    {SKILL_OPTIONS.map((skill) => (
                      <button
                        key={skill.value}
                        onClick={() => setSelectedSkill(skill.value)}
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 transition-all duration-150 hover:border-[#1a6cf0]/50 ${selectedSkill === skill.value ? "border-[#1a6cf0] bg-[#eaf2ff]" : "border-[#e3e9f3] bg-[#f8fafd]"}`}
                      >
                        <span className="text-[24px]">{skill.emoji}</span>
                        <span className={`text-center text-[10.5px] font-semibold leading-[1.2] ${selectedSkill === skill.value ? "text-[#1a6cf0]" : "text-[#5b6a85]"}`}>
                          {skillLabel(skill)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Location */}
                  <label className={LABEL} htmlFor="area">{L("Your Area (Optional)", "आपका इलाका (वैकल्पिक)", "तुमचा परिसर (पर्यायी)")}</label>
                  <input
                    id="area"
                    placeholder={L("e.g. Nashik, Pune", "जैसे: नासिक, पुणे", "उदा: नाशिक, पुणे")}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`${INPUT} mb-6`}
                  />

                  <ErrorBox />

                  <button onClick={completeProfile} disabled={loading || !name.trim() || !selectedSkill} className={primaryBtn(!!(name.trim() && selectedSkill))}>
                    {loading ? "Setting up…" : <>{L("Start Working", "शुरू करें", "सुरू करा")} <LuRocket size={17} aria-hidden="true" /></>}
                  </button>
                </>
              )}
            </div>

            <p className="mt-5 text-center text-[14px] text-[#5b6a85]">
              {L("Hiring workers?", "कामगार चाहिए?", "कामगार हवेत?")}{" "}
              <Link href="/employer-login" className="inline-flex items-center gap-1.5 font-semibold text-[#1a6cf0] no-underline hover:underline">
                {L("Employer login", "नियोक्ता लॉगिन", "नियोक्ता लॉगिन")} <LuArrowRight size={16} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}