"use client";

import { FiClock, FiMapPin, FiNavigation, FiPhone } from "react-icons/fi";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import type { Application } from "@/types";
import WorkerAvatar from "../applications/WorkerAvatar";
import { displayPhone, money, nameOf, phoneOf, skillsOf, unitKey, waLink, wageOf } from "../applications/helpers";
import type { EmployerWork } from "./useEmployerWork";
import { completionPending, formatDate, lastEvent, scheduleOf, workDateOf, completedAtOf } from "./workHelpers";

const STATUS_KEY: Record<string, EmployerKey> = {
  confirmed: "badge_confirmed",
  on_the_way: "badge_onTheWay",
  arrived: "badge_arrived",
  completed: "step_completed",
  cancelled: "badge_cancelled",
  withdrawn: "badge_withdrawn",
};

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700",
  on_the_way: "bg-amber-50 text-amber-700",
  arrived: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  withdrawn: "bg-slate-100 text-slate-600",
};

const BTN = "h-10 px-4 rounded-lg text-[13.5px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center no-underline";
const BTN_LIGHT = `${BTN} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

interface Props {
  app: Application;
  work: EmployerWork;
  onOpen: (a: Application) => void;
  onTrack?: (a: Application) => void;
}

export default function EmployerWorkCard({ app, work, onOpen, onTrack }: Props) {
  const { tr, loc, locale } = useEmployerT();
  const name = nameOf(app);
  const phone = phoneOf(app);
  const skills = skillsOf(app);
  const wage = wageOf(app.job);
  const pending = completionPending(app);
  const active = ["confirmed", "on_the_way", "arrived"].includes(app.status ?? "");
  const last = lastEvent(app);
  const statusKey = pending ? "aw_requested" : (STATUS_KEY[app.status ?? ""] ?? "badge_confirmed");
  const tone = pending ? "bg-violet-50 text-violet-700" : (STATUS_TONE[app.status ?? ""] ?? "bg-slate-100 text-slate-600");
  const doneAt = completedAtOf(app);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <WorkerAvatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 break-words text-[17px] font-bold text-slate-900">{name}</h3>
            <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${tone}`}>{tr(statusKey)}</span>
          </div>
          <p className="m-0 mt-0.5 break-words text-[14px] font-medium text-slate-700">{loc(app.job?.jobTitle) || tr("untitled")}</p>
          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.slice(0, 4).map((s) => (
                <span key={s} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] text-slate-600">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <dl className="m-0 grid gap-x-4 gap-y-1.5 text-[13.5px] text-slate-600 sm:grid-cols-2">
        <div className="flex gap-1.5"><dt className="text-slate-400">{tr("aw_workDate")}:</dt><dd className="m-0">{workDateOf(app, locale) || tr("aw_notSet")}</dd></div>
        <div className="flex gap-1.5"><dt className="text-slate-400">{tr("aw_schedule")}:</dt><dd className="m-0 break-words">{scheduleOf(app) || tr("aw_notSet")}</dd></div>
        <div className="flex gap-1.5"><dt className="text-slate-400">{tr("aw_payment")}:</dt><dd className="m-0 font-semibold text-slate-900">{wage ? `${money(wage)} / ${tr(unitKey(app.job))}` : tr("aw_notSet")}{app.job?.paymentMethod ? ` · ${app.job.paymentMethod}` : ""}</dd></div>
        {loc(app.job?.location) && <div className="flex gap-1.5"><FiMapPin className="mt-0.5 shrink-0 text-slate-400" /><dd className="m-0 break-words">{loc(app.job?.location)}</dd></div>}
        {doneAt && <div className="flex gap-1.5"><dt className="text-slate-400">{tr("aw_completedOn")}:</dt><dd className="m-0">{formatDate(doneAt, locale, true)}</dd></div>}
        {app.status === "completed" && (
          <div className="flex gap-1.5"><dt className="text-slate-400">{tr("aw_yourRating")}:</dt><dd className="m-0">{app.rating ? `★ ${app.rating}/5` : tr("aw_notRated")}</dd></div>
        )}
        {app.status === "completed" && app.employerRating ? (
          <div className="flex gap-1.5"><dt className="text-slate-400">{tr("aw_theirRating")}:</dt><dd className="m-0">★ {app.employerRating}/5</dd></div>
        ) : null}
        {!active && app.cancellationReason && <div className="flex gap-1.5 sm:col-span-2"><dt className="text-slate-400">{tr("aw_cancelledReason")}:</dt><dd className="m-0 break-words">{app.cancellationReason}</dd></div>}
      </dl>

      {last && (
        <p className="m-0 flex items-start gap-1.5 text-[12.5px] text-slate-500">
          <FiClock className="mt-0.5 shrink-0" />
          <span>{tr("aw_lastActivity")}: {tr(`tl_${last.event}` as EmployerKey)} · {formatDate(last.at, locale, true)}</span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {pending && <button type="button" disabled={work.busy} onClick={() => work.askReview(app)} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}>{tr("aw_reviewBtn")}</button>}
        {app.status === "completed" && !app.rating && <button type="button" disabled={work.busy} onClick={() => work.askRate(app)} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}>{tr("aw_rateWorker")}</button>}
        {phone && active && (
          <>
            <a href={`tel:${phone}`} className={BTN_LIGHT} aria-label={`${tr("aw_call")} ${displayPhone(phone)}`}><FiPhone className="mr-1.5" /> {tr("aw_call")}</a>
            <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className={BTN_LIGHT}>{tr("aw_whatsapp")}</a>
          </>
        )}
        {active && onTrack && <button type="button" onClick={() => onTrack(app)} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}><FiNavigation className="mr-1.5" /> {tr("lt_track")}</button>}
        <button type="button" onClick={() => onOpen(app)} className={BTN_LIGHT}>{tr("aw_details")}</button>
        {active && <button type="button" disabled={work.busy} onClick={() => work.askCancel(app)} className={`${BTN} border border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}>{tr("cancelBtn")}</button>}
      </div>
    </article>
  );
}
