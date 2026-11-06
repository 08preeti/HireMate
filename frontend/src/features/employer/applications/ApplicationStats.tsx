import { FiCheckCircle, FiSend, FiUserPlus, FiUsers } from "react-icons/fi";
import type { ReactNode } from "react";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import type { Stage } from "./helpers";

interface ApplicationStatsProps {
  counts: Record<Stage, number>;
}

const CARDS: { key: EmployerKey; icon: ReactNode; tone: string; value: (c: Record<Stage, number>) => number }[] = [
  { key: "stat_new", icon: <FiUserPlus />, tone: "bg-blue-50 text-blue-600", value: (c) => c.new },
  { key: "stat_offers", icon: <FiSend />, tone: "bg-sky-50 text-sky-600", value: (c) => c.offers },
  { key: "stat_working", icon: <FiUsers />, tone: "bg-emerald-50 text-emerald-600", value: (c) => c.confirmed + c.active },
  { key: "stat_completed", icon: <FiCheckCircle />, tone: "bg-amber-50 text-amber-600", value: (c) => c.completed },
];

export default function ApplicationStats({ counts }: ApplicationStatsProps) {
  const { tr } = useEmployerT();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map((card) => (
        <div key={card.key} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center gap-3">
          <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-[18px] ${card.tone}`}>{card.icon}</span>
          <div className="min-w-0">
            <div className="text-[22px] font-extrabold leading-none text-slate-900">{card.value(counts)}</div>
            <div className="mt-1 text-[12.5px] text-slate-500 truncate">{tr(card.key)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
