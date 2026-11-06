import Link from "next/link";
import { FiInbox, FiPlus } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";

interface EmptyApplicationsProps {
  /** "none": the employer has no applications at all · "tab": this tab is empty · "filtered": filters hide everything. */
  variant: "none" | "tab" | "filtered";
  tabLabel?: string;
  onClearFilters?: () => void;
}

export default function EmptyApplications({ variant, tabLabel = "", onClearFilters }: EmptyApplicationsProps) {
  const { tr } = useEmployerT();
  const message = variant === "none" ? tr("emptyNone") : variant === "tab" ? tr("emptyTab", { tab: tabLabel }) : tr("emptyFilter");

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center flex flex-col items-center gap-4">
      <span className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[22px]">
        <FiInbox />
      </span>
      <p className="m-0 max-w-[420px] text-[14.5px] text-slate-500">{message}</p>
      {variant === "none" && (
        <Link href="/post-job" className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold no-underline flex items-center gap-2">
          <FiPlus /> {tr("nav_postJob")}
        </Link>
      )}
      {variant === "filtered" && onClearFilters && (
        <button type="button" onClick={onClearFilters} className="h-10 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-[14px] font-semibold cursor-pointer">
          {tr("clearFilters")}
        </button>
      )}
    </div>
  );
}
