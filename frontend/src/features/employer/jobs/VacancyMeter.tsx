import type { JobStats } from "@/types";

interface VacancyMeterProps {
  stats: Pick<JobStats, "totalVacancies" | "confirmedWorkers" | "reserved" | "availableVacancies">;
  className?: string;
}

export default function VacancyMeter({ stats, className = "" }: VacancyMeterProps) {
  const total = Math.max(1, stats.totalVacancies);
  const confirmedPct = Math.min(100, (stats.confirmedWorkers / total) * 100);
  const reservedPct = Math.min(100 - confirmedPct, (stats.reserved / total) * 100);
  return (
    <div
      role="img"
      aria-label={`${stats.confirmedWorkers} confirmed, ${stats.reserved} reserved, ${stats.availableVacancies} available of ${stats.totalVacancies}`}
      className={`flex h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <span className="bg-emerald-500" style={{ width: `${confirmedPct}%` }} />
      <span className="bg-amber-400" style={{ width: `${reservedPct}%` }} />
    </div>
  );
}
