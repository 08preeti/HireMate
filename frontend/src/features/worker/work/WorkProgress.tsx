"use client";

import { FiCheck } from "react-icons/fi";
import { useL } from "@/hooks/useL";
import { dateOf, eventAt, isCompleted, isCompletionPending } from "@/lib/workerApplications";
import type { Application, TimelineEventName } from "@/types";

const STEPS: { event: TimelineEventName; en: string; hi: string; mr: string }[] = [
  { event: "confirmed", en: "Confirmed", hi: "पक्का", mr: "निश्चित" },
  { event: "on_the_way", en: "On the way", hi: "रास्ते में", mr: "मार्गावर" },
  { event: "arrived", en: "Arrived", hi: "पहुँचे", mr: "पोहोचले" },
  { event: "completion_requested", en: "Finish requested", hi: "पूरा होने का अनुरोध", mr: "पूर्णत्वाची विनंती" },
  { event: "completed", en: "Completed", hi: "पूरा", mr: "पूर्ण" },
];

function currentStep(a: Application): number {
  if (isCompleted(a)) return 5;
  if (isCompletionPending(a)) return 4;
  if (a.status === "arrived") return 3;
  if (a.status === "on_the_way") return 2;
  return 1;
}

/** Where the work is now. Dates under a step are real server timestamps, never guesses. */
export default function WorkProgress({ app }: { app: Application }) {
  const { L } = useL();
  const current = currentStep(app);
  return (
    <ol className="m-0 grid list-none grid-cols-5 gap-1 p-0" aria-label={L("Work progress", "काम की प्रगति", "कामाची प्रगती")}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const here = i === current;
        const at = done ? eventAt(app, step.event) : undefined;
        return (
          <li key={step.event} aria-current={here ? "step" : undefined} className="flex flex-col items-center gap-1 text-center">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-[#10b981] text-white" : here ? "bg-[#1f6bff] text-white" : "bg-[#eef1f7] text-[#8a96ae]"}`}>
              {done ? <FiCheck size={14} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-[11px] leading-tight ${done || here ? "font-semibold text-[#33415f]" : "text-[#8a96ae]"}`}>{L(step.en, step.hi, step.mr)}</span>
            {at && <span className="text-[10.5px] leading-tight text-[#8a96ae]">{dateOf(at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
