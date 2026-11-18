"use client";

import { useMemo, useState } from "react";
import { FiCalendar, FiCheckCircle, FiClock, FiCreditCard, FiMapPin, FiUser, FiXCircle } from "react-icons/fi";
import TranslatedText from "@/components/ui/TranslatedText";
import { EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader, Stars } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { paymentMethodLabel } from "@/i18n/formatters";
import { byLatest, completedAtOf, eventAt, inr, isCompleted, jobLocationOf, jobTitleOf, salaryOf, statusLabel, workDateOf } from "@/lib/workerApplications";
import type { Application } from "@/types";
import ApplicationDetailsModal from "./applications/ApplicationDetailsModal";
import { useWorkerApplications } from "./useApplicationActions";

type Filter = "all" | "completed" | "cancelled";

const wasHired = (a: Application) => !!eventAt(a, "confirmed");
const isEndedAfterHire = (a: Application) => (a.status === "cancelled" || a.status === "withdrawn") && wasHired(a);

export default function WorkHistory() {
  const { L, language } = useL();
  const state = useWorkerApplications();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Application | null>(null);
  const records = useMemo(() => state.apps.filter((a) => isCompleted(a) || isEndedAfterHire(a)).sort(byLatest), [state.apps]);
  const visible = records.filter((a) => (filter === "all" ? true : filter === "completed" ? isCompleted(a) : !isCompleted(a)));
  const openApp = open ? (state.apps.find((a) => a._id === open._id) ?? open) : null;
  const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-GB";

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: L("All", "सभी", "सर्व") },
    { key: "completed", label: L("Completed", "पूर्ण", "पूर्ण") },
    { key: "cancelled", label: L("Cancelled", "रद्द", "रद्द") },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={L("Work History", "कार्य इतिहास", "कामाचा इतिहास")}
        subtitle={L("Work you have finished or that was cancelled, with payment and reviews.", "आपका पूरा या रद्द हुआ काम, भुगतान और समीक्षा।", "तुमचे पूर्ण किंवा रद्द झालेले काम, पेमेंट आणि पुनरावलोकन.")}
      />
      {state.loading ? (
        <LoadingCards count={2} />
      ) : state.error ? (
        <ErrorPanel message={L("Could not load your work history.", "कार्य इतिहास लोड नहीं हो सका।", "कामाचा इतिहास लोड करता आला नाही.")} onRetry={state.reload} />
      ) : records.length === 0 ? (
        <EmptyPanel
          message={L("No completed jobs yet.", "अभी तक कोई काम पूरा नहीं हुआ।", "अजून कोणतेही काम पूर्ण झालेले नाही.")}
          hint={L("Finished jobs and their reviews will appear here.", "पूरे किए काम और उनकी समीक्षा यहाँ दिखेगी।", "पूर्ण झालेली कामे आणि त्यांचे पुनरावलोकन येथे दिसेल.")}
          actionHref="/active-work"
          actionLabel={L("Go to active work", "सक्रिय काम देखें", "सक्रिय कामे पहा")}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist">
            {filters.map((f) => (
              <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-medium ${filter === f.key ? "border-[#1f6bff] bg-[#1f6bff] text-white" : "border-[#dde4f0] bg-white text-[#33415f] hover:bg-[#f6f8fc]"}`}>
                {f.label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d5dbe8] bg-white px-6 py-10 text-center text-[14.5px] text-[#5b6a88]">{L("No records in this group.", "इस समूह में कोई रिकॉर्ड नहीं।", "या गटात कोणतीही नोंद नाही.")}</div>
          ) : (
            <div className="space-y-4">
              {visible.map((a) => {
                const done = isCompleted(a);
                const finishedAt = completedAtOf(a);
                return (
                  <article key={a._id} className="rounded-2xl border border-[#e6ecf5] bg-white p-5 shadow-[0_2px_10px_rgba(20,50,110,0.05)] sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 text-[19px] font-semibold text-[#0b1b3d]">{jobTitleOf(a, language)}</h3>
                        <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium ${done ? "border-[#a7e8c8] bg-[#ecfdf5] text-[#047857]" : "border-[#d5dbe8] bg-[#f3f5f9] text-[#5b6a88]"}`}>
                          {done ? <FiCheckCircle size={13} aria-hidden="true" /> : <FiXCircle size={13} aria-hidden="true" />} {statusLabel(a, L)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-[24px] font-bold leading-none text-[#0b1b3d]">{inr(salaryOf(a))}</div>
                        {a.job?.paymentMethod && <div className="mt-1.5 text-[12.5px] text-[#5b6a88]">{paymentMethodLabel(a.job.paymentMethod, language)}</div>}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-x-6 gap-y-2 text-[14px] text-[#33415f] sm:grid-cols-2">
                      <div className="flex items-center gap-2"><FiUser size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span className="truncate">{a.job?.companyName || "—"}</span></div>
                      <div className="flex items-center gap-2"><FiMapPin size={15} className="shrink-0 text-[#e11d48]" aria-hidden="true" /><span className="truncate">{jobLocationOf(a, language) || "—"}</span></div>
                      <div className="flex items-center gap-2"><FiCalendar size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span>{L("Work date", "काम की तिथि", "कामाची तारीख")}: {workDateOf(a, language) || "—"}</span></div>
                      <div className="flex items-center gap-2"><FiCreditCard size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span>{L("Payment", "भुगतान", "पेमेंट")}: {inr(salaryOf(a))}</span></div>
                      {done && finishedAt && <div className="flex items-center gap-2"><FiClock size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span>{L("Completed", "पूरा हुआ", "पूर्ण झाले")}: {new Date(finishedAt).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>}
                    </div>

                    {done ? (
                      <div className="mt-4 rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-5 py-4">
                        <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#5b6a88]">{L("Rating you received", "आपको मिली रेटिंग", "तुम्हाला मिळालेले रेटिंग")}</div>
                        {(a.rating ?? 0) > 0 ? (
                          <>
                            <Stars value={a.rating!} size={18} />
                            {a.review && <p className="m-0 mt-1.5 text-[14px] italic text-[#1f2a44]">&ldquo;<TranslatedText text={a.review} />&rdquo;</p>}
                          </>
                        ) : (
                          <span className="text-[13.5px] text-[#8a96ae]">{L("Not rated yet", "अभी रेटिंग नहीं", "अजून रेटिंग नाही")}</span>
                        )}
                      </div>
                    ) : (
                      a.cancellationReason && <p className="m-0 mt-4 rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-5 py-3 text-[14px] text-[#33415f]">{L("Reason", "कारण", "कारण")}: {a.cancellationReason}</p>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button type="button" onClick={() => setOpen(a)} className="cursor-pointer rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0b1b3d] hover:bg-[#f6f8fc]">{L("View details", "विवरण देखें", "तपशील पहा")}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
      <ApplicationDetailsModal app={openApp} onClose={() => setOpen(null)} />
      {state.dialog}
    </PageContainer>
  );
}