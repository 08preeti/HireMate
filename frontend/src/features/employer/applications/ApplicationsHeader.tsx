import Link from "next/link";
import { FiDownload, FiPlus, FiRefreshCw } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";

interface ApplicationsHeaderProps {
  total: number;
  activeNow: number;
  refreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export default function ApplicationsHeader({ total, activeNow, refreshing, onRefresh, onExport }: ApplicationsHeaderProps) {
  const { tr, trp } = useEmployerT();
  const secondary =
    "h-11 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-[14px] font-semibold text-slate-800 flex items-center justify-center gap-2 cursor-pointer";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[720px]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold tracking-tight text-[#0F1F4B]">{tr("pageTitle")}</h1>
          <span className="rounded-md bg-slate-100 text-slate-600 text-[13px] font-mono px-2.5 py-1">{tr("totalN", { n: total })}</span>
          {activeNow > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13px] font-medium px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {trp("livePill", activeNow)}
            </span>
          )}
        </div>
        <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-slate-500">{tr("pageSub")}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={onRefresh} disabled={refreshing} className={secondary}>
          <FiRefreshCw className={refreshing ? "animate-spin" : ""} /> {tr("refresh")}
        </button>
        <button type="button" onClick={onExport} disabled={total === 0} className={secondary}>
          <FiDownload /> {tr("exportLog")}
        </button>
        <Link
          href="/post-job"
          className="h-11 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[14px] font-semibold no-underline flex items-center justify-center gap-2"
        >
          <FiPlus /> {tr("postReplacement")}
        </Link>
      </div>
    </div>
  );
}
