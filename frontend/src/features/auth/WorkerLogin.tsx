"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import VoiceSearch from "@/components/ui/VoiceSearch";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import { ApiError } from "@/services/api";
import { workerSendOtp, workerVerifyOtp } from "@/services/auth";
import { updateWorkerProfile } from "@/services/workers";
import type { Language, WorkerSession } from "@/types";

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

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4 font-plain">
      <div className="bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,.12)] w-full max-w-[420px] overflow-hidden">

        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#006491,#004f73)] py-7 px-6 text-center text-white">
          <div className="text-[48px] mb-2">👷</div>
          <div className="text-[22px] font-extrabold">
            {language === "hi" ? "कामगार लॉगिन" : language === "mr" ? "कामगार लॉगिन" : "Worker Login"}
          </div>
          <div className="text-[13px] opacity-80 mt-1">
            {language === "hi" ? "अपना फ़ोन नंबर दर्ज करें" : language === "mr" ? "तुमचा फोन नंबर टाका" : "Enter your phone number to continue"}
          </div>
        </div>

        <div className="p-6">

          {/* ── STEP 1: PHONE ───────────────────────────── */}
          {step === STEPS.PHONE && (
            <>
              <div className="text-[14px] font-semibold text-gray-700 mb-2">
                {language === "hi" ? "📱 फ़ोन नंबर" : language === "mr" ? "📱 फोन नंबर" : "📱 Phone Number"}
              </div>
              <div className="flex gap-2 mb-4">
                <div className="bg-gray-100 rounded-[10px] py-3 px-3.5 font-bold text-[15px] border-[1.5px] border-gray-200">+91</div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="9876543210"
                  className="flex-1 py-3 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[16px] outline-none tracking-[2px]"
                />
              </div>

              {error && <div className="text-danger text-[13px] mb-3">⚠️ {error}</div>}

              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                className={`w-full py-3.5 px-0 text-white rounded-xl font-bold text-[16px] ${phone.length >= 10 ? "bg-brand cursor-pointer shadow-[0_4px_14px_rgba(0,100,145,.3)]" : "bg-gray-400 cursor-not-allowed shadow-none"}`}
              >
                {loading ? "Sending…" : (language === "hi" ? "OTP भेजें" : language === "mr" ? "OTP पाठवा" : "Send OTP")}
              </button>
            </>
          )}

          {/* ── STEP 2: OTP ─────────────────────────────── */}
          {step === STEPS.OTP && (
            <>
              <div className="text-center mb-5">
                <div className="text-[40px]">📱</div>
                <div className="font-bold text-[16px] mt-2">
                  {language === "hi" ? "OTP दर्ज करें" : language === "mr" ? "OTP टाका" : "Enter OTP"}
                </div>
                <div className="text-[13px] text-gray-500 mt-1">
                  {language === "hi" ? `+91 ${phone} पर भेजा गया` : language === "mr" ? `+91 ${phone} वर पाठवला` : `Sent to +91 ${phone}`}
                </div>
                {devOtp && (
                  <div className="mt-2 bg-[#fff3cd] border border-[#ffc107] rounded-lg py-1.5 px-3 text-[13px] text-[#856404]">
                    🔧 Dev OTP: <b>{devOtp}</b>
                  </div>
                )}
              </div>

              <input
                type="tel"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="● ● ● ● ● ●"
                className="w-full py-4 px-3.5 border-2 border-brand rounded-xl text-[24px] text-center tracking-[8px] outline-none box-border mb-4"
              />

              {error && <div className="text-danger text-[13px] mb-3">⚠️ {error}</div>}

              <button
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                className={`w-full py-3.5 px-0 text-white rounded-xl font-bold text-[16px] mb-3 ${otp.length === 6 ? "bg-brand cursor-pointer" : "bg-gray-400 cursor-not-allowed"}`}
              >
                {loading ? "Verifying…" : (language === "hi" ? "सत्यापित करें" : language === "mr" ? "सत्यापित करा" : "Verify OTP")}
              </button>

              <button
                onClick={() => { setStep(STEPS.PHONE); setOtp(""); setError(""); setDevOtp(""); }}
                className="w-full py-2.5 px-0 bg-transparent border border-gray-200 rounded-xl text-gray-500 text-[14px] cursor-pointer"
              >
                {language === "hi" ? "← वापस जाएं" : language === "mr" ? "← परत जा" : "← Change Number"}
              </button>
            </>
          )}

          {/* ── STEP 3: NEW WORKER PROFILE ──────────────── */}
          {step === STEPS.PROFILE && (
            <>
              <div className="text-center mb-5">
                <div className="text-[36px]">🎉</div>
                <div className="font-bold text-[16px] mt-2">
                  {language === "hi" ? "नया अकाउंट बनाएं" : language === "mr" ? "नवीन खाते तयार करा" : "Create Your Account"}
                </div>
                <div className="text-[13px] text-gray-500 mt-1">
                  {language === "hi" ? "सिर्फ एक बार — फिर हमेशा फ़ोन से लॉगिन होगा" : language === "mr" ? "फक्त एकदा — नंतर फोनने लॉगिन" : "Just once — next time login with phone"}
                </div>
              </div>

              {/* Name */}
              <div className="text-[13px] font-semibold text-gray-700 mb-1.5">
                {language === "hi" ? "आपका नाम" : language === "mr" ? "तुमचे नाव" : "Your Name"}
              </div>
              <input
                placeholder={language === "hi" ? "जैसे: रमेश पाटिल" : language === "mr" ? "उदा: रमेश पाटील" : "e.g. Ramesh Patil"}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                className="w-full py-3 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] mb-4 box-border outline-none"
              />

              {/* Voice search for skill */}
              <div className="text-center mb-4 p-3.5 bg-sky-50 rounded-[14px] border border-sky-200">
                <div className="text-[13px] font-semibold text-sky-900 mb-2.5">
                  {language === "hi" ? "🎤 बोलकर अपना काम बताएं" : language === "mr" ? "🎤 बोलून तुमचे काम सांगा" : "🎤 Or speak your skill"}
                </div>
                <VoiceSearch
                  onResult={(skill, transcript) => {
                    if (skill) setSelectedSkill(skill);
                  }}
                />
              </div>

              {/* Skill — picture grid */}
              <div className="text-[13px] font-semibold text-gray-700 mb-2.5">
                {language === "hi" ? "आपका काम चुनें 👇" : language === "mr" ? "तुमचे काम निवडा 👇" : "Select Your Skill 👇"}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill.value}
                    onClick={() => setSelectedSkill(skill.value)}
                    className={`py-2.5 px-1 rounded-xl cursor-pointer flex flex-col items-center gap-1 transition-all duration-150 border-2 ${selectedSkill === skill.value ? "border-brand bg-brand-light" : "border-gray-200 bg-gray-50"}`}
                  >
                    <span className="text-[24px]">{skill.emoji}</span>
                    <span className={`text-[10px] font-semibold text-center leading-[1.2] ${selectedSkill === skill.value ? "text-brand" : "text-gray-500"}`}>
                      {skillLabel(skill)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Location */}
              <div className="text-[13px] font-semibold text-gray-700 mb-1.5">
                {language === "hi" ? "आपका इलाका (वैकल्पिक)" : language === "mr" ? "तुमचा परिसर (पर्यायी)" : "Your Area (Optional)"}
              </div>
              <input
                placeholder={language === "hi" ? "जैसे: नासिक, पुणे" : language === "mr" ? "उदा: नाशिक, पुणे" : "e.g. Nashik, Pune"}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full py-3 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] mb-4 box-border outline-none"
              />

              {error && <div className="text-danger text-[13px] mb-3">⚠️ {error}</div>}

              <button
                onClick={completeProfile}
                disabled={loading || !name.trim() || !selectedSkill}
                className={`w-full py-3.5 px-0 text-white rounded-xl font-bold text-[16px] shadow-[0_4px_14px_rgba(0,100,145,.3)] ${name.trim() && selectedSkill ? "bg-brand cursor-pointer" : "bg-gray-400 cursor-not-allowed"}`}
              >
                {loading ? "Setting up…" : (language === "hi" ? "शुरू करें 🚀" : language === "mr" ? "सुरू करा 🚀" : "Start Working 🚀")}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}