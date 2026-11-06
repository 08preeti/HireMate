import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";
import type { Job } from "@/types";
import { DEFAULT_FILTERS, type ApplicationFilterState, type SortKey } from "./helpers";

interface ApplicationFiltersProps {
  filters: ApplicationFilterState;
  jobs: Job[];
  onChange: (next: ApplicationFilterState) => void;
}

export default function ApplicationFilters({ filters, jobs, onChange }: ApplicationFiltersProps) {
  const { tr, loc } = useEmployerT();
  const set = <K extends keyof ApplicationFilterState>(key: K, value: ApplicationFilterState[K]) => onChange({ ...filters, [key]: value });
  const dirty = filters.query !== "" || filters.jobId !== "all" || filters.distance !== "any" || filters.sort !== DEFAULT_FILTERS.sort;

  const select =
    "h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-slate-700 outline-none focus:border-blue-500";
  const chevron = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr_auto] items-center">
      <label className="flex items-center gap-2.5 h-11 rounded-lg border border-slate-300 px-3.5 focus-within:border-blue-500 sm:col-span-2 xl:col-span-1">
        <FiSearch className="text-slate-400 shrink-0" />
        <input
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder={tr("searchPh")}
          aria-label={tr("searchPh")}
          className="flex-1 min-w-0 bg-transparent text-[14px] outline-none"
        />
      </label>
      <div className="relative">
        <select value={filters.jobId} onChange={(e) => set("jobId", e.target.value)} aria-label={tr("role_all")} className={select}>
          <option value="all">{tr("role_all")}</option>
          {jobs.map((j) => (
            <option key={j._id} value={j._id}>
              {tr("role_x", { title: loc(j.jobTitle) || tr("untitled") })}
            </option>
          ))}
        </select>
        <FiChevronDown className={chevron} />
      </div>
      <div className="relative">
        <select value={filters.distance} onChange={(e) => set("distance", e.target.value)} aria-label={tr("dist_any")} className={select}>
          <option value="any">{tr("dist_any")}</option>
          <option value="5">{tr("dist_n", { n: 5 })}</option>
          <option value="10">{tr("dist_n", { n: 10 })}</option>
          <option value="25">{tr("dist_n", { n: 25 })}</option>
        </select>
        <FiChevronDown className={chevron} />
      </div>
      <div className="relative">
        <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)} aria-label={tr("sortBy")} className={select}>
          <option value="newest">{tr("sort_newest")}</option>
          <option value="oldest">{tr("sort_oldest")}</option>
          <option value="rating">{tr("sort_rating")}</option>
          <option value="wage">{tr("sort_wage")}</option>
        </select>
        <FiChevronDown className={chevron} />
      </div>
      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        disabled={!dirty}
        className="h-11 px-3 rounded-lg text-[13.5px] font-semibold text-blue-600 hover:bg-blue-50 disabled:text-slate-300 disabled:hover:bg-transparent flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default"
      >
        <FiX /> {tr("clearFilters")}
      </button>
    </div>
  );
}
