"use client";

import { FiAlertCircle, FiCalendar, FiClock, FiCreditCard, FiMapPin, FiUser } from "react-icons/fi";
import { useL } from "@/hooks/useL";
import { GROUP_STYLE, groupOf, inr, isCompletionPending, jobLocationOf, jobTitleOf, mapsUrlOf, salaryOf, scheduleOf, statusLabel, workDateOf } from "@/lib/workerApplications";
import type { Application } from "@/types";
import type { WorkActions } from "./useWorkActions";
import WorkProgress from "./WorkProgress";

interface Props {
  app: Application;
  actions: WorkActions;
  onOpen: (a: Application) => void;
  onEmployer: (a: Application) => void;
}

const PRIMARY = "cursor-pointer rounded-lg bg-[#059669] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY = "cursor-pointer rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0b1b3d] no-underline hover:bg-[#f6f8fc]";

export default function WorkCard({ app, actions, onOpen, onEmployer }: Props) {
  const { L, language } = useL();
  const style = GROUP_STYLE[groupOf(app)];
  const busy = actions.busyId === app._id;
  const mapsUrl = mapsUrlOf(app);
  const pending = isCompletionPending(app);
  const rejection = app.status === "arrived" && !app.completionRequestedAt ? app.completionRejection : undefined;
  const schedule = scheduleOf(app);
  const workDate = workDateOf(app);

  const hint =
    app.status === "confirmed"
      ? L("Next step: tap “I am on the way” when you leave for the job.", "अगला कदम: जब आप काम के लिए निकलें तो “मैं रास्ते में हूँ” दबाएं।", "पुढची पायरी: कामासाठी निघाल्यावर “मी मार्गावर आहे” दाबा.")
      : app.status === "on_the_way"
        ? L("Next step: tap “I have arrived” when you reach the site.", "अगला कदम: साइट पर पहुँचकर “मैं पहुँच गया” दबाएं।", "पुढची पायरी: साइटवर पोहोचल्यावर “मी पोहोचलो” दाबा.")
        : pending
          ? L("Waiting for the employer to confirm your work. You will get a message.", "नियोक्ता की पुष्टि का इंतज़ार है। आपको संदेश मिलेगा।", "मालकाच्या पुष्टीची प्रतीक्षा आहे. तुम्हाला संदेश मिळेल.")
          : L("Next step: when the work is finished, tap “Work is finished”.", "अगला कदम: काम खत्म होने पर “काम पूरा हुआ” दबाएं।", "पुढची पायरी: काम संपल्यावर “काम पूर्ण झाले” दाबा.");

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e6ecf5] bg-white shadow-[0_2px_10px_rgba(20,50,110,0.05)]">
      <div className={`h-[4px] w-full ${style.bar}`} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[19px] font-semibold text-[#0b1b3d]">{jobTitleOf(app, language) || L("Job removed", "काम हटाया गया", "काम काढले")}</h3>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium ${style.badge}`}>
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {statusLabel(app, L)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-bold leading-none text-[#0b1b3d]">{inr(salaryOf(app))}</div>
            {app.job?.paymentMethod && <div className="mt-1.5 text-[12.5px] text-[#5b6a88]">{app.job.paymentMethod}</div>}
          </div>
        </div>

        <dl className="mb-0 mt-4 grid gap-x-6 gap-y-2 text-[14px] text-[#33415f] sm:grid-cols-2">
          <div className="flex items-center gap-2"><FiUser size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Employer", "नियोक्ता", "मालक")}</dt><dd className="m-0 truncate">{app.job?.companyName || "—"}</dd></div>
          <div className="flex items-center gap-2"><FiMapPin size={15} className="shrink-0 text-[#e11d48]" aria-hidden="true" /><dt className="sr-only">{L("Location", "स्थान", "ठिकाण")}</dt><dd className="m-0 truncate">{jobLocationOf(app, language) || "—"}</dd></div>
          <div className="flex items-center gap-2"><FiCalendar size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Work date", "काम की तिथि", "कामाची तारीख")}</dt><dd className="m-0">{workDate || L("Date not set", "तिथि तय नहीं", "तारीख ठरलेली नाही")}</dd></div>
          <div className="flex items-center gap-2"><FiClock size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Schedule", "समय", "वेळ")}</dt><dd className="m-0 truncate">{schedule || L("Schedule not set", "समय तय नहीं", "वेळ ठरलेली नाही")}</dd></div>
          <div className="flex items-center gap-2"><FiCreditCard size={15} className="shrink-0 text-[#5b6a88]" aria-hidden="true" /><dt className="sr-only">{L("Payment", "भुगतान", "पेमेंट")}</dt><dd className="m-0">{inr(salaryOf(app))}{app.job?.paymentMethod ? ` • ${app.job.paymentMethod}` : ""}</dd></div>
        </dl>

        <div className="mt-5 rounded-xl border border-[#edf1f7] bg-[#f8fafd] px-3 py-4 sm:px-5">
          <WorkProgress app={app} />
        </div>

        {rejection && (
          <div role="alert" className="mt-4 flex gap-2.5 rounded-xl border border-[#f6c1c9] bg-[#fff1f3] p-4 text-[14px] text-[#8c1d2e]">
            <FiAlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold">{L("The employer did not accept completion", "नियोक्ता ने पूरा होना स्वीकार नहीं किया", "मालकाने पूर्णत्व स्वीकारले नाही")}</div>
              {rejection.reason && <div className="mt-1">{L("Reason", "कारण", "कारण")}: {rejection.reason}</div>}
              <div className="mt-1 text-[13px]">{L("Finish the remaining work or talk to the employer, then ask again.", "बचा हुआ काम पूरा करें या नियोक्ता से बात करें, फिर दोबारा कहें।", "उरलेले काम पूर्ण करा किंवा मालकाशी बोला, मग पुन्हा विनंती करा.")}</div>
            </div>
          </div>
        )}

        <p className="m-0 mt-4 text-[14px] font-medium text-[#33415f]">{hint}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {app.status === "confirmed" && (
            <button type="button" disabled={busy} onClick={() => actions.markOnTheWay(app)} className={PRIMARY}>{L("I am on the way", "मैं रास्ते में हूँ", "मी मार्गावर आहे")}</button>
          )}
          {(app.status === "confirmed" || app.status === "on_the_way") && (
            <button type="button" disabled={busy} onClick={() => actions.markArrived(app)} className={app.status === "on_the_way" ? PRIMARY : SECONDARY}>{L("I have arrived", "मैं पहुँच गया", "मी पोहोचलो")}</button>
          )}
          {app.status === "arrived" && !pending && (
            <button type="button" disabled={busy} onClick={() => actions.askComplete(app)} className={PRIMARY}>{rejection ? L("Ask again: work is finished", "फिर से कहें: काम पूरा हुआ", "पुन्हा विनंती: काम पूर्ण झाले") : L("Work is finished", "काम पूरा हुआ", "काम पूर्ण झाले")}</button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-[#edf1f7] pt-4">
          {(app.status === "confirmed" || app.status === "on_the_way") && (
            <button type="button" disabled={busy} onClick={() => actions.askCancel(app)} className="cursor-pointer bg-transparent px-2 py-2 text-[14px] font-medium text-[#33415f] hover:text-[#d6203a] disabled:opacity-50">
              {L("Cancel work", "काम रद्द करें", "काम रद्द करा")}
            </button>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>{L("View job location", "काम की जगह देखें", "कामाचे ठिकाण पहा")}</a>
          )}
          <button type="button" onClick={() => onEmployer(app)} className={`${SECONDARY} cursor-pointer`}>{L("Employer details", "नियोक्ता विवरण", "मालकाची माहिती")}</button>
          <button type="button" onClick={() => onOpen(app)} className="cursor-pointer rounded-lg bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1859d6]">{L("Work details", "काम का विवरण", "कामाचा तपशील")}</button>
        </div>
      </div>
    </article>
  );
}
