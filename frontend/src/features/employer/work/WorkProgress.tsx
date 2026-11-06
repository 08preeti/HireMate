"use client";

import { FiCheck } from "react-icons/fi";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import type { Application, TimelineEventName } from "@/types";
import { completionPending, eventAt, formatDate } from "./workHelpers";

const STEPS: { event: TimelineEventName; label: EmployerKey }[] = [
  { event: "confirmed", label: "step_confirmed" },
  { event: "on_the_way", label: "step_onWay" },
  { event: "arrived", label: "step_arrived" },
  { event: "completion_requested", label: "aw_requested" },
  { event: "completed", label: "step_completed" },
];

function currentStep(a: Application) {
  if (a.status === "completed") return 5;
  if (completionPending(a)) return 4;
  if (a.status === "arrived") return 3;
  if (a.status === "on_the_way") return 2;
  return 1;
}

export default function WorkProgress({ app }: { app: Application }) {
  const { tr, locale } = useEmployerT();
  const current = currentStep(app);
  return (
    <ol aria-label={tr("aw_progress")} className="m-0 grid list-none grid-cols-5 gap-1 p-0">
      {STEPS.map((step, i) => {
        const done = i < current;
        const here = i === current;
        const at = done ? eventAt(app, step.event) : undefined;
        return (
          <li key={step.event} aria-current={here ? "step" : undefined} className="flex flex-col items-center gap-1 text-center">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-emerald-500 text-white" : here ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              {done ? <FiCheck aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-[11px] leading-tight ${done || here ? "font-semibold text-slate-700" : "text-slate-400"}`}>{tr(step.label)}</span>
            {at && <span className="text-[10.5px] leading-tight text-slate-400">{formatDate(at, locale)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
