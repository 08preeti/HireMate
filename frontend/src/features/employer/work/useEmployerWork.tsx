"use client";

import { useCallback, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReviewDialog from "@/components/ui/ReviewDialog";
import { useEmployerData } from "@/context/EmployerDataContext";
import { useEmployerT } from "@/i18n/employerText";
import { ApiError } from "@/services/api";
import { cancelApplication, decideCompletion, rateApplication } from "@/services/applications";
import type { Application } from "@/types";
import { nameOf } from "../applications/helpers";

export interface Notice {
  type: "ok" | "error";
  text: string;
}

type Dialog = { kind: "cancel" | "review" | "rate"; app: Application } | null;

export function useEmployerWork() {
  const { tr, loc } = useEmployerT();
  const { applications, loading, error, refresh } = useEmployerData();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [rateError, setRateError] = useState("");

  const reload = useCallback(() => refresh({ force: true }), [refresh]);

  const close = () => {
    setDialog(null);
    setReason("");
    setReasonError("");
    setRateError("");
  };

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ type: "ok", text: okText });
      close();
    } catch (err) {
      setNotice({ type: "error", text: err instanceof ApiError && err.message ? err.message : tr("aw_failed") });
      close();
    } finally {
      setBusy(false);
      await reload();
    }
  };

  const confirmCancel = () => {
    if (dialog?.kind !== "cancel") return;
    const app = dialog.app;
    const needed = app.status !== "accepted";
    if (needed && reason.trim().length < 3) {
      setReasonError(tr("aw_reasonShort"));
      return;
    }
    void run(() => cancelApplication(app._id, reason.trim()), tr("aw_okCancelled"));
  };

  const submitRating = async (rating: number, review: string) => {
    if (dialog?.kind !== "rate") return;
    const app = dialog.app;
    setBusy(true);
    setRateError("");
    try {
      await rateApplication(app._id, { rating, review });
      setNotice({ type: "ok", text: tr("aw_rateSaved") });
      close();
    } catch (err) {
      setRateError(err instanceof ApiError && err.message ? err.message : tr("aw_failed"));
    } finally {
      setBusy(false);
      await reload();
    }
  };

  let element: ReactNode = null;
  if (dialog?.kind === "cancel") {
    element = (
      <ConfirmDialog open danger busy={busy} title={tr("aw_cancelTitle")} message={tr("aw_cancelMsg")} confirmLabel={tr("cancelBtn")} cancelLabel={tr("aw_keep")} onConfirm={confirmCancel} onCancel={close}>
        <div className="mt-4">
          <label htmlFor="cancel-reason" className="block text-[13.5px] font-semibold text-slate-700">{tr("aw_cancelWhy")}</label>
          <textarea id="cancel-reason" value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(""); }} rows={3} maxLength={300} className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 p-3 text-[14px] outline-none focus:border-blue-500" />
          {reasonError && <p role="alert" className="m-0 mt-1 text-[13px] font-medium text-rose-600">{reasonError}</p>}
        </div>
      </ConfirmDialog>
    );
  } else if (dialog?.kind === "rate") {
    element = (
      <ReviewDialog
        open
        title={tr("aw_rateWorker")}
        subtitle={nameOf(dialog.app)}
        ratingLabel={tr("aw_rateHow")}
        placeholder={tr("aw_rateNote")}
        submitLabel={tr("aw_rateSubmit")}
        cancelLabel={tr("jm_cancel")}
        requiredMessage={tr("aw_rateNeed")}
        busy={busy}
        error={rateError}
        onSubmit={(r, text) => void submitRating(r, text)}
        onCancel={close}
      />
    );
  }

  return {
    applications,
    loading,
    error,
    reload,
    busy,
    notice,
    clearNotice: () => setNotice(null),
    askCancel: (app: Application) => setDialog({ kind: "cancel", app }),
    askReview: (app: Application) => setDialog({ kind: "review", app }),
    askRate: (app: Application) => setDialog({ kind: "rate", app }),
    reviewTarget: dialog?.kind === "review" ? dialog.app : null,
    closeReview: close,
    approve: (app: Application) => void run(() => decideCompletion(app._id, "approved"), tr("aw_okApproved")),
    reject: (app: Application, why: string) => void run(() => decideCompletion(app._id, "rejected", why), tr("aw_okRejected")),
    dialog: element,
    jobTitle: (app: Application) => loc(app.job?.jobTitle) || tr("untitled"),
  };
}

export type EmployerWork = ReturnType<typeof useEmployerWork>;
