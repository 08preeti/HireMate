"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowRight,
  FiBriefcase,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiMail,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import { ApiError } from "@/services/api";
import { employerRegister } from "@/services/auth";
import type { EmployerRegisterForm, Language } from "@/types";

const labelData = {
  en: {
    title: "Create Employer Account",
    subtitle: "Post jobs and find workers instantly",
    company: "Company / Your Name",
    companyPh: "e.g. Shinde Logistics",
    email: "Email",
    emailPh: "you@company.com",
    password: "Password",
    passwordPh: "Create a password",
    show: "Show password",
    hide: "Hide password",
    register: "Create Account",
    registering: "Creating...",
    hasAccount: "Already have an account?",
    login: "Login",
    success: "Account created! Please login.",
    perk1: "Post jobs",
    perk2: "Reach workers",
    perk3: "Hire fast",
  },
  hi: {
    title: "नियोक्ता खाता बनाएं",
    subtitle: "नौकरियां पोस्ट करें और कामगार खोजें",
    company: "कंपनी / आपका नाम",
    companyPh: "जैसे: शिंदे लॉजिस्टिक्स",
    email: "ईमेल",
    emailPh: "you@company.com",
    password: "पासवर्ड",
    passwordPh: "पासवर्ड बनाएं",
    show: "पासवर्ड दिखाएं",
    hide: "पासवर्ड छुपाएं",
    register: "खाता बनाएं",
    registering: "बन रहा है...",
    hasAccount: "पहले से खाता है?",
    login: "लॉगिन करें",
    success: "खाता बना! लॉगिन करें।",
    perk1: "नौकरी पोस्ट करें",
    perk2: "कामगारों तक पहुंचें",
    perk3: "जल्दी हायर करें",
  },
  mr: {
    title: "नियोक्ता खाते तयार करा",
    subtitle: "नोकऱ्या पोस्ट करा आणि कामगार शोधा",
    company: "कंपनी / तुमचे नाव",
    companyPh: "उदा: शिंदे लॉजिस्टिक्स",
    email: "ईमेल",
    emailPh: "you@company.com",
    password: "पासवर्ड",
    passwordPh: "पासवर्ड तयार करा",
    show: "पासवर्ड दाखवा",
    hide: "पासवर्ड लपवा",
    register: "खाते तयार करा",
    registering: "तयार होत आहे...",
    hasAccount: "आधीच खाते आहे?",
    login: "लॉगिन करा",
    success: "खाते तयार! लॉगिन करा.",
    perk1: "नोकरी पोस्ट करा",
    perk2: "कामगारांपर्यंत पोहोचा",
    perk3: "लवकर भरती करा",
  },
};
// Typed as Record<Language, …> so the build fails if hi/mr ever miss a key.
const LABELS: Record<Language, typeof labelData.en> = labelData;

const inputCls =
  "w-full h-12 pl-11 pr-4 rounded-xl border-[1.5px] border-gray-200 bg-white text-[15px] text-gray-900 " +
  "placeholder:text-gray-400 outline-none box-border transition-colors focus:border-brand focus:ring-4 focus:ring-brand/10";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="block mb-1.5 text-[12px] font-bold text-gray-700">
        {label}
      </span>
      <span className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-gray-400 pointer-events-none">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}

export default function EmployerRegister() {
  const { language } = useLanguage();
  const [form, setForm] = useState<EmployerRegisterForm>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const t = LABELS[language] || LABELS.en;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await employerRegister(form);
      if (session) {
        // Registered and signed in: go straight to the employer dashboard.
        login(session);
        router.push(ROLE_HOME.employer);
      } else {
        toast(t.success, "success");
        router.push("/employer-login");
      }
    } catch (err) {
      if (err instanceof ApiError)
        toast(err.message || "Registration failed", "error");
      else toast("Registration Error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4 font-plain bg-[radial-gradient(60%_50%_at_50%_0%,#e8f4f8,transparent)]">
      <div className="bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,79,115,.14)] w-full max-w-[440px] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="relative bg-[linear-gradient(135deg,#006491,#004f73)] pt-8 pb-7 px-6 text-center text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-[28px]">
            <FaBuilding />
          </div>
          <h1 className="relative m-0 text-[24px] font-extrabold leading-tight">
            {t.title}
          </h1>
          <p className="relative m-0 mt-1.5 text-[13px] text-white/80">
            {t.subtitle}
          </p>

          <div className="relative mt-5 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
            {[
              [<FiBriefcase key="a" />, t.perk1],
              [<FiUsers key="b" />, t.perk2],
              [<FiZap key="c" />, t.perk3],
            ].map(([icon, text], i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1"
              >
                {icon}
                {text}
              </span>
            ))}
          </div>
        </div>

        <div className="p-7">
          <form onSubmit={submit}>
            <Field label={t.company} icon={<FiBriefcase />}>
              <input
                required
                autoComplete="organization"
                placeholder={t.companyPh}
                value={form.companyName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                className={inputCls}
              />
            </Field>

            <Field label={t.email} icon={<FiMail />}>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={t.emailPh}
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label={t.password} icon={<FiLock />}>
              <input
                type={showPw ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder={t.passwordPh}
                value={form.password ?? ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? t.hide : t.show}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[18px] text-gray-400 hover:text-brand cursor-pointer"
              >
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </Field>

            <button
              disabled={loading}
              className={`mt-2 w-full h-[52px] rounded-xl bg-danger hover:bg-danger-dark text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-[0_4px_0_#c0001f] active:translate-y-[2px] active:shadow-[0_2px_0_#c0001f] transition ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" /> {t.registering}
                </>
              ) : (
                <>
                  {t.register} <FiArrowRight />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="text-center mt-6 pt-5 border-t border-gray-100">
            <span className="text-[14px] text-gray-500">{t.hasAccount} </span>
            <Link
              href="/employer-login"
              className="text-[14px] font-bold text-brand no-underline hover:underline"
            >
              {t.login} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
