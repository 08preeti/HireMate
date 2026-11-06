"use client";

import { useCallback, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { useL } from "@/hooks/useL";
import { jobTitleOf, reasonNeeded } from "@/lib/workerApplications";
import { ApiError } from "@/services/api";
import { requestCompletion, updateApplicationStatus, withdrawApplication } from "@/services/applications";
import type { Application } from "@/types";

type Dialog = { kind: "complete" | "cancel"; app: Application } | null;

export interface WorkActions {
  busyId: string | null;
  markOnTheWay: (a: Application) => void;
  markArrived: (a: Application) => void;
  askComplete: (a: Application) => void;
  askCancel: (a: Application) => void;
  dialog: ReactNode;
}

/** The worker's work actions. Every one is validated again by the server; failures show its message and refresh. */
export function useWorkActions(reload: () => void): WorkActions {
  const { L, language } = useL();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const run = useCallback(
    async (a: Application, action: () => Promise<unknown>, success: string, fallback: string) => {
      setBusyId(a._id);
      try {
        await action();
        toast(success, "success");
      } catch (err) {
        toast(err instanceof ApiError && err.message ? err.message : fallback, "error");
      } finally {
        setBusyId(null);
        setDialogState(null);
        reload();
      }
    },
    [reload],
  );

  const failText = L("Could not update. Please try again.", "अपडेट नहीं हो सका। फिर कोशिश करें।", "अपडेट करता आले नाही. पुन्हा प्रयत्न करा.");

  const closeDialog = () => {
    setDialogState(null);
    setReason("");
    setReasonError("");
  };

  const confirm = () => {
    if (!dialogState) return;
    const { kind, app } = dialogState;
    if (kind === "complete") {
      void run(app, () => requestCompletion(app._id), L("Sent to the employer for confirmation.", "पुष्टि के लिए नियोक्ता को भेजा गया।", "पुष्टीसाठी मालकाला पाठवले."), failText);
      return;
    }
    const text = reason.trim();
    if (reasonNeeded(app) && text.length < 3) {
      setReasonError(L("Please write a short reason (at least 3 letters).", "कृपया छोटा कारण लिखें (कम से कम 3 अक्षर)।", "कृपया थोडक्यात कारण लिहा (किमान 3 अक्षरे)."));
      return;
    }
    void run(app, () => withdrawApplication(app._id, text), L("Work cancelled.", "काम रद्द किया गया।", "काम रद्द केले."), failText).then(() => {
      setReason("");
      setReasonError("");
    });
  };

  const title = dialogState ? jobTitleOf(dialogState.app, language) : "";
  const isCancel = dialogState?.kind === "cancel";
  const dialog = (
    <ConfirmDialog
      open={dialogState !== null}
      danger={isCancel}
      busy={busyId !== null}
      title={isCancel ? L("Cancel this work?", "यह काम रद्द करें?", "हे काम रद्द करायचे?") : L("Is the work finished?", "क्या काम पूरा हो गया?", "काम पूर्ण झाले का?")}
      message={
        isCancel
          ? L(`Cancel your work for ${title}? The employer will be told and the position will open up again. You cannot undo this.`, `${title} का काम रद्द करें? नियोक्ता को बताया जाएगा और पद फिर खाली हो जाएगा। यह वापस नहीं होगा।`, `${title} चे काम रद्द करायचे? मालकाला कळवले जाईल आणि जागा पुन्हा रिक्त होईल. हे परत करता येणार नाही.`)
          : L(`Tell the employer that ${title} is finished? The work is marked completed only after the employer confirms it.`, `नियोक्ता को बताएं कि ${title} पूरा हो गया? नियोक्ता की पुष्टि के बाद ही काम पूरा माना जाएगा।`, `मालकाला कळवायचे की ${title} पूर्ण झाले? मालकाने पुष्टी केल्यावरच काम पूर्ण मानले जाईल.`)
      }
      confirmLabel={isCancel ? L("Cancel work", "काम रद्द करें", "काम रद्द करा") : L("Yes, work is finished", "हाँ, काम पूरा हुआ", "होय, काम पूर्ण झाले")}
      cancelLabel={L("Go back", "वापस जाएं", "मागे जा")}
      onCancel={closeDialog}
      onConfirm={confirm}
    >
      {isCancel && dialogState && (
        <div className="mt-4">
          <label htmlFor="cancel-reason" className="block text-[13.5px] font-semibold text-[#33415f]">
            {reasonNeeded(dialogState.app) ? L("Why are you cancelling?", "आप क्यों रद्द कर रहे हैं?", "तुम्ही का रद्द करत आहात?") : L("Reason (optional)", "कारण (वैकल्पिक)", "कारण (ऐच्छिक)")}
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError("");
            }}
            rows={3}
            maxLength={300}
            className="mt-1.5 w-full resize-none rounded-lg border border-[#dde4f0] p-3 text-[14px] outline-none focus:border-[#1f6bff]"
          />
          {reasonError && <p role="alert" className="m-0 mt-1 text-[13px] font-medium text-[#d6203a]">{reasonError}</p>}
        </div>
      )}
    </ConfirmDialog>
  );

  return {
    busyId,
    markOnTheWay: (a) => void run(a, () => updateApplicationStatus(a._id, "on_the_way"), L("Marked on the way. The employer is informed.", "रास्ते में दर्ज हुआ। नियोक्ता को सूचना गई।", "मार्गावर नोंदवले. मालकाला कळवले."), failText),
    markArrived: (a) => void run(a, () => updateApplicationStatus(a._id, "arrived"), L("Marked arrived. The employer is informed.", "पहुँचना दर्ज हुआ। नियोक्ता को सूचना गई।", "पोहोचल्याचे नोंदवले. मालकाला कळवले."), failText),
    askComplete: (a) => setDialogState({ kind: "complete", app: a }),
    askCancel: (a) => setDialogState({ kind: "cancel", app: a }),
    dialog,
  };
}
