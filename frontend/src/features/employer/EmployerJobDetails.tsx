"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiMapPin, FiPhone } from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { ApiError } from "@/services/api";
import { getMyJob } from "@/services/jobs";
import type { EmployerJobDetail } from "@/types";
import VacancyMeter from "./jobs/VacancyMeter";
import { JOB_TYPE_LABEL, STATUS_LABEL, STATUS_TONE, jobStatusOf } from "./jobs/jobHelpers";
import { useJobActions } from "./jobs/useJobActions";

const BTN = "h-10 px-4 rounded-lg text-[13.5px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center no-underline";
const BTN_LIGHT = `${BTN} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="m-0 mb-3 text-[16px] font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="grid gap-0.5 sm:grid-cols-[170px_1fr] sm:gap-3 py-1.5 text-[14px]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-slate-900">{value}</dd>
    </div>
  );
}

export default function EmployerJobDetails() {
  const { id } = useParams<{ id: string }>();
  const { tr, loc, locale } = useEmployerT();
  const [job, setJob] = useState<EmployerJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"missing" | "failed" | null>(null);

  const load = useCallback(async () => {
    try {
      setJob(await getMyJob(id));
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof ApiError && (err.status === 404 || err.status === 403) ? "missing" : "failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const { request, dialog, busyId, notice, clearNotice } = useJobActions(async (kind) => {
    if (kind === "delete") {
      window.location.assign("/employer-jobs");
      return;
    }
    await load();
  });

  const back = (
    <Link href="/employer-jobs" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue-600 no-underline hover:text-blue-700">
      <FiArrowLeft /> {tr("jd_back")}
    </Link>
  );

  let body: ReactNode;
  if (loading) {
    body = (
      <div role="status" aria-label={tr("mj_loading")} className="flex flex-col gap-4 animate-pulse">
        <div className="h-24 rounded-xl bg-slate-200" />
        <div className="h-40 rounded-xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
    );
  } else if (error || !job) {
    body = (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center flex flex-col items-center gap-4">
        <p className="m-0 text-[14.5px] text-rose-800">{error === "missing" ? tr("jd_notFound") : tr("mj_failed")}</p>
        {error === "failed" && (
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="h-10 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[14px] font-semibold cursor-pointer">
            {tr("ws_retry")}
          </button>
        )}
      </div>
    );
  } else {
    const status = jobStatusOf(job.status);
    const busy = busyId === job._id;
    const s = job.stats;
    const wage = Number(job.salary) || 0;
    const category = (typeof job.category === "string" && job.category) || "";
    const payMethod = job.paymentMethod === "Cash" || job.paymentMethod === "UPI" ? tr(`pay_${job.paymentMethod}` as EmployerKey) : job.paymentMethod;
    const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
    const link = (tab?: string) => `/applications?job=${job._id}${tab ? `&tab=${tab}` : ""}`;

    const vacancyTiles: { label: EmployerKey; value: number }[] = [
      { label: "jm_total", value: s.totalVacancies },
      { label: "jm_confirmedW", value: s.confirmedWorkers },
      { label: "jm_reserved", value: s.reserved },
      { label: "jm_available", value: s.availableVacancies },
    ];
    const appTiles: { label: EmployerKey; value: number; href: string }[] = [
      { label: "jd_s_pending", value: s.pending, href: link() },
      { label: "jd_s_offers", value: s.reserved, href: link("offers") },
      { label: "jd_s_confirmed", value: s.confirmed, href: link("confirmed") },
      { label: "jd_s_active", value: s.inProgress, href: link("active") },
      { label: "jd_s_completed", value: s.completed, href: link("completed") },
      { label: "jd_s_declined", value: s.ended, href: link("declined") },
    ];

    body = (
      <>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-[22px] sm:text-[26px] font-extrabold text-[#0F1F4B] break-words">{loc(job.jobTitle) || tr("untitled")}</h1>
                <span className={`rounded-md text-[12px] font-semibold px-2 py-0.5 ${STATUS_TONE[status]}`}>{tr(STATUS_LABEL[status])}</span>
                {job.isUrgent && status === "active" && <span className="rounded-md bg-rose-50 text-rose-600 text-[12px] font-medium px-2 py-0.5">{tr("tag_urgent")}</span>}
              </div>
              <p className="m-0 mt-1 text-[13.5px] text-slate-500">
                {[category, job.jobType ? tr(JOB_TYPE_LABEL[job.jobType]) : "", job.createdAt ? `${tr("jm_created")} ${new Date(job.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}` : ""].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.actions.canEdit && (
                <Link href={`/employer-jobs/${job._id}/edit`} className={BTN_LIGHT}>
                  {tr("jm_edit")}
                </Link>
              )}
              {job.actions.canFill && <button type="button" disabled={busy} onClick={() => request("fill", job)} className={BTN_LIGHT}>{tr("jm_fill")}</button>}
              {job.actions.canComplete && <button type="button" disabled={busy} onClick={() => request("complete", job)} className={BTN_LIGHT}>{tr("jm_complete")}</button>}
              {job.actions.canClose && <button type="button" disabled={busy} onClick={() => request("close", job)} className={BTN_LIGHT}>{tr("jm_close")}</button>}
              {job.actions.canReopen && <button type="button" disabled={busy} onClick={() => request("reopen", job)} className={BTN_LIGHT}>{busy ? "…" : tr("jm_reopen")}</button>}
              {job.actions.canDelete && <button type="button" disabled={busy} onClick={() => request("delete", job)} className={`${BTN} border border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}>{tr("jm_delete")}</button>}
            </div>
          </div>

          <div>
            <h2 className="m-0 mb-2 text-[14px] font-bold text-slate-700">{tr("jd_vacancies")}</h2>
            <VacancyMeter stats={s} />
            <dl className="m-0 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {vacancyTiles.map((t) => (
                <div key={t.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <dd className="m-0 text-[22px] font-extrabold text-slate-900 leading-none">{t.value}</dd>
                  <dt className="mt-1 text-[12px] text-slate-500">{tr(t.label)}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <Section title={tr("jd_applications")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {appTiles.map((t) => (
              <Link key={t.label} href={t.href} className="rounded-lg border border-slate-200 px-3 py-2.5 no-underline hover:border-blue-400 hover:bg-blue-50/40">
                <span className="block text-[20px] font-extrabold text-slate-900 leading-none">{t.value}</span>
                <span className="mt-1 block text-[12px] text-slate-500">{tr(t.label)}</span>
              </Link>
            ))}
          </div>
          <Link href={link()} className="mt-3 inline-block text-[13.5px] font-semibold text-blue-600 no-underline hover:text-blue-700">
            {tr("jm_apps")} ({s.total}) →
          </Link>
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title={tr("jd_info")}>
            <dl className="m-0">
              <Row label={tr("jm_category")} value={category} />
              <Row label={tr("jd_skills")} value={loc(job.skills)} />
              <Row label={tr("jd_experience")} value={job.experience} />
              <Row label={tr("jd_description")} value={loc(job.description)} />
              <Row label={tr("jm_jobType")} value={job.jobType ? tr(JOB_TYPE_LABEL[job.jobType]) : ""} />
            </dl>
          </Section>

          <Section title={tr("jd_payment")}>
            <dl className="m-0">
              <Row label={tr("jm_pay")} value={wage > 0 ? `₹${wage.toLocaleString("en-IN")} / ${tr(job.salaryUnit ? (`unit_${job.salaryUnit}` as EmployerKey) : "unit_day")}` : ""} />
              <Row label={tr("jd_payMethod")} value={payMethod} />
              <Row label={tr("jd_payDetails")} value={job.paymentDetails} />
              {job.overtimeRate ? <Row label="Overtime" value={`₹${job.overtimeRate} / ${tr("unit_hour")}`} /> : null}
            </dl>
          </Section>

          <Section title={tr("jd_work")}>
            <dl className="m-0">
              <Row label={tr("jd_start")} value={date(job.startDate)} />
              <Row label={tr("jd_schedule")} value={job.workSchedule} />
              <Row label={tr("jd_duration")} value={job.duration} />
              <Row label={tr("jd_instructions")} value={job.workInstructions} />
              <Row label={tr("jd_contact")} value={job.contactInfo ? <span className="inline-flex items-center gap-1.5"><FiPhone size={13} /> {job.contactInfo}</span> : ""} />
            </dl>
          </Section>

          <Section title={tr("jd_location")}>
            <dl className="m-0">
              <Row label={tr("jd_address")} value={<span className="inline-flex items-start gap-1.5"><FiMapPin className="mt-1 shrink-0" /> {loc(job.location)}</span>} />
              <Row label="" value={[job.addressLine, job.city, job.state, job.postalCode].filter(Boolean).join(", ")} />
              <Row label="" value={job.gateNote} />
            </dl>
          </Section>
        </div>

        <Section title={`${tr("jd_workers")} (${job.confirmedWorkerList.length})`}>
          {job.confirmedWorkerList.length === 0 ? (
            <p className="m-0 text-[14px] text-slate-500">{tr("jd_noWorkers")}</p>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-slate-100">
              {job.confirmedWorkerList.map((w) => (
                <li key={w.applicationId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="m-0 text-[14.5px] font-semibold text-slate-900">{w.name || "—"}</p>
                    {w.phone && <p className="m-0 text-[13px] text-slate-500">{w.phone}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <span className="rounded-md bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5">{tr(`jd_statusWorker_${w.status}` as EmployerKey)}</span>
                    <span className="text-slate-500">{w.rating ? `★ ${w.rating}` : tr("jd_ratingNone")}</span>
                    <Link href={`/applications?job=${job._id}&tab=${w.status === "completed" ? "completed" : w.status === "confirmed" ? "confirmed" : "active"}`} className="font-semibold text-blue-600 no-underline hover:text-blue-700">
                      {tr("jm_view")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </>
    );
  }

  return (
    <EmployerShell>
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4 font-plain">
        {back}
        {notice && (
          <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[14px] ${notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {notice.type === "error" ? <FiAlertCircle className="mt-0.5 shrink-0" /> : <FiCheckCircle className="mt-0.5 shrink-0" />}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={clearNotice} aria-label="Dismiss" className="cursor-pointer bg-transparent border-0 text-current">✕</button>
          </div>
        )}
        {body}
      </div>
      {dialog}
    </EmployerShell>
  );
}
