"use client";

import { useEffect } from "react";
import { FiPhone, FiX } from "react-icons/fi";
import { Stars } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import type { Application } from "@/types";

export default function EmployerDetailsDialog({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const { L } = useL();
  useEffect(() => {
    if (!app) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [app, onClose]);
  if (!app) return null;
  const profile = app.employerProfile;
  const phone = app.job?.contactInfo;
  return (
    <div className="fixed inset-0 z-[9997] flex items-end justify-center bg-[rgba(11,27,61,0.5)] sm:items-center sm:p-5" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="employer-dialog-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-t-2xl bg-white p-6 shadow-[0_20px_50px_rgba(11,27,61,0.3)] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf1ff] text-[18px] font-bold text-[#1a4fc4]" aria-hidden="true">{(app.job?.companyName || "E").trim().charAt(0).toUpperCase()}</span>
            <h2 id="employer-dialog-title" className="m-0 break-words text-[19px] font-bold text-[#0b1b3d]">{app.job?.companyName || L("Employer", "नियोक्ता", "मालक")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={L("Close", "बंद करें", "बंद करा")} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#f3f6fb] text-[#0b1b3d] hover:bg-[#e6ecf5]"><FiX size={18} aria-hidden="true" /></button>
        </div>
        <dl className="mb-0 mt-5 text-[14px]">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf1f7] py-2.5">
            <dt className="text-[#5b6a88]">{L("Rating from workers", "कामगारों की रेटिंग", "कामगारांचे रेटिंग")}</dt>
            <dd className="m-0 font-medium text-[#0b1b3d]">{profile && profile.totalReviews > 0 ? <span className="inline-flex items-center gap-2"><Stars value={profile.rating} /> {profile.rating.toFixed(1)} ({profile.totalReviews})</span> : L("No reviews yet", "अभी कोई समीक्षा नहीं", "अजून पुनरावलोकन नाही")}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-[#edf1f7] py-2.5">
            <dt className="text-[#5b6a88]">{L("Jobs completed", "पूरे किए काम", "पूर्ण झालेली कामे")}</dt>
            <dd className="m-0 font-medium text-[#0b1b3d]">{profile?.completedJobs ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-[#5b6a88]">{L("Phone", "फ़ोन", "फोन")}</dt>
            <dd className="m-0 font-medium">{phone ? <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-[#1a4fc4] no-underline"><FiPhone size={14} aria-hidden="true" /> {phone}</a> : <span className="text-[#8a96ae]">{L("Not shared yet", "अभी साझा नहीं", "अजून शेअर केलेला नाही")}</span>}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
