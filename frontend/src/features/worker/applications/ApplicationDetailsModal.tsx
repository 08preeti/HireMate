"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import ApplicationTimeline from "@/components/ui/ApplicationTimeline";
import { Stars } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { GROUP_STYLE, dateOf, groupOf, inr, jobLocationOf, jobTitleOf, offerDateOf, salaryOf, statusLabel, timelineLabel, timelineOf } from "@/lib/workerApplications";
import type { Application } from "@/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-[#edf1f7] py-2.5 text-[14px] last:border-b-0">
      <dt className="text-[#5b6a88]">{label}</dt>
      <dd className="m-0 max-w-[65%] text-right font-medium text-[#0b1b3d]">{children}</dd>
    </div>
  );
}

export default function ApplicationDetailsModal({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const { L, language } = useL();

  useEffect(() => {
    if (!app) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [app, onClose]);

  if (!app) return null;
  const style = GROUP_STYLE[groupOf(app)];
  const job = app.job;
  const available = job?.availablePositions;
  const total = job?.vacancies;
  const description = job?.description?.[language] || job?.description?.en;
  const offerDate = offerDateOf(app);

  return (
    <div className="fixed inset-0 z-[9997] flex items-end justify-center bg-[rgba(11,27,61,0.5)] sm:items-center sm:p-5" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="app-detail-title" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-[0_20px_50px_rgba(11,27,61,0.3)] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="app-detail-title" className="m-0 text-[20px] font-bold text-[#0b1b3d]">{jobTitleOf(app, language)}</h2>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium ${style.badge}`}>
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {statusLabel(app, L)}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label={L("Close", "बंद करें", "बंद करा")} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#f3f6fb] text-[#0b1b3d] hover:bg-[#e6ecf5]">
            <FiX size={18} aria-hidden="true" />
          </button>
        </div>

        <dl className="mb-0 mt-4">
          <Row label={L("Employer", "नियोक्ता", "मालक")}>{job?.companyName || "—"}</Row>
          {job?.contactInfo && <Row label={L("Employer phone", "नियोक्ता फ़ोन", "मालक फोन")}><a href={`tel:${job.contactInfo}`} className="text-[#1a4fc4] no-underline">{job.contactInfo}</a></Row>}
          {description && <Row label={L("Job description", "काम का विवरण", "कामाचे वर्णन")}>{description}</Row>}
          <Row label={L("Location", "स्थान", "ठिकाण")}>{jobLocationOf(app, language) || "—"}</Row>
          <Row label={L("Payment", "भुगतान", "पेमेंट")}>{inr(salaryOf(app))}{job?.paymentMethod ? ` • ${job.paymentMethod}` : ""}</Row>
          {job?.dutyTimings && <Row label={L("Work schedule", "काम का समय", "कामाची वेळ")}>{job.dutyTimings}</Row>}
          {offerDate && <Row label={L("Offer received", "ऑफर मिली", "ऑफर मिळाली")}>{dateOf(offerDate)}</Row>}
          {typeof total === "number" && <Row label={L("Vacancies", "रिक्तियां", "जागा")}>{available ?? total} / {total} {L("available", "उपलब्ध", "उपलब्ध")}</Row>}
          <Row label={L("Applied on", "आवेदन तिथि", "अर्जाची तारीख")}>{dateOf(app.createdAt) || "—"}</Row>
          <Row label={L("Last updated", "अंतिम अपडेट", "शेवटचा बदल")}>{dateOf(app.updatedAt) || "—"}</Row>
          {app.message && <Row label={L("Your message", "आपका संदेश", "तुमचा संदेश")}>{app.message}</Row>}
          {(app.rating ?? 0) > 0 && <Row label={L("Employer rating", "नियोक्ता रेटिंग", "मालक रेटिंग")}><Stars value={app.rating!} /></Row>}
          {app.review && <Row label={L("Review", "समीक्षा", "पुनरावलोकन")}>{app.review}</Row>}
        </dl>

        <h3 className="mb-3 mt-5 text-[12.5px] font-bold uppercase tracking-wider text-[#5b6a88]">{L("Application timeline", "आवेदन की समयरेखा", "अर्जाची टाइमलाइन")}</h3>
        <ApplicationTimeline
          locale={language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-GB"}
          rows={timelineOf(app).map((t, i) => ({ key: `${t.event}-${i}`, label: timelineLabel(t.event, L), at: t.at, tone: t.event }))}
        />

        {!job?.contactInfo && (app.status ?? "pending") === "pending" && (
          <p className="mb-0 mt-3 text-[12.5px] text-[#5b6a88]">{L("The employer's phone number is shown once they accept your application.", "नियोक्ता के स्वीकार करने पर उनका फ़ोन नंबर दिखेगा।", "मालकाने स्वीकारल्यावर त्यांचा फोन नंबर दिसेल.")}</p>
        )}

        {job?._id && (
          <Link href={`/jobs/${job._id}`} className="mt-5 block rounded-xl bg-[#0b2a5c] py-3 text-center text-[14px] font-semibold text-white no-underline hover:bg-[#0a2350]">
            {L("Open job page", "काम का पेज खोलें", "कामाचे पान उघडा")}
          </Link>
        )}
      </div>
    </div>
  );
}
