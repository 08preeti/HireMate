import { useEmployerT } from "@/i18n/employerText";
import { STAGES, TAB_LABEL, type Stage, type TabKey } from "./helpers";

interface ApplicationTabsProps {
  active: TabKey;
  total: number;
  counts: Record<Stage, number>;
  onChange: (tab: TabKey) => void;
}

const TABS: readonly TabKey[] = ["all", ...STAGES];

export default function ApplicationTabs({ active, total, counts, onChange }: ApplicationTabsProps) {
  const { tr } = useEmployerT();
  return (
    <div role="tablist" className="border-b border-slate-200 flex gap-6 overflow-x-auto">
      {TABS.map((key) => {
        const on = active === key;
        const count = key === "all" ? total : counts[key];
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(key)}
            className={`relative whitespace-nowrap pb-3 pt-1 text-[14.5px] cursor-pointer ${on ? "text-blue-600 font-semibold" : "font-medium text-slate-500 hover:text-slate-800"}`}
          >
            {tr(TAB_LABEL[key])}
            <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${on ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"}`}>{count}</span>
            {on && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-blue-600 rounded-t" />}
          </button>
        );
      })}
    </div>
  );
}
