"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import { ApiError } from "@/services/api";
import { employerRegister } from "@/services/auth";
import type { EmployerRegisterForm } from "@/types";


export default function EmployerRegister() {
  const { language }      = useLanguage();
  const [form, setForm]   = useState<EmployerRegisterForm>({});
  const [loading, setLoading] = useState(false);
  const router            = useRouter();
  const { login }         = useAuth();

  const labels = {
    en: { title: "Create Employer Account", company: "Company / Your Name", email: "Email", password: "Password", register: "Create Account", registering: "Creating...", hasAccount: "Already have an account?", login: "Login", success: "Account created! Please login." },
    hi: { title: "नियोक्ता खाता बनाएं", company: "कंपनी / आपका नाम", email: "ईमेल", password: "पासवर्ड", register: "खाता बनाएं", registering: "बन रहा है...", hasAccount: "पहले से खाता है?", login: "लॉगिन करें", success: "खाता बना! लॉगिन करें।" },
    mr: { title: "नियोक्ता खाते तयार करा", company: "कंपनी / तुमचे नाव", email: "ईमेल", password: "पासवर्ड", register: "खाते तयार करा", registering: "तयार होत आहे...", hasAccount: "आधीच खाते आहे?", login: "लॉगिन करा", success: "खाते तयार! लॉगिन करा." },
  };
  const t = labels[language] || labels.en;

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
      if (err instanceof ApiError) toast(err.message || "Registration failed", "error");
      else toast("Registration Error", "error");
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
            {language === "hi" ? "नौकरियां पोस्ट करें और कामगार खोजें" : language === "mr" ? "नोकऱ्या पोस्ट करा आणि कामगार शोधा" : "Post jobs and find workers instantly"}
          </div>
        </div>

        <div className="p-7">
          <form onSubmit={submit}>
            <input
              placeholder={t.company} required
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full py-3 px-3.5 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] mb-3 box-border outline-none"
            />
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
              className={`w-full py-3.5 px-0 bg-danger text-white rounded-xl font-bold text-[16px] ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer opacity-100"}`}>
              {loading ? t.registering : t.register}
            </button>
          </form>

          {/* Login link */}
          <div className="text-center mt-5 pt-4 border-t border-t-[#f0f0f0]">
            <span className="text-[14px] text-gray-500">{t.hasAccount} </span>
            <Link href="/employer-login" className="text-[14px] font-bold text-brand no-underline">
              {t.login} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}