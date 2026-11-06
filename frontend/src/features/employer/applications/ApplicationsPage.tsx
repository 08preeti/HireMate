"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmployerShell from "@/components/layout/EmployerShell";
import { useAuth } from "@/context/AuthContext";
import { useEmployerData } from "@/context/EmployerDataContext";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { markApplicationsSeen } from "@/lib/seenApplications";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cancelApplication, decideApplication, markApplicationReviewed } from "@/services/applications";
import type { Application, Job } from "@/types";
import ApplicationCard from "./ApplicationCard";
import ApplicationDetails from "./ApplicationDetails";
import ApplicationFilters from "./ApplicationFilters";
import ApplicationStats from "./ApplicationStats";
import ApplicationTabs from "./ApplicationTabs";
import ApplicationsError from "./ApplicationsError";
import ApplicationsHeader from "./ApplicationsHeader";
import EmptyApplications from "./EmptyApplications";
import LoadingApplications from "./LoadingApplications";
import {
  DEFAULT_FILTERS,
  TAB_LABEL,
  exportApplicationsCsv,
  filterApplications,
  parseTab,
  stageOf,
  statusEnglish,
  type ApplicationFilterState,
  type TabKey,
} from "./helpers";

function ApplicationsContent() {
  const { tr, trp, loc } = useEmployerT();
  const { employer } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { applications, loading, error, refresh, viewedIds, markViewed, stageCounts } = useEmployerData();

  const tab = parseTab(params.get("tab"));
  const [filters, setFilters] = useState<ApplicationFilterState>(() => ({ ...DEFAULT_FILTERS, jobId: params.get("job") ?? "all" }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const actionRunning = useRef(false);

  useEffect(() => {
    void refresh({ maxAgeMs: 10_000 });
  }, [refresh]);

  useEffect(() => {
    if (!loading && !error) markApplicationsSeen(employer?._id, applications.length);
  }, [loading, error, applications.length, employer?._id]);

  const jobs = useMemo(() => {
    const map = new Map<string, Job>();
    applications.forEach((a) => {
      if (a.job) map.set(a.job._id, a.job);
    });
    return [...map.values()];
  }, [applications]);

  const filtered = useMemo(
    () => filterApplications(applications, tab, filters, viewedIds, (a) => loc(a.job?.jobTitle)),
    [applications, tab, filters, viewedIds, loc],
  );

  const selected = selectedId ? applications.find((a) => a._id === selectedId) : undefined;
  const activeNow = stageCounts.active;

  const changeTab = (next: TabKey) => router.replace(next === "all" ? "/applications" : `/applications?tab=${next}`, { scroll: false });

  const openDetails = (id: string) => {
    setActionError("");
    setSelectedId(id);
    markViewed(id);
    const opened = applications.find((a) => a._id === id);
    if (opened && (!opened.status || opened.status === "pending") && !opened.timeline?.some((t) => t.event === "reviewed")) {
      markApplicationReviewed(id)
        .then(() => refresh({ force: true }))
        .catch(() => undefined);
    }
  };
  const closeDetails = useCallback(() => setSelectedId(null), []);

  const reload = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refresh({ force: true });
    setRefreshing(false);
  }, [refresh, refreshing]);

  // One change at a time: the buttons are disabled while it runs, and the ref covers a double tap before React re-renders.
  const runAction = async (id: string, action: () => Promise<unknown>, failure: EmployerKey) => {
    if (actionRunning.current) return;
    actionRunning.current = true;
    setBusyId(id);
    setActionError("");
    try {
      await action();
    } catch (err) {
      console.error(err);
      setActionError(tr(failure));
    } finally {
      await refresh({ force: true }); // shows the new status, or the real one if it was already decided
      actionRunning.current = false;
      setBusyId(null);
    }
  };

  const decide = (id: string, decision: "accepted" | "declined") => runAction(id, () => decideApplication(id, decision), "failedDecision");
  const askDecide = (id: string, decision: "accepted" | "declined") => (decision === "declined" ? setDeclineId(id) : void decide(id, decision));
  const cancel = (id: string) => runAction(id, () => cancelApplication(id), "failedCancel");

  const exportCsv = () => exportApplicationsCsv(applications, statusEnglish);

  const showInitialLoading = loading && applications.length === 0;
  const showError = error && applications.length === 0;
  const hasFilters = filters.query !== "" || filters.jobId !== "all" || filters.distance !== "any";

  let list: ReactNode;
  if (showInitialLoading) list = <LoadingApplications />;
  else if (showError) list = <ApplicationsError onRetry={() => void reload()} />;
  else if (applications.length === 0) list = <EmptyApplications variant="none" />;
  else if (filtered.length === 0)
    list = hasFilters ? (
      <EmptyApplications variant="filtered" onClearFilters={() => setFilters(DEFAULT_FILTERS)} />
    ) : (
      <EmptyApplications variant="tab" tabLabel={tr(TAB_LABEL[tab])} />
    );
  else
    list = (
      <>
        <p className="m-0 mb-3 text-[13px] font-semibold text-slate-500">{trp("results", filtered.length)}</p>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((a: Application) => (
            <ApplicationCard
              key={a._id}
              application={a}
              stage={stageOf(a, viewedIds)}
              busy={busyId === a._id}
              onOpen={() => openDetails(a._id)}
              onDecide={(decision) => askDecide(a._id, decision)}
            />
          ))}
        </div>
      </>
    );

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">
      <ApplicationsHeader total={applications.length} activeNow={activeNow} refreshing={refreshing} onRefresh={() => void reload()} onExport={exportCsv} />
      <ApplicationStats counts={stageCounts} />
      <ApplicationTabs active={tab} total={applications.length} counts={stageCounts} onChange={changeTab} />
      <ApplicationFilters filters={filters} jobs={jobs} onChange={setFilters} />
      {list}

      {selected && (
        <ApplicationDetails
          application={selected}
          stage={stageOf(selected, viewedIds)}
          jobApplications={applications.filter((a) => a.job?._id === selected.job?._id)}
          busy={busyId === selected._id}
          error={actionError}
          onClose={closeDetails}
          onDecide={(decision) => askDecide(selected._id, decision)}
          onCancel={() => void cancel(selected._id)}
          onRated={() => void refresh({ force: true })}
        />
      )}
      <ConfirmDialog
        open={declineId !== null}
        danger
        busy={busyId !== null}
        title={tr("declineAskTitle")}
        message={tr("declineAskMsg")}
        confirmLabel={tr("declineBtn")}
        cancelLabel={tr("cancelKeep")}
        onCancel={() => setDeclineId(null)}
        onConfirm={() => {
          const id = declineId;
          setDeclineId(null);
          if (id) void decide(id, "declined");
        }}
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <EmployerShell>
      <Suspense fallback={<div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6"><LoadingApplications /></div>}>
        <ApplicationsContent />
      </Suspense>
    </EmployerShell>
  );
}
