import { useState } from "react";
import Link from "next/link";
import { FiCheck, FiX } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";
import type { Application } from "@/types";
import RatingPanel from "./RatingPanel";
import type { Stage } from "./helpers";

interface ApplicationActionsProps {
  application: Application;
  stage: Stage;
  variant: "card" | "details";
  busy: boolean;
  error?: string;
  onDecide: (decision: "accepted" | "declined") => void;
  onCancel?: (reason: string) => void;
  onRated?: () => void;
}

const CANCELLABLE: readonly Stage[] = ["offers", "confirmed", "active"];

export default function ApplicationActions({ application, stage, variant, busy, error, onDecide, onCancel, onRated }: ApplicationActionsProps) {
  const { tr } = useEmployerT();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const pending = !application.status || application.status === "pending";

  if (variant === "card") {
    if (!pending) return null;
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onDecide("accepted")}
          disabled={busy}
          className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FiCheck /> {tr("acceptBtn")}
        </button>
        <button
          type="button"
          onClick={() => onDecide("declined")}
          disabled={busy}
          className="flex-1 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-[13.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FiX /> {tr("declineBtn")}
        </button>
      </div>
    );
  }

  const errorLine = error ? (
    <p role="alert" className="m-0 text-[13.5px] font-medium text-rose-600">
      {error}
    </p>
  ) : null;

  if (pending) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="m-0 text-[16px] font-bold text-slate-900">{tr("decideTitle")}</h4>
          <p className="m-0 mt-0.5 text-[13.5px] text-slate-500">{tr("decideSub")}</p>
        </div>
        {errorLine}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => onDecide("accepted")}
            disabled={busy}
            className="flex-1 h-12 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[14.5px] font-semibold cursor-pointer"
          >
            {tr("acceptBtn")}
          </button>
          <button
            type="button"
            onClick={() => onDecide("declined")}
            disabled={busy}
            className="flex-1 h-12 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-[14.5px] font-semibold cursor-pointer"
          >
            {tr("declineBtn")}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "declined") {
    const noteKey =
      application.status === "rejected" ? "offerRejectedNote" : application.status === "withdrawn" ? "note_withdrawn" : application.status === "cancelled" ? "note_cancelled" : "declinedNote";
    return <p className="m-0 text-[14px] text-slate-500">{tr(noteKey)}</p>;
  }

  const cancelBlock = CANCELLABLE.includes(stage) && (
    <div className="flex flex-col gap-2.5">
      {confirming ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5">
          <p className="m-0 text-[13.5px] text-rose-800">{tr("cancelAsk")}</p>
          {stage !== "offers" && (
            <div className="mt-3">
              <label htmlFor={`cancel-reason-${application._id}`} className="block text-[13px] font-semibold text-rose-900">{tr("aw_cancelWhy")}</label>
              <textarea
                id={`cancel-reason-${application._id}`}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError("");
                }}
                rows={2}
                maxLength={300}
                className="mt-1.5 w-full resize-none rounded-lg border border-rose-200 bg-white p-2.5 text-[13.5px] outline-none focus:border-rose-400"
              />
              {reasonError && <p role="alert" className="m-0 mt-1 text-[12.5px] font-medium text-rose-700">{reasonError}</p>}
            </div>
          )}
          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (stage !== "offers" && reason.trim().length < 3) {
                  setReasonError(tr("aw_reasonShort"));
                  return;
                }
                setConfirming(false);
                onCancel?.(reason.trim());
                setReason("");
              }}
              disabled={busy}
              className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-[13.5px] font-semibold cursor-pointer"
            >
              {tr("cancelYes")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-10 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[13.5px] font-semibold cursor-pointer"
            >
              {tr("cancelKeep")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="self-start h-10 px-4 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 text-[13.5px] font-semibold cursor-pointer"
        >
          {tr("cancelBtn")}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {errorLine}
      {stage === "offers" ? (
        <p className="m-0 text-[14px] text-slate-600">{tr("note_offer")}</p>
      ) : application.status === "completed" || application.rating ? (
        <RatingPanel key={application._id} application={application} onRated={() => onRated?.()} />
      ) : (
        <Link href="/employer-active-work" className="text-[14px] font-semibold text-blue-600 no-underline hover:text-blue-700">{tr("aw_trackLink")}</Link>
      )}
      {cancelBlock}
    </div>
  );
}
