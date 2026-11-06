import { FiCheck } from "react-icons/fi";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import type { Application } from "@/types";
import { STATUS_LABEL, type Stage } from "./helpers";

interface ApplicationStatusTrackerProps {
  application: Application;
  stage: Stage;
}

const STEPS: EmployerKey[] = ["step_applied", "step_offer", "step_confirmed", "step_onWay", "step_arrived", "step_completed"];

const POSITION: Record<string, number> = { pending: 0, accepted: 1, confirmed: 2, on_the_way: 3, arrived: 4, completed: 5 };

export default function ApplicationStatusTracker({ application, stage }: ApplicationStatusTrackerProps) {
  const { tr } = useEmployerT();

  if (stage === "declined") {
    const label = tr(STATUS_LABEL[application.status ?? "declined"] ?? "badge_declined");
    return <p className="m-0 rounded-lg bg-rose-50 text-rose-700 text-[13.5px] font-medium px-3.5 py-2.5">{tr("track_closed", { status: label })}</p>;
  }

  const current = application.rating ? 5 : (POSITION[application.status ?? "pending"] ?? 0);

  return (
    <ol className="m-0 p-0 list-none grid grid-cols-6 gap-1">
      {STEPS.map((key, i) => {
        const done = i < current || (i === 5 && current === 5);
        const here = i === current && !done;
        return (
          <li key={key} className="flex flex-col items-center text-center gap-1.5" aria-current={here ? "step" : undefined}>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${done ? "bg-emerald-500 text-white" : here ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
            >
              {done ? <FiCheck /> : i + 1}
            </span>
            <span className={`text-[11px] leading-tight ${done || here ? "text-slate-700 font-semibold" : "text-slate-400"}`}>{tr(key)}</span>
          </li>
        );
      })}
    </ol>
  );
}
