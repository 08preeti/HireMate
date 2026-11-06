"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CARD, PageContainer, PageHeader, SectionCard } from "@/components/worker/WorkerUi";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLE_SELECT } from "@/config/routes";
import { useL } from "@/hooks/useL";
import type { Language } from "@/types";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

export default function WorkerSettings() {
  const { L, language } = useL();
  const { setLanguage } = useLanguage();
  const { worker, logout } = useAuth();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <PageContainer>
      <PageHeader title={L("Settings", "सेटिंग्स", "सेटिंग्ज")} subtitle={L("Language and account options.", "भाषा और खाता विकल्प।", "भाषा आणि खाते पर्याय.")} />

      <SectionCard title={L("Language", "भाषा", "भाषा")}>
        <div role="radiogroup" aria-label={L("Language", "भाषा", "भाषा")} className="flex flex-wrap gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={language === l.code}
              onClick={() => setLanguage(l.code)}
              className={`cursor-pointer rounded-xl border px-5 py-2.5 text-[14.5px] font-semibold ${language === l.code ? "border-[#1f6bff] bg-[#eaf2ff] text-[#1a4fc4]" : "border-[#dde4f0] bg-white text-[#0b1b3d] hover:bg-[#f6f8fc]"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={L("Account", "खाता", "खाते")} href="/worker-profile" linkLabel={L("Edit profile", "प्रोफ़ाइल बदलें", "प्रोफाइल बदला")}>
        <dl className="m-0 space-y-2 text-[14.5px]">
          <div className="flex justify-between gap-4"><dt className="text-[#5b6a88]">{L("Name", "नाम", "नाव")}</dt><dd className="m-0 font-medium text-[#0b1b3d]">{worker?.name || "—"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#5b6a88]">{L("Phone", "फ़ोन", "फोन")}</dt><dd className="m-0 font-medium text-[#0b1b3d]">{worker?.phone || worker?.contact || "—"}</dd></div>
        </dl>
      </SectionCard>

      <div className={`${CARD} flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6`}>
        <div>
          <h2 className="m-0 text-[16px] font-bold text-[#0b1b3d]">{L("Sign out", "साइन आउट", "साइन आउट")}</h2>
          <p className="m-0 mt-1 text-[13.5px] text-[#5b6a88]">{L("You will need your phone number and an OTP to sign in again.", "दोबारा साइन इन के लिए फ़ोन नंबर और OTP चाहिए।", "पुन्हा साइन इन करण्यासाठी फोन नंबर आणि OTP लागेल.")}</p>
        </div>
        <button type="button" onClick={() => setConfirmLogout(true)} className="cursor-pointer rounded-lg border border-[#f0b4be] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#d6203a] hover:bg-[#fff1f3]">
          {L("Logout", "लॉगआउट", "लॉगआउट")}
        </button>
      </div>
      <p className="m-0 text-center text-[13px] text-[#8a96ae]">
        <Link href="/worker-help" className="text-[#1a4fc4] no-underline hover:underline">{L("Need help? Visit Help & Support", "मदद चाहिए? सहायता पर जाएँ", "मदत हवी? मदत व सहाय्य पहा")}</Link>
      </p>

      <ConfirmDialog
        open={confirmLogout}
        danger
        title={L("Log out?", "लॉगआउट करें?", "लॉगआउट करायचे?")}
        message={L("Do you want to sign out of HireMate?", "क्या आप हायरमेट से साइन आउट करना चाहते हैं?", "तुम्हाला हायरमेटमधून साइन आउट करायचे आहे का?")}
        confirmLabel={L("Logout", "लॉगआउट", "लॉगआउट")}
        cancelLabel={L("Cancel", "रद्द करें", "रद्द करा")}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          logout();
          router.push(ROLE_SELECT);
        }}
      />
    </PageContainer>
  );
}
