"use client";

import Link from "next/link";
import { FiCalendar, FiCreditCard, FiMapPin, FiUser } from "react-icons/fi";
import { useL } from "@/hooks/useL";
import { GROUP_STYLE, canWithdraw, dateOf, groupOf, inr, isCompleted, jobLocationOf, jobTitleOf, salaryOf, statusLabel } from "@/lib/workerApplications";
import type { WorkerApplications } from "../useApplicationActions";
import type { Application } from "@/types";

interface Props {
  app: Application;
  actions: Pick<WorkerApplications, "busyId" | "withdraw" | "confirmOffer" | "rejectOffer">;
  onOpen: (a: Application) => void;
}

export default function ApplicationCard({ app, actions, onOpen }: Props) {
  const { L, language } = useL();
  const group = groupOf(app);
  const style = GROUP_STYLE[group];
  const busy = actions.busyId === app._id;
  const title = jobTitleOf(app, language);
  const location = jobLocationOf(app, language);
  const employer = app.job?.companyName;
  const method = app.job?.paymentMethod;

  return (
    <article id={`app-${app._id}`} className="overflow-hidden rounded-2xl border border-[#e6ecf5] bg-white shadow-[0_2px_10px_rgba(20,50,110,0.05)]">
      <div className={`h-[4px] w-full ${style.bar}`} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[19px] font-semibold text-[#0b1b3d]">{title || L("Job removed", "काम हटाया गया", "काम काढले")}</h3>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium ${style.badge}`}>
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {statusLabel(app, L)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-bold leading-none text-[#0b1b3d]">{inr(salaryOf(app))}</div>
            {method && <div className="mt-1.5 text-[12.5px] text-[#5b6a88]">{method}</div>}
          </div>
        </div>

        <dl className="mb-0 mt-4 grid gap-x-6 gap-y-2 text-[14px] text-[#33415f] sm:grid-cols-2">
          <div className="flex items-center gap-2"><FiUser size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Employer", "नियोक्ता", "मालक")}</dt><dd className="m-0 truncate">{employer || "—"}</dd></div>
          <div className="flex items-center gap-2"><FiMapPin size={15} className="shrink-0 text-[#e11d48]" aria-hidden="true" /><dt className="sr-only">{L("Location", "स्थान", "ठिकाण")}</dt><dd className="m-0 truncate">{location || "—"}</dd></div>
          <div className="flex items-center gap-2"><FiCreditCard size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Payment", "भुगतान", "पेमेंट")}</dt><dd className="m-0">{inr(salaryOf(app))}{method ? ` • ${method}` : ""}</dd></div>
          <div className="flex items-center gap-2"><FiCalendar size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Applied on", "आवेदन तिथि", "अर्जाची तारीख")}</dt><dd className="m-0">{L("Applied", "आवेदन", "अर्ज")} {dateOf(app.createdAt) || "—"}</dd></div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-[#edf1f7] pt-4">
          {canWithdraw(app) && group !== "offers" && (
            <button type="button" onClick={() => actions.withdraw(app)} disabled={busy} className="cursor-pointer bg-transparent px-2 py-2 text-[14px] font-medium text-[#33415f] hover:text-[#d6203a] disabled:opacity-50">
              {L("Withdraw", "वापस लें", "मागे घ्या")}
            </button>
          )}
          {group === "offers" && (
            <>
              <button type="button" onClick={() => actions.rejectOffer(app)} disabled={busy} className="cursor-pointer rounded-lg border border-[#f0b4be] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#d6203a] hover:bg-[#fff1f3] disabled:cursor-not-allowed disabled:opacity-50">
                {L("Reject offer", "ऑफर अस्वीकार करें", "ऑफर नाकारा")}
              </button>
              <button type="button" onClick={() => actions.confirmOffer(app)} disabled={busy} className="cursor-pointer rounded-lg bg-[#059669] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50">
                {L("Confirm offer", "ऑफर पक्का करें", "ऑफर निश्चित करा")}
              </button>
            </>
          )}
          {app.job?._id && !isCompleted(app) && (
            <Link href={`/jobs/${app.job._id}`} className="rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0b1b3d] no-underline hover:bg-[#f6f8fc]">
              {L("View job", "काम देखें", "काम पहा")}
            </Link>
          )}
          <button type="button" onClick={() => onOpen(app)} className="cursor-pointer rounded-lg bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1859d6]">
            {L("View details", "विवरण देखें", "तपशील पहा")}
          </button>
        </div>
      </div>
    </article>
  );
}
