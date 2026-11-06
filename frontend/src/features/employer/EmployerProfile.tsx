"use client";

import { useRouter } from "next/navigation";
import { FiCheck, FiLogOut } from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEmployerT } from "@/i18n/employerText";
import { ROLE_LOGIN } from "@/config/routes";
import type { Language } from "@/types";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

export default function EmployerProfile() {
  const { tr } = useEmployerT();
  const router = useRouter();
  const { employer, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  const company = employer?.companyName?.trim() || "—";
  const initials = company.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "E";

  const handleLogout = () => {
    logout();
    router.push(ROLE_LOGIN.employer);
  };

  return (
    <EmployerShell>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">
        <div>
          <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold text-[#0F1F4B]">{tr("pf_title")}</h1>
          <p className="m-0 mt-1.5 text-[14.5px] text-slate-500">{tr("pf_sub")}</p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="m-0 mb-4 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("pf_account")}</h2>
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 shrink-0 rounded-full bg-blue-600 text-white text-[18px] font-bold flex items-center justify-center">{initials}</span>
            <dl className="m-0 grid gap-3 sm:grid-cols-2 flex-1 min-w-0">
              <div className="min-w-0">
                <dt className="text-[12.5px] text-slate-500">{tr("pf_company")}</dt>
                <dd className="m-0 text-[15px] font-semibold text-slate-900 truncate">{company}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12.5px] text-slate-500">{tr("pf_email")}</dt>
                <dd className="m-0 text-[15px] font-semibold text-slate-900 truncate">{employer?.email || "—"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="m-0 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("pf_language")}</h2>
          <p className="m-0 mt-1 mb-4 text-[13.5px] text-slate-500">{tr("pf_languageSub")}</p>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={tr("pf_language")}>
            {LANGUAGES.map((l) => {
              const on = language === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLanguage(l.code)}
                  className={`h-11 px-5 rounded-lg text-[14px] font-semibold flex items-center gap-2 cursor-pointer ${on ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                >
                  {on && <FiCheck />} {l.label}
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="self-start h-11 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[14px] font-semibold flex items-center gap-2 cursor-pointer"
        >
          <FiLogOut /> {tr("pf_logout")}
        </button>
      </div>
    </EmployerShell>
  );
}
