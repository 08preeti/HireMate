import type { TimelineEntry } from "@/types";

export interface TimelineRow {
  key: string;
  label: string;
  at: string;
  tone: TimelineEntry["event"];
}

const BAD: ReadonlySet<string> = new Set(["declined", "rejected", "withdrawn", "cancelled"]);

/** Vertical activity list; every row is a real, server-timestamped event. */
export default function ApplicationTimeline({ rows, locale }: { rows: TimelineRow[]; locale: string }) {
  return (
    <ol className="m-0 list-none p-0">
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        const dot = BAD.has(r.tone) ? "bg-rose-500" : last ? "bg-blue-600" : "bg-emerald-500";
        return (
          <li key={r.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" aria-hidden="true" />}
            <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-slate-800">{r.label}</div>
              <time dateTime={r.at} className="text-[12.5px] text-slate-500">
                {new Date(r.at).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
