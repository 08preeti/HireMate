"use client";

import { useEffect, useState } from "react";
import { useEmployerT } from "@/i18n/employerText";

interface Props {
  workerName: string;
  jobTitle: string;
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

export default function CompletionReviewDialog({ workerName, jobTitle, busy, onApprove, onReject, onClose }: Props) {
  const { tr } = useEmployerT();
  const [step, setStep] = useState<"choose" | "reject">("choose");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const send = () => {
    if (reason.trim().length < 3) {
      setError(tr("aw_reasonShort"));
      return;
    }
    onReject(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="completion-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="completion-title" className="m-0 text-[18px] font-bold text-slate-900">{step === "choose" ? tr("aw_approveTitle") : tr("aw_rejectTitle")}</h2>
        <p className="m-0 mt-1 text-[13.5px] text-slate-500">{workerName} · {jobTitle}</p>
        <p className="m-0 mt-3 text-[14px] text-slate-600">{step === "choose" ? tr("aw_approveMsg") : tr("aw_rejectMsg")}</p>

        {step === "reject" && (
          <div className="mt-4">
            <label htmlFor="reject-reason" className="block text-[13.5px] font-semibold text-slate-700">{tr("aw_reason")}</label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              rows={3}
              maxLength={300}
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 p-3 text-[14px] outline-none focus:border-blue-500"
            />
            {error && <p role="alert" className="m-0 mt-1 text-[13px] font-medium text-rose-600">{error}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={step === "choose" ? onClose : () => setStep("choose")} className="h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {tr("jm_cancel")}
          </button>
          {step === "choose" ? (
            <>
              <button type="button" disabled={busy} onClick={() => setStep("reject")} className="h-11 cursor-pointer rounded-lg border border-rose-200 bg-white px-4 text-[14px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{tr("aw_rejectBtn")}</button>
              <button type="button" disabled={busy} onClick={onApprove} className="h-11 cursor-pointer rounded-lg bg-emerald-600 px-4 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{tr("aw_approveBtn")}</button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={send} className="h-11 cursor-pointer rounded-lg bg-rose-600 px-4 text-[14px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{tr("aw_rejectSend")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
