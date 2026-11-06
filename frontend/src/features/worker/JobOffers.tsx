"use client";

import { useMemo, useState } from "react";
import { EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { byLatest, isOffer } from "@/lib/workerApplications";
import ApplicationCard from "./applications/ApplicationCard";
import ApplicationDetailsModal from "./applications/ApplicationDetailsModal";
import { useWorkerApplications } from "./useApplicationActions";
import type { Application } from "@/types";

export default function JobOffers() {
  const { L } = useL();
  const state = useWorkerApplications();
  const [open, setOpen] = useState<Application | null>(null);
  const offers = useMemo(() => state.apps.filter(isOffer).sort(byLatest), [state.apps]);

  return (
    <PageContainer>
      <PageHeader
        title={L("Job Offers", "जॉब ऑफर", "जॉब ऑफर")}
        subtitle={L("Employers who accepted your application. Confirm the offer to take the job.", "जिन नियोक्ताओं ने आपका आवेदन स्वीकार किया। काम लेने के लिए ऑफर पक्का करें।", "ज्या मालकांनी तुमचा अर्ज स्वीकारला. काम घेण्यासाठी ऑफर निश्चित करा.")}
      />
      {state.loading ? (
        <LoadingCards count={2} />
      ) : state.error ? (
        <ErrorPanel message={L("Could not load your offers.", "आपके ऑफर लोड नहीं हो सके।", "तुमच्या ऑफर लोड करता आल्या नाहीत.")} onRetry={state.reload} />
      ) : offers.length === 0 ? (
        <EmptyPanel
          message={L("No offers waiting for you.", "आपके लिए कोई ऑफर नहीं है।", "तुमच्यासाठी कोणतीही ऑफर नाही.")}
          hint={L("When an employer accepts your application, the offer appears here.", "जब नियोक्ता आपका आवेदन स्वीकारेगा, ऑफर यहाँ दिखेगा।", "मालकाने अर्ज स्वीकारल्यावर ऑफर येथे दिसेल.")}
          actionHref="/my-applications"
          actionLabel={L("View my applications", "मेरे आवेदन देखें", "माझे अर्ज पहा")}
        />
      ) : (
        <div className="space-y-4">
          {offers.map((a) => (
            <ApplicationCard key={a._id} app={a} actions={state} onOpen={setOpen} />
          ))}
        </div>
      )}
      <ApplicationDetailsModal app={open} onClose={() => setOpen(null)} />
      {state.dialog}
    </PageContainer>
  );
}
