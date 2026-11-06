"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useL } from "@/hooks/useL";
import { jobTitleOf, reasonNeeded } from "@/lib/workerApplications";
import { ApiError } from "@/services/api";
import { respondToOffer, withdrawApplication } from "@/services/applications";
import { getMyJobs } from "@/services/workers";
import type { Application, OfferResponse } from "@/types";

type Pending = { kind: "withdraw"; app: Application } | { kind: "reject"; app: Application } | { kind: "confirm"; app: Application } | null;

const REFRESH_MS = 20_000;

export interface WorkerApplications {
  apps: Application[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  busyId: string | null;
  withdraw: (a: Application) => void;
  confirmOffer: (a: Application) => void;
  rejectOffer: (a: Application) => void;
  dialog: ReactNode;
}

/** Loads the signed-in worker's applications and wraps the withdraw / offer actions with confirmation dialogs. */
export function useWorkerApplications(): WorkerApplications {
  const { worker } = useAuth();
  const { L, language } = useL();
  const phone = worker?.phone;
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // silent = background refresh: no loading flash, and a failed refresh keeps what is on screen.
  const fetchApps = useCallback(
    (silent: boolean) => {
      if (!phone) {
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      getMyJobs(phone)
        .then((d) => {
          setApps(Array.isArray(d) ? d : []);
          setError(false);
        })
        .catch(() => !silent && setError(true))
        .finally(() => !silent && setLoading(false));
    },
    [phone],
  );
  const load = useCallback(() => fetchApps(false), [fetchApps]);

  useEffect(() => {
    load();
    const refresh = () => !document.hidden && fetchApps(true);
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load, fetchApps]);

  const fail = (err: unknown, fallback: string) => {
    toast(err instanceof ApiError && err.message ? err.message : fallback, "error");
    load();
  };

  const runWithdraw = async (a: Application) => {
    const text = reason.trim();
    if (reasonNeeded(a) && text.length < 3) {
      setReasonError(L("Please write a short reason (at least 3 letters).", "कृपया छोटा कारण लिखें (कम से कम 3 अक्षर)।", "कृपया थोडक्यात कारण लिहा (किमान 3 अक्षरे)."));
      return;
    }
    setBusyId(a._id);
    try {
      await withdrawApplication(a._id, text);
      fetchApps(true);
      toast(L("Application withdrawn.", "आवेदन वापस ले लिया गया।", "अर्ज मागे घेतला."), "info");
    } catch (err) {
      fail(err, L("Could not withdraw. Please try again.", "वापस नहीं लिया जा सका। फिर कोशिश करें।", "मागे घेता आले नाही. पुन्हा प्रयत्न करा."));
    } finally {
      setBusyId(null);
      setPending(null);
      setReason("");
      setReasonError("");
    }
  };

  const runRespond = async (a: Application, response: OfferResponse) => {
    setBusyId(a._id);
    try {
      await respondToOffer(a._id, response);
      fetchApps(true);
      toast(
        response === "confirmed" ? L("Offer confirmed!", "ऑफर पक्का हो गया!", "ऑफर निश्चित झाली!") : L("Offer rejected.", "ऑफर अस्वीकार किया गया।", "ऑफर नाकारली."),
        response === "confirmed" ? "success" : "info",
      );
    } catch (err) {
      fail(err, L("Could not update the offer. Please try again.", "ऑफर अपडेट नहीं हो सका। फिर कोशिश करें।", "ऑफर अपडेट करता आली नाही. पुन्हा प्रयत्न करा."));
    } finally {
      setBusyId(null);
      setPending(null);
    }
  };

  const title = pending ? jobTitleOf(pending.app, language) : "";
  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      danger={pending?.kind !== "confirm"}
      busy={busyId !== null}
      title={pending?.kind === "confirm" ? L("Accept this offer?", "यह ऑफर स्वीकार करें?", "ही ऑफर स्वीकारायची?") : pending?.kind === "reject" ? L("Reject this offer?", "यह ऑफर अस्वीकार करें?", "ही ऑफर नाकारायची?") : L("Withdraw application?", "आवेदन वापस लें?", "अर्ज मागे घ्यायचा?")}
      message={
        pending?.kind === "confirm"
          ? L(`Accept the offer for ${title}? The job will be confirmed and a position reserved for you.`, `${title} का ऑफर स्वीकार करें? काम पक्का हो जाएगा और आपके लिए पद सुरक्षित होगा।`, `${title} ची ऑफर स्वीकारायची? काम निश्चित होईल आणि तुमच्यासाठी जागा राखीव होईल.`)
          : pending?.kind === "reject"
          ? L(`Reject the offer for ${title}? This cannot be undone.`, `${title} का ऑफर अस्वीकार करें? यह वापस नहीं हो सकता।`, `${title} ची ऑफर नाकारायची? हे परत करता येणार नाही.`)
          : L(`Withdraw your application for ${title}? You will not be able to apply for this job again.`, `${title} का आवेदन वापस लें? आप इस काम के लिए दोबारा आवेदन नहीं कर पाएंगे।`, `${title} साठीचा अर्ज मागे घ्यायचा? तुम्ही या कामासाठी पुन्हा अर्ज करू शकणार नाही.`)
      }
      confirmLabel={pending?.kind === "confirm" ? L("Accept offer", "ऑफर स्वीकार करें", "ऑफर स्वीकारा") : pending?.kind === "reject" ? L("Reject offer", "ऑफर अस्वीकार करें", "ऑफर नाकारा") : L("Withdraw", "वापस लें", "मागे घ्या")}
      cancelLabel={L("Keep it", "रहने दें", "तसेच ठेवा")}
      onCancel={() => {
        setPending(null);
        setReason("");
        setReasonError("");
      }}
      onConfirm={() => {
        if (!pending) return;
        if (pending.kind === "withdraw") void runWithdraw(pending.app);
        else void runRespond(pending.app, pending.kind === "confirm" ? "confirmed" : "rejected");
      }}
    >
      {pending?.kind === "withdraw" && (
        <div className="mt-4">
          <label htmlFor="withdraw-reason" className="block text-[13.5px] font-semibold text-[#33415f]">
            {reasonNeeded(pending.app) ? L("Why are you cancelling?", "आप क्यों रद्द कर रहे हैं?", "तुम्ही का रद्द करत आहात?") : L("Reason (optional)", "कारण (वैकल्पिक)", "कारण (ऐच्छिक)")}
          </label>
          <textarea
            id="withdraw-reason"
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
    apps,
    loading,
    error,
    reload: load,
    busyId,
    withdraw: (a) => setPending({ kind: "withdraw", app: a }),
    confirmOffer: (a) => setPending({ kind: "confirm", app: a }),
    rejectOffer: (a) => setPending({ kind: "reject", app: a }),
    dialog,
  };
}
