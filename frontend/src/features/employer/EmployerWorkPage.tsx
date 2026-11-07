"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { useEmployerT } from "@/i18n/employerText";
import CompletionReviewDialog from "./work/CompletionReviewDialog";
import LiveTrackingPanel from "./work/LiveTrackingPanel";
import EmployerWorkCard from "./work/EmployerWorkCard";
import { useEmployerWork } from "./work/useEmployerWork";
import WorkDetailsPanel from "./work/WorkDetailsPanel";
import { isActiveWork, isDoneWork, isEndedAfterHire, latestFirst } from "./work/workHelpers";
import { nameOf } from "./applications/helpers";

type Filter = "all" | "completed" | "cancelled";

export default function EmployerWorkPage({ mode }: { mode: "active" | "history" }) {
  const { tr } = useEmployerT();
  const work = useEmployerWork();
  const [openId, setOpenId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const records = useMemo(
    () => work.applications.filter((a) => (mode === "active" ? isActiveWork(a) : isDoneWork(a) || isEndedAfterHire(a))).sort(latestFirst),
    [work.applications, mode],
  );
  const visible = mode === "active" ? records : records.filter((a) => (filter === "all" ? true : filter === "completed" ? isDoneWork(a) : !isDoneWork(a)));
  const open = openId ? work.applications.find((a) => a._id === openId) : undefined;
  const filters: { key: Filter; label: "aw_filterAll" | "aw_filterDone" | "aw_filterCancelled" }[] = [
    { key: "all", label: "aw_filterAll" },
    { key: "completed", label: "aw_filterDone" },
    { key: "cancelled", label: "aw_filterCancelled" },
  ];

  let body;
  if (work.loading) {
    body = (
      <div role="status" aria-label={tr("mj_loading")} className="grid animate-pulse gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[240px] rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  } else if (work.error && records.length === 0) {
    body = (
      <div role="alert" className="flex flex-col items-center gap-4 rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
        <p className="m-0 text-[14.5px] text-rose-800">{tr("mj_failed")}</p>
        <button type="button" onClick={() => void work.reload()} className="h-10 cursor-pointer rounded-lg bg-rose-600 px-5 text-[14px] font-semibold text-white hover:bg-rose-700">{tr("ws_retry")}</button>
      </div>
    );
  } else if (records.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="m-0 text-[16px] font-bold text-slate-800">{tr(mode === "active" ? "aw_empty" : "aw_doneEmpty")}</p>
        <p className="m-0 text-[14px] text-slate-500">{tr(mode === "active" ? "aw_emptySub" : "aw_doneEmptySub")}</p>
        <Link href="/applications" className="mt-2 text-[14px] font-semibold text-blue-600 no-underline hover:text-blue-700">{tr("nav_applications")}</Link>
      </div>
    );
  } else if (visible.length === 0) {
    body = <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-[14.5px] text-slate-500">{tr("aw_noGroup")}</div>;
  } else {
    body = (
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((a) => (
          <EmployerWorkCard key={a._id} app={a} work={work} onOpen={(x) => setOpenId(x._id)} onTrack={mode === "active" ? (x) => setTrackId(x._id) : undefined} />
        ))}
      </div>
    );
  }

  return (
    <EmployerShell>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-6 font-plain sm:px-6">
        <div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#0F1F4B] sm:text-[28px]">{tr(mode === "active" ? "aw_title" : "aw_doneTitle")}</h1>
          <p className="m-0 mt-1.5 max-w-[620px] text-[14.5px] text-slate-500">{tr(mode === "active" ? "aw_sub" : "aw_doneSub")}</p>
        </div>

        {work.notice && (
          <div role={work.notice.type === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[14px] ${work.notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {work.notice.type === "error" ? <FiAlertCircle className="mt-0.5 shrink-0" /> : <FiCheckCircle className="mt-0.5 shrink-0" />}
            <span className="flex-1">{work.notice.text}</span>
            <button type="button" onClick={work.clearNotice} aria-label="Dismiss" className="cursor-pointer border-0 bg-transparent text-current">✕</button>
          </div>
        )}

        {mode === "history" && records.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
            {filters.map((f) => (
              <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`h-10 cursor-pointer whitespace-nowrap rounded-lg px-4 text-[13.5px] font-semibold ${filter === f.key ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {tr(f.label)}
              </button>
            ))}
          </div>
        )}

        {body}
      </div>

      {trackId && mode === "active" && <LiveTrackingPanel apps={records} initialId={trackId} onClose={() => setTrackId(null)} />}
      {open && <WorkDetailsPanel app={open} work={work} onClose={() => setOpenId(null)} />}
      {work.reviewTarget && (
        <CompletionReviewDialog
          workerName={nameOf(work.reviewTarget)}
          jobTitle={work.jobTitle(work.reviewTarget)}
          busy={work.busy}
          onApprove={() => work.approve(work.reviewTarget!)}
          onReject={(reason) => work.reject(work.reviewTarget!, reason)}
          onClose={work.closeReview}
        />
      )}
      {work.dialog}
    </EmployerShell>
  );
}
