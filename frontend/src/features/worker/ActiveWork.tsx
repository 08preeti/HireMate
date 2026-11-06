"use client";

import { useMemo, useState } from "react";
import { EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { byLatest, isActiveWork } from "@/lib/workerApplications";
import ApplicationCard from "./applications/ApplicationCard";
import ApplicationDetailsModal from "./applications/ApplicationDetailsModal";
import { useWorkerApplications } from "./useApplicationActions";
import type { Application } from "@/types";

export default function ActiveWork() {
  const { L } = useL();
  const state = useWorkerApplications();
  const [open, setOpen] = useState<Application | null>(null);
  const active = useMemo(() => state.apps.filter(isActiveWork).sort(byLatest), [state.apps]);

  return (
    <PageContainer>
      <PageHeader
        title={L("Active Work", "सक्रिय काम", "सक्रिय कामे")}
        subtitle={L("Jobs you have confirmed and are currently doing.", "वे काम जो आपने पक्के किए हैं और कर रहे हैं।", "तुम्ही निश्चित केलेली आणि करत असलेली कामे.")}
      />
      {state.loading ? (
        <LoadingCards count={2} />
      ) : state.error ? (
        <ErrorPanel message={L("Could not load your active work.", "सक्रिय काम लोड नहीं हो सका।", "सक्रिय कामे लोड करता आली नाहीत.")} onRetry={state.reload} />
      ) : active.length === 0 ? (
        <EmptyPanel
          message={L("You have no active work right now.", "अभी आपका कोई सक्रिय काम नहीं है।", "सध्या तुमचे कोणतेही सक्रिय काम नाही.")}
          hint={L("Confirm a job offer to start working.", "काम शुरू करने के लिए ऑफर पक्का करें।", "काम सुरू करण्यासाठी ऑफर निश्चित करा.")}
          actionHref="/job-offers"
          actionLabel={L("View job offers", "जॉब ऑफर देखें", "जॉब ऑफर पहा")}
        />
      ) : (
        <div className="space-y-4">
          {active.map((a) => (
            <ApplicationCard key={a._id} app={a} actions={state} onOpen={setOpen} />
          ))}
        </div>
      )}
      <ApplicationDetailsModal app={open} onClose={() => setOpen(null)} />
      {state.dialog}
    </PageContainer>
  );
}
