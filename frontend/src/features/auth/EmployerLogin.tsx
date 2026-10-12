"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import { ApiError } from "@/services/api";
import { employerLogin } from "@/services/auth";
import type { EmployerLoginForm } from "@/types";


export default function EmployerLogin() {
  const { language }      = useLanguage();
  const [form, setForm]   = useState<EmployerLoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router            = useRouter();
  const { login }         = useAuth();

  const labels = {
    en: { title: "Employer Login", email: "Email", password: "Password", login: "Login", loggingIn: "Logging in...", noAccount: "New employer?", register: "Create Account", error: "Login Failed" },
    hi: { title: "नियोक्ता लॉगिन", email: "ईमेल", password: "पासवर्ड", login: "लॉगिन", loggingIn: "लॉगिन हो रहा है...", noAccount: "नया नियोक्ता?", register: "अकाउंट बनाएं", error: "लॉगिन विफल" },
    mr: { title: "नियोक्ता लॉगिन", email: "ईमेल", password: "पासवर्ड", login: "लॉगिन", loggingIn: "लॉगिन होत आहे...", noAccount: "नवीन नियोक्ता?", register: "खाते तयार करा", error: "लॉगिन अयशस्वी" },
  };
  const t = labels[language] || labels.en;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await employerLogin(form);
      login(session);
      router.push(ROLE_HOME.employer);
    } catch (err) {
      if (err instanceof ApiError) toast(err.message || t.error, "error");
      else toast("Login Error — please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-5 px-4 font-plain">
      <div className="bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,.1)] w-full max-w-[420px] overflow-hidden">

        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#006491,#004f73)] py-7 px-6 text-center text-white">
          <div className="text-[48px] mb-2">🏢</div>
          <div className="text-[22px] font-extrabold">{t.title}</div>
          <div className="text-[13px] opacity-80 mt-1">
            {language === "hi" ? "अपने खाते में लॉगिन करें" : language === "mr" ? "तुमच्या खात्यात लॉगिन करा" : "Login to manage your jobs"}
          </div>
        </div>

        <div className="p-7">
          <form onSubmit={submit}>
            <input
              type="email" placeholder={t.email} required
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full py-3 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] mb-3 box-border outline-none"
            />
            <input
              type="password" placeholder={t.password} required
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full py-3 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] mb-5 box-border outline-none"
            />
            <button disabled={loading}
              className={`w-full py-3.5 px-0 bg-brand text-white rounded-xl font-bold text-[16px] ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer opacity-100"}`}>
              {loading ? t.loggingIn : t.login}
            </button>
          </form>

          {/* Register link */}
          <div className="text-center mt-5 pt-4 border-t border-t-[#f0f0f0]">
            <span className="text-[14px] text-gray-500">{t.noAccount} </span>
            <Link href="/employer-register" className="text-[14px] font-bold text-brand no-underline">
              {t.register} →
            </Link>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-3 bg-sky-50 rounded-[10px] py-2.5 px-3.5 text-[12px] text-sky-900 text-center">
            🔧 Demo: <b>demo@hiremate.com</b> / <b>demo1234</b>
          </div>
        </div>
      </div>
    </div>
  );
}