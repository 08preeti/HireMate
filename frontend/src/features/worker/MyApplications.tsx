"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiSearch } from "react-icons/fi";
import { EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { byLatest, groupOf, jobTitleOf, type ApplicationGroup } from "@/lib/workerApplications";
import ApplicationCard from "./applications/ApplicationCard";
import ApplicationDetailsModal from "./applications/ApplicationDetailsModal";
import { useWorkerApplications } from "./useApplicationActions";
import type { Application } from "@/types";

type TabKey = Exclude<ApplicationGroup, "completed">;
const TAB_ORDER: TabKey[] = ["pending", "offers", "confirmed", "declined", "withdrawn"];

export default function MyApplications() {
  const { L, language } = useL();
  const state = useWorkerApplications();
  const [tab, setTab] = useState<TabKey>("pending");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Application | null>(null);

  const tabs: Record<TabKey, string> = {
    pending: L("Pending", "लंबित", "प्रलंबित"),
    offers: L("Accepted / Offers", "स्वीकृत / ऑफर", "स्वीकृत / ऑफर"),
    confirmed: L("Confirmed", "पक्का", "निश्चित"),
    declined: L("Declined / Rejected", "अस्वीकृत", "नाकारलेले"),
    withdrawn: L("Withdrawn / Cancelled", "वापस / रद्द", "मागे घेतलेले / रद्द"),
  };

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { pending: 0, offers: 0, confirmed: 0, declined: 0, withdrawn: 0 };
    state.apps.forEach((a) => {
      const g = groupOf(a);
      if (g !== "completed") c[g] += 1;
    });
    return c;
  }, [state.apps]);

  const completedCount = state.apps.filter((a) => groupOf(a) === "completed").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.apps
      .filter((a) => groupOf(a) === tab)
      .filter((a) => !q || jobTitleOf(a, language).toLowerCase().includes(q) || (a.job?.companyName || "").toLowerCase().includes(q))
      .sort(byLatest);
  }, [state.apps, tab, query, language]);

  return (
    <PageContainer>
      <PageHeader
        title={L("My Applications", "मेरे आवेदन", "माझे अर्ज")}
        subtitle={L("Track every job you applied for and what happened next.", "आपने जिन कामों के लिए आवेदन किया उनकी स्थिति देखें।", "तुम्ही अर्ज केलेल्या कामांची स्थिती पहा.")}
        action={
          <Link href="/jobs" className="rounded-xl bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(31,107,255,0.3)] hover:bg-[#1859d6]">
            {L("Find jobs", "काम खोजें", "कामे शोधा")}
          </Link>
        }
      />

      {state.loading ? (
        <LoadingCards />
      ) : state.error ? (
        <ErrorPanel message={L("Could not load your applications.", "आपके आवेदन लोड नहीं हो सके।", "तुमचे अर्ज लोड करता आले नाहीत.")} onRetry={state.reload} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ecf5]">
            <div role="tablist" className="-mb-px flex flex-wrap gap-1">
              {TAB_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`cursor-pointer rounded-t-lg px-4 py-3 text-[14.5px] ${tab === key ? "bg-[#e6efff] font-semibold text-[#1a4fc4]" : "font-medium text-[#33415f] hover:text-[#1a4fc4]"}`}
                >
                  {tabs[key]} ({counts[key]})
                </button>
              ))}
            </div>
            <label className="mb-2 flex items-center gap-2 rounded-lg border border-[#dde4f0] bg-white px-3 py-2 focus-within:border-[#1f6bff]">
              <FiSearch size={15} className="text-[#8a96ae]" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L("Search by job or employer", "काम या नियोक्ता खोजें", "काम किंवा मालक शोधा")} aria-label={L("Search applications", "आवेदन खोजें", "अर्ज शोधा")} className="w-[200px] bg-transparent text-[14px] outline-none placeholder:text-[#8a96ae]" />
            </label>
          </div>

          {visible.length === 0 ? (
            <EmptyPanel
              message={query ? L("No applications match your search.", "खोज से कोई आवेदन नहीं मिला।", "शोधाशी जुळणारा अर्ज नाही.") : L("Nothing here yet.", "यहाँ अभी कुछ नहीं है।", "येथे अजून काही नाही.")}
              hint={tab === "pending" && !query ? L("Apply for jobs to see them here.", "काम के लिए आवेदन करें, वे यहाँ दिखेंगे।", "कामांसाठी अर्ज करा, ते येथे दिसतील.") : undefined}
              actionHref={tab === "pending" && !query ? "/jobs" : undefined}
              actionLabel={L("Find jobs", "काम खोजें", "कामे शोधा")}
            />
          ) : (
            <div className="space-y-4">
              {visible.map((a) => (
                <ApplicationCard key={a._id} app={a} actions={state} onOpen={setOpen} />
              ))}
            </div>
          )}

          {completedCount > 0 && (
            <p className="text-center text-[13.5px] text-[#5b6a88]">
              {L(`${completedCount} completed job(s) are in `, `${completedCount} पूर्ण काम यहाँ हैं: `, `${completedCount} पूर्ण कामे येथे आहेत: `)}
              <Link href="/work-history" className="font-semibold text-[#1a4fc4] no-underline hover:underline">{L("Work History", "कार्य इतिहास", "कामाचा इतिहास")}</Link>
            </p>
          )}
        </>
      )}

      <ApplicationDetailsModal app={open} onClose={() => setOpen(null)} />
      {state.dialog}
    </PageContainer>
  );
}
