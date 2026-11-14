"use client";

import { useEffect, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import ApplicationTimeline from "@/components/ui/ApplicationTimeline";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { useLanguage } from "@/context/LanguageContext";
import { paymentMethodLabel } from "@/i18n/formatters";
import type { Application } from "@/types";
import ApplicantProfile from "../applications/ApplicantProfile";
import { money, unitKey, wageOf } from "../applications/helpers";
import type { EmployerWork } from "./useEmployerWork";
import WorkProgress from "./WorkProgress";
import { completedAtOf, completionPending, formatDate, scheduleOf, workDateOf } from "./workHelpers";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-100 px-5 py-5 last:border-b-0">
      <h3 className="m-0 mb-3 text-[12.5px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[12.5px] text-slate-500">{label}</div>
      <div className="break-words text-[15px] font-semibold text-slate-900">{value || "—"}</div>
    </div>
  );
}

export default function WorkDetailsPanel({ app, work, onClose }: { app: Application; work: EmployerWork; onClose: () => void }) {
  const { tr, loc, locale } = useEmployerT();
  const { language } = useLanguage();
  const wage = wageOf(app.job);
  const active = ["confirmed", "on_the_way", "arrived"].includes(app.status ?? "");
  const ended = app.status === "cancelled" || app.status === "withdrawn";
  const rejection = app.status === "arrived" && !app.completionRequestedAt ? app.completionRejection : undefined;
  const doneAt = completedAtOf(app);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
      <div role="dialog" aria-modal="true" aria-label={tr("aw_details")} className="relative flex h-full w-full flex-col bg-white shadow-2xl sm:w-[520px]">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="m-0 min-w-0 break-words text-[17px] font-bold text-slate-900">{loc(app.job?.jobTitle) || tr("untitled")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("aw_back")} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><FiX size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section title={tr("dt_worker")}>
            <ApplicantProfile application={app} stage={app.status === "completed" ? "completed" : active ? "active" : "declined"} />
          </Section>

          {!ended && (
            <Section title={tr("aw_progress")}>
              <WorkProgress app={app} />
              {rejection?.reason && <p className="m-0 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13.5px] text-rose-800">{tr("aw_rejectedReason")}: {rejection.reason}</p>}
              {active && !completionPending(app) && app.status !== "arrived" && <p className="m-0 mt-3 text-[13.5px] text-slate-500">{tr("aw_awaitingWorker")}</p>}
            </Section>
          )}

          <Section title={tr("dt_job")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tr("dt_jobLocation")} value={loc(app.job?.location)} />
              <Field label={tr("aw_workDate")} value={workDateOf(app, locale)} />
              <Field label={tr("aw_schedule")} value={scheduleOf(app)} />
              <Field label={tr("aw_payment")} value={wage ? `${money(wage)} / ${tr(unitKey(app.job))}${app.job?.paymentMethod ? ` · ${paymentMethodLabel(app.job.paymentMethod, language)}` : ""}` : ""} />
              {doneAt && <Field label={tr("aw_completedOn")} value={formatDate(doneAt, locale, true)} />}
              {app.cancellationReason && <Field label={tr("aw_cancelledReason")} value={app.cancellationReason} />}
            </div>
          </Section>

          {app.status === "completed" && (
            <Section title={tr("aw_yourRating")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={tr("aw_yourRating")} value={app.rating ? `★ ${app.rating}/5${app.review ? ` — ${app.review}` : ""}` : tr("aw_notRated")} />
                <Field label={tr("aw_theirRating")} value={app.employerRating ? `★ ${app.employerRating}/5${app.employerReview ? ` — ${app.employerReview}` : ""}` : tr("aw_notRated")} />
              </div>
            </Section>
          )}

          <Section title={tr("tl_title")}>
            <ApplicationTimeline
              locale={locale}
              rows={(app.timeline ?? []).map((t, i) => ({
                key: `${t.event}-${i}`,
                label: `${tr(`tl_${t.event}` as EmployerKey)}${t.note ? `: ${t.note}` : ""}`,
                at: t.at,
                tone: t.event,
              }))}
            />
          </Section>
        </div>

        {(completionPending(app) || (app.status === "completed" && !app.rating) || active) && (
          <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
            {completionPending(app) && <button type="button" disabled={work.busy} onClick={() => work.askReview(app)} className="h-11 flex-1 cursor-pointer rounded-lg bg-emerald-600 px-4 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{tr("aw_reviewBtn")}</button>}
            {app.status === "completed" && !app.rating && <button type="button" disabled={work.busy} onClick={() => work.askRate(app)} className="h-11 flex-1 cursor-pointer rounded-lg bg-blue-600 px-4 text-[14px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{tr("aw_rateWorker")}</button>}
            {active && <button type="button" disabled={work.busy} onClick={() => work.askCancel(app)} className="h-11 cursor-pointer rounded-lg border border-rose-200 bg-white px-4 text-[14px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{tr("cancelBtn")}</button>}
          </footer>
        )}
      </div>
    </div>
  );
}
