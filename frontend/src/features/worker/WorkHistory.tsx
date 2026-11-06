"use client";

import { useMemo } from "react";
import { FiCalendar, FiCheckCircle, FiCreditCard, FiMapPin, FiUser } from "react-icons/fi";
import { EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader, Stars } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { byLatest, dateOf, inr, isCompleted, jobLocationOf, jobTitleOf, salaryOf } from "@/lib/workerApplications";
import { useWorkerApplications } from "./useApplicationActions";

export default function WorkHistory() {
  const { L, language } = useL();
  const state = useWorkerApplications();
  const done = useMemo(() => state.apps.filter(isCompleted).sort(byLatest), [state.apps]);

  return (
    <PageContainer>
      <PageHeader
        title={L("Work History", "कार्य इतिहास", "कामाचा इतिहास")}
        subtitle={L("Jobs you have completed, with payment and employer reviews.", "आपके पूरे किए गए काम, भुगतान और नियोक्ता समीक्षा।", "तुम्ही पूर्ण केलेली कामे, पेमेंट आणि मालकांचे पुनरावलोकन.")}
      />
      {state.loading ? (
        <LoadingCards count={2} />
      ) : state.error ? (
        <ErrorPanel message={L("Could not load your work history.", "कार्य इतिहास लोड नहीं हो सका।", "कामाचा इतिहास लोड करता आला नाही.")} onRetry={state.reload} />
      ) : done.length === 0 ? (
        <EmptyPanel
          message={L("No completed jobs yet.", "अभी तक कोई काम पूरा नहीं हुआ।", "अजून कोणतेही काम पूर्ण झालेले नाही.")}
          hint={L("Finished jobs and their reviews will appear here.", "पूरे किए काम और उनकी समीक्षा यहाँ दिखेगी।", "पूर्ण झालेली कामे आणि त्यांचे पुनरावलोकन येथे दिसेल.")}
          actionHref="/active-work"
          actionLabel={L("Go to active work", "सक्रिय काम देखें", "सक्रिय कामे पहा")}
        />
      ) : (
        <div className="space-y-4">
          {done.map((a) => (
            <article key={a._id} className="rounded-2xl border border-[#e6ecf5] bg-white p-5 shadow-[0_2px_10px_rgba(20,50,110,0.05)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="m-0 text-[19px] font-semibold text-[#0b1b3d]">{jobTitleOf(a, language)}</h3>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#a7e8c8] bg-[#ecfdf5] px-3 py-1 text-[12.5px] font-medium text-[#047857]">
                    <FiCheckCircle size={13} aria-hidden="true" /> {L("Completed", "पूर्ण", "पूर्ण")}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[24px] font-bold leading-none text-[#0b1b3d]">{inr(salaryOf(a))}</div>
                  {a.job?.paymentMethod && <div className="mt-1.5 text-[12.5px] text-[#5b6a88]">{a.job.paymentMethod}</div>}
                </div>
              </div>

              <div className="mt-4 grid gap-x-6 gap-y-2 text-[14px] text-[#33415f] sm:grid-cols-2">
                <div className="flex items-center gap-2"><FiUser size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span className="truncate">{a.job?.companyName || "—"}</span></div>
                <div className="flex items-center gap-2"><FiMapPin size={15} className="shrink-0 text-[#e11d48]" aria-hidden="true" /><span className="truncate">{jobLocationOf(a, language) || "—"}</span></div>
                <div className="flex items-center gap-2"><FiCalendar size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span>{L("Work date", "काम की तिथि", "कामाची तारीख")}: {dateOf(a.updatedAt || a.createdAt) || "—"}</span></div>
                <div className="flex items-center gap-2"><FiCreditCard size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><span>{L("Payment", "भुगतान", "पेमेंट")}: {inr(salaryOf(a))}</span></div>
              </div>

              <div className="mt-4 rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-5 py-4">
                {(a.rating ?? 0) > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars value={a.rating!} size={18} />
                    {a.review && <p className="m-0 min-w-0 flex-1 text-[14.5px] italic text-[#1f2a44]">&ldquo;{a.review}&rdquo;</p>}
                  </div>
                ) : (
                  <span className="text-[13.5px] text-[#8a96ae]">{L("No rating or review yet", "अभी कोई रेटिंग या समीक्षा नहीं", "अजून रेटिंग किंवा पुनरावलोकन नाही")}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {state.dialog}
    </PageContainer>
  );
}
