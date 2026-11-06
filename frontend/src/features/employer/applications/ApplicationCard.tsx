import { FiStar } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";
import type { Application } from "@/types";
import ApplicationActions from "./ApplicationActions";
import WorkerAvatar from "./WorkerAvatar";
import { STAGE_TONE, appliedLabel, money, nameOf, skillsOf, statusLabelKey, unitKey, wageOf, workerRating, type Stage } from "./helpers";

interface ApplicationCardProps {
  application: Application;
  stage: Stage;
  busy: boolean;
  onOpen: () => void;
  onDecide: (decision: "accepted" | "declined") => void;
}

export default function ApplicationCard({ application: a, stage, busy, onOpen, onDecide }: ApplicationCardProps) {
  const { tr, loc, locale } = useEmployerT();
  const rating = workerRating(a);
  const wage = wageOf(a.job);
  const skills = skillsOf(a).slice(0, 2);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <WorkerAvatar name={nameOf(a)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="m-0 text-[16.5px] font-bold text-slate-900 truncate">{nameOf(a)}</h3>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium ${STAGE_TONE[stage]}`}>{tr(statusLabelKey(a, stage))}</span>
          </div>
          <p className="m-0 text-[14px] text-slate-600 truncate">{loc(a.job?.jobTitle) || tr("untitled")}</p>
          <p className="m-0 mt-0.5 text-[12.5px] text-slate-400">{appliedLabel(a.createdAt, tr, locale)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <FiStar className="text-amber-400" /> {rating ? rating.toFixed(1) : tr("isNew")}
          {a.worker?.totalReviews ? ` ${tr("shiftsN", { n: a.worker.totalReviews })}` : ""}
        </span>
        {wage > 0 && (
          <span className="font-bold text-slate-900">
            {money(wage)} / {tr(unitKey(a.job))}
          </span>
        )}
        {skills.map((s) => (
          <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[12.5px] text-slate-600">
            {s}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
        <ApplicationActions application={a} stage={stage} variant="card" busy={busy} onDecide={onDecide} />
        <button
          type="button"
          onClick={onOpen}
          className="h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-[13.5px] font-semibold cursor-pointer"
        >
          {tr("viewDetails")}
        </button>
      </div>
    </article>
  );
}
