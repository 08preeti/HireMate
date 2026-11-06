"use client";

import { useCallback, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { closeJob, completeJob, deleteJob, fillJob, reopenJob } from "@/services/jobs";
import type { EmployerJob } from "@/types";

export type JobActionKind = "close" | "fill" | "complete" | "delete" | "reopen";

export interface ActionNotice {
  type: "ok" | "error";
  text: string;
}

const DIALOG: Record<Exclude<JobActionKind, "reopen">, { title: EmployerKey; message: EmployerKey; confirm: EmployerKey; danger: boolean }> = {
  close: { title: "jm_closeTitle", message: "jm_closeMsg", confirm: "jm_close", danger: true },
  fill: { title: "jm_fillTitle", message: "jm_fillMsg", confirm: "jm_fill", danger: false },
  complete: { title: "jm_completeTitle", message: "jm_completeMsg", confirm: "jm_complete", danger: false },
  delete: { title: "jm_deleteTitle", message: "jm_deleteMsg", confirm: "jm_delete", danger: true },
};

const DONE: Record<JobActionKind, EmployerKey> = {
  close: "jm_done_closed",
  fill: "jm_done_filled",
  complete: "jm_done_completed",
  delete: "jm_done_deleted",
  reopen: "jm_done_reopened",
};

/** Runs the real backend job actions behind confirmation dialogs. `onDone` refreshes the caller's data. */
export function useJobActions(onDone: (kind: JobActionKind, jobId: string) => void | Promise<void>) {
  const { tr } = useEmployerT();
  const [target, setTarget] = useState<{ kind: Exclude<JobActionKind, "reopen">; job: EmployerJob } | null>(null);
  const [declinePending, setDeclinePending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionNotice | null>(null);

  const execute = useCallback(
    async (kind: JobActionKind, job: EmployerJob, decline: boolean) => {
      setBusyId(job._id);
      setNotice(null);
      try {
        if (kind === "close") await closeJob(job._id, decline);
        else if (kind === "fill") await fillJob(job._id, decline);
        else if (kind === "complete") await completeJob(job._id);
        else if (kind === "reopen") await reopenJob(job._id);
        else await deleteJob(job._id);
        setNotice({ type: "ok", text: tr(DONE[kind]) });
      } catch (err) {
        setNotice({ type: "error", text: err instanceof Error && err.message ? err.message : tr("jm_actionFailed") });
      } finally {
        await onDone(kind, job._id);
        setBusyId(null);
        setTarget(null);
        setDeclinePending(false);
      }
    },
    [onDone, tr],
  );

  const request = useCallback(
    (kind: JobActionKind, job: EmployerJob) => {
      if (busyId) return;
      if (kind === "reopen") void execute("reopen", job, false);
      else {
        setDeclinePending(false);
        setTarget({ kind, job });
      }
    },
    [busyId, execute],
  );

  let dialog: ReactNode = null;
  if (target) {
    const copy = DIALOG[target.kind];
    const pending = target.job.stats.pending;
    const offerDecline = (target.kind === "close" || target.kind === "fill") && pending > 0;
    dialog = (
      <ConfirmDialog
        open
        title={tr(copy.title)}
        message={tr(copy.message)}
        confirmLabel={tr(copy.confirm)}
        cancelLabel={tr("jm_cancel")}
        danger={copy.danger}
        busy={busyId !== null}
        onConfirm={() => void execute(target.kind, target.job, offerDecline && declinePending)}
        onCancel={() => setTarget(null)}
      >
        {offerDecline && (
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13.5px] text-slate-700">
            <input type="checkbox" checked={declinePending} onChange={(e) => setDeclinePending(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{tr("jm_declinePending", { n: pending })}</span>
          </label>
        )}
      </ConfirmDialog>
    );
  }

  return { request, dialog, busyId, notice, clearNotice: () => setNotice(null) };
}
