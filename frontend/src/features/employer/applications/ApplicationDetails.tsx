import { useEffect, useRef, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import ApplicationTimeline from "@/components/ui/ApplicationTimeline";
import type { Application, TimelineEntry } from "@/types";
import ApplicantProfile from "./ApplicantProfile";
import ApplicationActions from "./ApplicationActions";
import ApplicationStatusTracker from "./ApplicationStatusTracker";
import { STAGE_TONE, appCode, appliedLabel, isStaffed, money, statusLabelKey, unitKey, wageOf, type Stage } from "./helpers";

interface ApplicationDetailsProps {
  application: Application;
  stage: Stage;
  /** Every application for the same job, used for the staffing line. */
  jobApplications: Application[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onDecide: (decision: "accepted" | "declined") => void;
  onCancel: (reason: string) => void;
  onRated: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-5 border-b border-slate-100 last:border-b-0">
      <h3 className="m-0 mb-3 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[12.5px] text-slate-500">{label}</div>
      <div className="text-[15px] font-semibold text-slate-900 break-words">{value || "—"}</div>
    </div>
  );
}

export default function ApplicationDetails({ application: a, stage, jobApplications, busy, error, onClose, onDecide, onCancel, onRated }: ApplicationDetailsProps) {
  const { tr, loc, locale } = useEmployerT();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const timeline: TimelineEntry[] = a.timeline?.length ? a.timeline : a.createdAt ? [{ event: "submitted", at: a.createdAt, by: "worker" }] : [];
  const job = a.job;
  const wage = wageOf(job);
  const staffed = jobApplications.filter(isStaffed).length;
  const vacancies = job?.vacancies || jobApplications.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tr("dt_title")}
        tabIndex={-1}
        className="relative h-full w-full sm:w-[520px] bg-white shadow-2xl flex flex-col outline-none animate-slide-in"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <div className="text-[13px] text-slate-500">{tr("appNo", { code: appCode(a) })}</div>
            <div className="text-[13px] text-slate-500">{appliedLabel(a.createdAt, tr, locale)}</div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium ${STAGE_TONE[stage]}`}>{tr(statusLabelKey(a, stage))}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr("dt_close")}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <FiX size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section title={tr("dt_worker")}>
            <ApplicantProfile application={a} stage={stage} />
          </Section>

          <Section title={tr("dt_job")}>
            {job ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={tr("appliedFor")} value={loc(job.jobTitle)} />
                <Field label={tr("dt_jobLocation")} value={loc(job.location)} />
                <Field label={tr("dt_filled")} value={tr("confirmedOf", { a: staffed, b: vacancies })} />
              </div>
            ) : (
              <p className="m-0 text-[14px] text-slate-500">{tr("dt_noJob")}</p>
            )}
            {a.message && (
              <div className="mt-4">
                <div className="text-[12.5px] text-slate-500">{tr("dt_message")}</div>
                <p className="m-0 mt-1 rounded-lg bg-slate-50 border border-slate-200 p-3 text-[14px] text-slate-700 break-words">{a.message}</p>
              </div>
            )}
          </Section>

          <Section title={tr("dt_payment")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tr("agreedWage")} value={wage ? `${money(wage)} / ${tr(unitKey(job))}` : ""} />
              <Field label={tr("shiftHours")} value={job?.dutyTimings ?? ""} />
              <Field label={tr("dt_paymentMethod")} value={job?.paymentMethod ?? ""} />
              <Field label={tr("payoutStatus")} value={tr(a.rating ? "payout_rated" : a.status === "completed" ? "payout_ready" : "payout_pending")} />
            </div>
          </Section>

          <Section title={tr("dt_status")}>
            <ApplicationStatusTracker application={a} stage={stage} />
          </Section>

          <Section title={tr("tl_title")}>
            <ApplicationTimeline
              locale={locale}
              rows={timeline.map((t, i) => ({
                key: `${t.event}-${i}`,
                label: tr(`tl_${t.event}` as EmployerKey),
                at: t.at,
                tone: t.event,
              }))}
            />
          </Section>

          <Section title={tr("dt_actions")}>
            <ApplicationActions
              application={a}
              stage={stage}
              variant="details"
              busy={busy}
              error={error}
              onDecide={onDecide}
              onCancel={onCancel}
              onRated={onRated}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
