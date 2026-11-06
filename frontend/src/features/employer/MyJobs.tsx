"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiMapPin, FiPlus, FiSearch } from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { getMyJobs } from "@/services/jobs";
import type { EmployerJob, JobStatus } from "@/types";
import VacancyMeter from "./jobs/VacancyMeter";
import { JOB_STATUS_ORDER, JOB_TYPE_LABEL, STATUS_LABEL, STATUS_TAB_LABEL, STATUS_TONE, jobStatusOf } from "./jobs/jobHelpers";
import { useJobActions } from "./jobs/useJobActions";

type Tab = "all" | JobStatus;

const BTN = "h-9 px-3.5 rounded-lg text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center no-underline";
const BTN_LIGHT = `${BTN} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

export default function MyJobs() {
  const { tr, loc, locale } = useEmployerT();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const data = await getMyJobs();
      setJobs(data.jobs);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { request, dialog, busyId, notice, clearNotice } = useJobActions(load);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: jobs.length, active: 0, filled: 0, closed: 0, completed: 0 };
    jobs.forEach((j) => {
      c[jobStatusOf(j.status)] += 1;
    });
    return c;
  }, [jobs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs
      .filter((j) => tab === "all" || j.status === tab)
      .filter((j) => !q || `${loc(j.jobTitle)} ${loc(j.location)} ${typeof j.category === "string" ? j.category : ""}`.toLowerCase().includes(q))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [jobs, tab, query, loc]);

  const tabs: { key: Tab; label: EmployerKey }[] = [{ key: "all", label: "jm_tab_all" }, ...JOB_STATUS_ORDER.map((s) => ({ key: s as Tab, label: STATUS_TAB_LABEL[s] }))];

  let body;
  if (loading) {
    body = (
      <div role="status" aria-label={tr("mj_loading")} className="grid gap-4 lg:grid-cols-2 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[260px] rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  } else if (failed) {
    body = (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center flex flex-col items-center gap-4">
        <p className="m-0 text-[14.5px] text-rose-800">{tr("mj_failed")}</p>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="h-10 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[14px] font-semibold cursor-pointer">
          {tr("ws_retry")}
        </button>
      </div>
    );
  } else if (jobs.length === 0) {
    body = (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center flex flex-col items-center gap-3">
        <p className="m-0 text-[16px] font-bold text-slate-800">{tr("noJobs")}</p>
        <p className="m-0 text-[14px] text-slate-500">{tr("noJobsSub")}</p>
        <Link href="/post-job" className="mt-1 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold no-underline flex items-center gap-2">
          <FiPlus /> {tr("postFirst")}
        </Link>
      </div>
    );
  } else if (visible.length === 0) {
    body = <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-[14.5px] text-slate-500">{query.trim() ? tr("noMatch") : tr("jm_emptyTab")}</div>;
  } else {
    body = (
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((j) => {
          const status = jobStatusOf(j.status);
          const busy = busyId === j._id;
          const wage = Number(j.salary) || 0;
          const category = (typeof j.category === "string" && j.category) || loc(j.skills);
          const facts: { label: EmployerKey; value: number }[] = [
            { label: "jm_total", value: j.stats.totalVacancies },
            { label: "jm_available", value: j.stats.availableVacancies },
            { label: "jm_confirmedW", value: j.stats.confirmedWorkers },
            { label: "jm_pendingApps", value: j.stats.pending },
          ];
          return (
            <article key={j._id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="m-0 text-[17px] font-bold text-slate-900 break-words">{loc(j.jobTitle) || tr("untitled")}</h3>
                  {category && <p className="m-0 mt-0.5 text-[13px] text-slate-500">{category}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {j.isUrgent && status === "active" && <span className="rounded-md bg-rose-50 text-rose-600 text-[12px] font-medium px-2 py-0.5">{tr("tag_urgent")}</span>}
                  <span className={`rounded-md text-[12px] font-semibold px-2 py-0.5 ${STATUS_TONE[status]}`}>{tr(STATUS_LABEL[status])}</span>
                </div>
              </div>

              {loc(j.location) && (
                <p className="m-0 flex items-start gap-1.5 text-[13.5px] text-slate-500">
                  <FiMapPin className="mt-0.5 shrink-0" /> <span className="min-w-0 break-words">{loc(j.location)}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-slate-600">
                {wage > 0 && (
                  <span className="font-bold text-slate-900">
                    ₹{wage.toLocaleString("en-IN")} / {tr(j.salaryUnit ? (`unit_${j.salaryUnit}` as EmployerKey) : "unit_day")}
                  </span>
                )}
                {j.jobType && <span>{tr(JOB_TYPE_LABEL[j.jobType])}</span>}
                {j.createdAt && (
                  <span className="text-slate-400">
                    {tr("jm_created")} {new Date(j.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>

              <div>
                <VacancyMeter stats={j.stats} />
                <dl className="m-0 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {facts.map((f) => (
                    <div key={f.label} className="rounded-lg bg-slate-50 px-3 py-2">
                      <dd className="m-0 text-[18px] font-extrabold text-slate-900 leading-none">{f.value}</dd>
                      <dt className="mt-1 text-[11.5px] text-slate-500 leading-tight">{tr(f.label)}</dt>
                    </div>
                  ))}
                </dl>
                {j.stats.reserved > 0 && (
                  <p className="m-0 mt-2 text-[12.5px] text-amber-700">
                    {tr("jm_reserved")}: {j.stats.reserved}
                  </p>
                )}
              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                <Link href={`/employer-jobs/${j._id}`} className={`${BTN} bg-blue-600 hover:bg-blue-700 text-white`}>
                  {tr("jm_view")}
                </Link>
                {j.actions.canEdit && (
                  <Link href={`/employer-jobs/${j._id}/edit`} className={BTN_LIGHT}>
                    {tr("jm_edit")}
                  </Link>
                )}
                {j.stats.total > 0 && (
                  <Link href={`/applications?job=${j._id}`} className={BTN_LIGHT}>
                    {tr("jm_apps")} ({j.stats.total})
                  </Link>
                )}
                {j.actions.canFill && (
                  <button type="button" disabled={busy} onClick={() => request("fill", j)} className={BTN_LIGHT}>
                    {tr("jm_fill")}
                  </button>
                )}
                {j.actions.canComplete && (
                  <button type="button" disabled={busy} onClick={() => request("complete", j)} className={BTN_LIGHT}>
                    {tr("jm_complete")}
                  </button>
                )}
                {j.actions.canClose && (
                  <button type="button" disabled={busy} onClick={() => request("close", j)} className={BTN_LIGHT}>
                    {tr("jm_close")}
                  </button>
                )}
                {j.actions.canReopen && (
                  <button type="button" disabled={busy} onClick={() => request("reopen", j)} className={BTN_LIGHT}>
                    {busy ? "…" : tr("jm_reopen")}
                  </button>
                )}
                {j.actions.canDelete && (
                  <button type="button" disabled={busy} onClick={() => request("delete", j)} className={`${BTN} border border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}>
                    {tr("jm_delete")}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <EmployerShell>
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold text-[#0F1F4B]">{tr("mj_title")}</h1>
            <p className="m-0 mt-1.5 text-[14.5px] text-slate-500 max-w-[620px]">{tr("mj_sub")}</p>
          </div>
          <Link href="/post-job" className="h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold no-underline flex items-center gap-2">
            <FiPlus /> {tr("nav_postJob")}
          </Link>
        </div>

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[14px] ${notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
          >
            {notice.type === "error" ? <FiAlertCircle className="mt-0.5 shrink-0" /> : <FiCheckCircle className="mt-0.5 shrink-0" />}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={clearNotice} aria-label="Dismiss" className="cursor-pointer bg-transparent border-0 text-current">✕</button>
          </div>
        )}

        {!loading && !failed && jobs.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`h-10 px-4 whitespace-nowrap rounded-lg text-[13.5px] font-semibold cursor-pointer ${tab === t.key ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  {tr(t.label, { n: counts[t.key] })}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2.5 h-11 rounded-lg border border-slate-300 bg-white px-3.5 focus-within:border-blue-500 w-full max-w-[420px]">
              <FiSearch className="text-slate-400 shrink-0" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("mj_search")} aria-label={tr("mj_search")} className="flex-1 min-w-0 bg-transparent text-[14px] outline-none" />
            </label>
          </div>
        )}

        {body}
      </div>
      {dialog}
    </EmployerShell>
  );
}
