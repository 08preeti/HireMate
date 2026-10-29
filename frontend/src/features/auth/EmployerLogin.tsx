"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";
import { LuArrowLeft, LuArrowRight, LuBriefcase, LuEye, LuEyeOff, LuLock, LuMail, LuShieldCheck, LuUsers } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/config/routes";
import { ApiError } from "@/services/api";
import { employerLogin } from "@/services/auth";
import type { EmployerLoginForm } from "@/types";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const LABEL = "mb-1.5 block text-[13px] font-semibold text-[#0d2250]";
const FIELD =
  "flex items-center gap-3 rounded-xl border-[1.5px] border-[#dbe4f0] bg-white px-4 transition focus-within:border-[#1a6cf0] focus-within:shadow-[0_0_0_4px_rgba(26,108,240,0.12)]";
const INPUT =
  "w-full min-w-0 bg-transparent py-3 text-[15px] text-[#0d2250] outline-none placeholder:text-[#a9b3c5]";

export default function EmployerLogin() {
  const { language }          = useLanguage();
  const [form, setForm]       = useState<EmployerLoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const router                = useRouter();
  const { login }             = useAuth();

  const labels = {
    en: { title: "Employer Login", sub: "Login to manage your jobs", email: "Email", password: "Password", login: "Login", loggingIn: "Logging in...", noAccount: "New business owner?", register: "Create Account", error: "Login Failed", back: "Back to home", show: "Show password", hide: "Hide password" },
    hi: { title: "नियोक्ता लॉगिन", sub: "अपने खाते में लॉगिन करें", email: "ईमेल", password: "पासवर्ड", login: "लॉगिन", loggingIn: "लॉगिन हो रहा है...", noAccount: "नए बिज़नेस ओनर?", register: "अकाउंट बनाएं", error: "लॉगिन विफल", back: "होम पर वापस", show: "पासवर्ड दिखाएं", hide: "पासवर्ड छुपाएं" },
    mr: { title: "नियोक्ता लॉगिन", sub: "तुमच्या खात्यात लॉगिन करा", email: "ईमेल", password: "पासवर्ड", login: "लॉगिन", loggingIn: "लॉगिन होत आहे...", noAccount: "नवीन व्यवसाय मालक?", register: "खाते तयार करा", error: "लॉगिन अयशस्वी", back: "होमवर परत", show: "पासवर्ड दाखवा", hide: "पासवर्ड लपवा" },
  };
  const t = labels[language] || labels.en;
  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  const BENEFITS: { icon: IconType; title: string; sub: string }[] = [
    { icon: LuBriefcase, title: L("Create and manage job postings", "नौकरी पोस्टिंग बनाएं और संभालें", "नोकरीच्या जाहिराती तयार करा आणि सांभाळा"), sub: L("Find the right talent, faster.", "सही प्रतिभा, जल्दी पाएं।", "योग्य प्रतिभा, लवकर मिळवा.") },
    { icon: LuUsers, title: L("Review and shortlist candidates", "उम्मीदवारों को देखें और चुनें", "उमेदवार तपासा आणि निवडा"), sub: L("Make better hiring decisions.", "बेहतर भर्ती निर्णय लें।", "भरतीचे चांगले निर्णय घ्या.") },
    { icon: LuShieldCheck, title: L("Build your trusted team", "अपनी भरोसेमंद टीम बनाएं", "तुमची विश्वासू टीम बनवा"), sub: L("Grow with verified and skilled workers.", "सत्यापित और कुशल कामगारों के साथ बढ़ें।", "पडताळलेल्या आणि कुशल कामगारांसह वाढा.") },
  ];

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

  const Logo = ({ size = "lg" }: { size?: "lg" | "sm" }) => (
    <Link href="/" className="flex items-center gap-3 no-underline">
      <span className={`flex items-center justify-center rounded-xl bg-[#1a6cf0] font-extrabold text-white ${size === "lg" ? "h-10 w-11 text-[17px]" : "h-9 w-10 text-[15px]"}`}>HM</span>
      <span className={`font-extrabold text-[#0d2250] ${size === "lg" ? "text-[22px]" : "text-[19px]"}`}>HireMate</span>
    </Link>
  );

  return (
    <div className={`${poppins.className} min-h-screen bg-white lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden`}>
      {/* ───────── Left: brand panel (desktop only) ───────── */}
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#f3f7ff_0%,#eef4fd_100%)] px-[clamp(32px,4.5vw,80px)] py-8 lg:block">
        <div className="pointer-events-none absolute -right-28 -top-40 h-[340px] w-[340px] rounded-full bg-[#dbe8fb]/70" />

        {/* Hero photo, anchored to the bottom and faded into the panel */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/employer-hero.jpg"
          alt="A business owner standing with a team of smiling workers"
          className="pointer-events-none absolute bottom-0 left-0 w-full select-none [mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%)]"
          draggable={false}
        />

        <div className="relative z-10"><Logo /></div>

        <div className="relative z-10 mt-8 max-w-[600px]">
          <h2 className="text-[clamp(28px,2.5vw,38px)] font-extrabold leading-[1.1] text-[#0d2250]">
            {L("Hire the ", "सही लोगों को ", "योग्य लोकांना ")}
            <span className="text-[#1a6cf0]">{L("right people.", "रखें।", "नेमा.")}</span>
            <br />
            {L("Build a stronger team.", "मज़बूत टीम बनाएं।", "मजबूत टीम बनवा.")}
          </h2>
          <p className="mt-3 text-[15px] leading-[1.45] text-[#5b6a85]">
            {L(
              "As an owner, manage your job postings, review applications and hire the best talent — all in one place.",
              "मालिक के रूप में नौकरी पोस्टिंग संभालें, आवेदन देखें और सबसे अच्छी प्रतिभा को रखें — सब एक ही जगह।",
              "मालक म्हणून नोकरीच्या जाहिराती सांभाळा, अर्ज तपासा आणि सर्वोत्तम प्रतिभा नेमा — सर्व एकाच ठिकाणी."
            )}
          </p>
          <ul className="mt-5 space-y-3">
            {BENEFITS.map(({ icon: Icon, title, sub }) => (
              <li key={title} className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e3edfd] text-[#1a6cf0]">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[14.5px] font-medium text-[#0d2250]">{title}</span>
                  <span className="block text-[12px] text-[#6b7a95]">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ───────── Right: form ───────── */}
      <main className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_55%)] px-5 py-6 sm:px-10 lg:h-screen lg:overflow-y-auto lg:px-[clamp(40px,5vw,96px)] lg:py-5">
        <div className="flex items-center justify-between">
          <div className="lg:hidden"><Logo size="sm" /></div>
          <Link href="/" className="ml-auto flex items-center gap-2 text-[13px] font-medium text-[#5b6a85] no-underline hover:text-[#1a6cf0]">
            <LuArrowLeft size={16} aria-hidden="true" /> {t.back}
          </Link>
        </div>

        <div className="mx-auto flex w-full flex-1 items-center py-4">
          <div className="w-full max-w-[480px]">
            <div className="mb-5">
              <div className="mb-4 flex items-center gap-2" aria-hidden="true">
                <span className="h-1 w-9 rounded-full bg-[#1a6cf0]" />
                <span className="h-1 w-9 rounded-full bg-[#dfe6f1]" />
                <span className="h-1 w-9 rounded-full bg-[#dfe6f1]" />
              </div>
              <h1 className="text-[clamp(26px,2.1vw,32px)] font-extrabold leading-tight text-[#0d2250]">{t.title}</h1>
              <p className="mt-1 text-[15px] text-[#5b6a85]">{t.sub}</p>
            </div>

            <div className="rounded-[20px] border border-[#e6ecf5] bg-white p-5 shadow-[0_12px_40px_rgba(20,50,110,0.07)] sm:p-6">
              <form onSubmit={submit}>
                <label className={LABEL} htmlFor="email">{t.email}</label>
                <div className={`${FIELD} mb-4`}>
                  <LuMail size={17} className="shrink-0 text-[#8a97b0]" aria-hidden="true" />
                  <input
                    id="email" type="email" required autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                    className={INPUT}
                  />
                </div>

                <label className={LABEL} htmlFor="password">{t.password}</label>
                <div className={`${FIELD} mb-5`}>
                  <LuLock size={17} className="shrink-0 text-[#8a97b0]" aria-hidden="true" />
                  <input
                    id="password" type={showPw ? "text" : "password"} required autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className={INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? t.hide : t.show}
                    className="shrink-0 cursor-pointer rounded-md p-1 text-[#8a97b0] transition hover:text-[#1a6cf0]"
                  >
                    {showPw ? <LuEyeOff size={17} /> : <LuEye size={17} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#1a73f5_0%,#0b57d0_100%)] py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(11,87,208,0.30)] transition active:scale-[0.99] ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:brightness-95"}`}
                >
                  {loading ? t.loggingIn : <>{t.login} <LuArrowRight size={17} aria-hidden="true" /></>}
                </button>
              </form>

              <div className="mt-6 text-center text-[15px] text-[#5b6a85]">
                {t.noAccount}{" "}
                <Link href="/employer-register" className="inline-flex items-center gap-1.5 font-semibold text-[#1a6cf0] no-underline hover:underline">
                  {t.register} <LuArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Demo credentials — shown only while developing */}
            {process.env.NODE_ENV !== "production" && (
              <div className="mt-4 rounded-xl bg-[#f2f7ff] px-4 py-2.5 text-center text-[12.5px] text-[#16295a]">
                Demo: <b>demo@hiremate.com</b> / <b>demo1234</b>
              </div>
            )}

            <p className="mt-5 text-center text-[14px] text-[#5b6a85]">
              {L("Looking for work?", "काम ढूंढ रहे हैं?", "काम शोधत आहात?")}{" "}
              <Link href="/worker-login" className="inline-flex items-center gap-1.5 font-semibold text-[#1a6cf0] no-underline hover:underline">
                {L("Worker login", "कामगार लॉगिन", "कामगार लॉगिन")} <LuArrowRight size={16} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}