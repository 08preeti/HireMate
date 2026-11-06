import { useEmployerT } from "@/i18n/employerText";

export default function LoadingApplications() {
  const { tr } = useEmployerT();
  return (
    <div role="status" aria-live="polite" aria-label={tr("loading")} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3 animate-pulse">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
            <div className="flex-1 flex flex-col gap-2 pt-1">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-3 w-3/4 rounded bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
      ))}
      <span className="sr-only">{tr("loading")}</span>
    </div>
  );
}
