"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiChevronRight, FiMapPin } from "react-icons/fi";
import { targetFor } from "@/components/notifications/NotificationBell";
import { CARD, ErrorPanel, PageContainer, SectionCard, Stars } from "@/components/worker/WorkerUi";
import { useAuth } from "@/context/AuthContext";
import { useL } from "@/hooks/useL";
import { localizedNotification } from "@/i18n/notifications";
import { COMPLETION_LABELS, profileCompletion } from "@/lib/profileCompletion";
import { GROUP_STYLE, byLatest, dateOf, groupOf, inr, isActiveWork, isCompleted, isOffer, isPending, jobLocationOf, jobTitleOf, salaryOf, statusLabel } from "@/lib/workerApplications";
import { localizedSkillText, localizedTradeLabel } from "@/i18n/jobLabels";
import { localizedLocation } from "@/i18n/locationLabels";
import { getJobs } from "@/services/jobs";
import { getNotifications, markNotificationRead } from "@/services/notifications";
import type { AppNotification, Application, Job } from "@/types";
import { useWorkerApplications } from "./useApplicationActions";

const PREVIEW = 3;

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-busy="true">
      <div className="h-14 rounded-xl bg-[#eef2f9]" />
      <div className="h-14 rounded-xl bg-[#f3f6fb]" />
    </div>
  );
}

function Empty({ text, href, label }: { text: string; href?: string; label?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#d6deec] px-4 py-6 text-center text-[14px] text-[#5b6a88]">
      <p className="m-0">{text}</p>
      {href && label && (
        <Link href={href} className="mt-2 inline-block font-semibold text-[#1a4fc4] no-underline hover:underline">
          {label}
        </Link>
      )}
    </div>
  );
}

function Row({ href, title, sub, right, badge }: { href: string; title: string; sub?: string; right?: ReactNode; badge?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f7] px-4 py-3 text-inherit no-underline hover:bg-[#f6f9ff]">
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-[#0b1b3d]">{title}</span>
        {sub && <span className="mt-0.5 block truncate text-[13px] text-[#5b6a88]">{sub}</span>}
        {badge}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-[14px] font-semibold text-[#0b1b3d]">
        {right}
        <FiChevronRight size={16} className="text-[#8a96ae]" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function WorkerDashboard() {
  const { worker } = useAuth();
  const { L, language } = useL();
  const router = useRouter();
  const state = useWorkerApplications();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsState, setJobsState] = useState<"loading" | "error" | "ready">("loading");
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [notesState, setNotesState] = useState<"loading" | "error" | "ready">("loading");

  const loadJobs = () => {
    setJobsState("loading");
    getJobs()
      .then((d) => {
        setJobs(Array.isArray(d) ? d : []);
        setJobsState("ready");
      })
      .catch(() => setJobsState("error"));
  };
  const loadNotes = () => {
    setNotesState("loading");
    getNotifications("all", 1, 5)
      .then((d) => {
        setNotes(d.notifications);
        setNotesState("ready");
      })
      .catch(() => setNotesState("error"));
  };

  useEffect(() => {
    loadJobs();
    loadNotes();
  }, []);

  const { percent, items } = profileCompletion(worker);
  const missing = items.filter((i) => !i.done);

  const sections = useMemo(() => {
    const sorted = [...state.apps].sort(byLatest);
    return {
      pending: sorted.filter(isPending),
      offers: sorted.filter(isOffer),
      active: sorted.filter(isActiveWork),
      completed: sorted.filter(isCompleted),
    };
  }, [state.apps]);

  const openJobs = useMemo(() => {
    const applied = new Set(state.apps.map((a) => a.job?._id).filter(Boolean));
    return jobs.filter((j) => !applied.has(j._id) && (j.availablePositions ?? 1) > 0);
  }, [jobs, state.apps]);

  const appRow = (a: Application, href: string) => {
    const style = GROUP_STYLE[groupOf(a)];
    return (
      <Row
        key={a._id}
        href={href}
        title={jobTitleOf(a, language)}
        sub={[a.job?.companyName, jobLocationOf(a, language)].filter(Boolean).join(" • ")}
        right={<span>{inr(salaryOf(a))}</span>}
        badge={<span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${style.badge}`}>{statusLabel(a, L)}</span>}
      />
    );
  };

  const appSection = (list: Application[], href: string, emptyText: string, emptyHref?: string, emptyLabel?: string) => {
    if (state.loading) return <Skeleton />;
    if (state.error) return <Empty text={L("Could not load.", "लोड नहीं हो सका।", "लोड करता आले नाही.")} />;
    if (list.length === 0) return <Empty text={emptyText} href={emptyHref} label={emptyLabel} />;
    return <div className="space-y-2.5">{list.slice(0, PREVIEW).map((a) => appRow(a, href))}</div>;
  };

  const openNote = (n: AppNotification) => {
    if (!n.isRead) {
      setNotes((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      markNotificationRead(n._id).catch(() => {});
    }
    router.push(targetFor("worker", n));
  };

  const viewAll = L("View all", "सभी देखें", "सर्व पहा");
  const greeting = L("Namaste", "नमस्ते", "नमस्कार");

  return (
    <PageContainer>
      <section className={`${CARD} flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div className="min-w-0">
          <p className="m-0 text-[14px] font-medium text-[#5b6a88]">{greeting},</p>
          <h1 className="m-0 mt-1 truncate text-[26px] font-bold tracking-tight text-[#0b1b3d] sm:text-[30px]">{worker?.name}</h1>
          <p className="mb-0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[#5b6a88]">
            {worker?.skills && <span>{localizedSkillText(worker.skills, language)}</span>}
            {worker?.location && <span className="inline-flex items-center gap-1.5"><FiMapPin size={14} className="text-[#e11d48]" aria-hidden="true" />{localizedLocation(worker.location, language)}</span>}
            {(Number(worker?.rating) > 0) && <span className="inline-flex items-center gap-1.5"><Stars value={Number(worker?.rating)} size={14} />{Number(worker?.rating).toFixed(1)}</span>}
          </p>
        </div>
        <Link href="/jobs" className="rounded-xl bg-[#1f6bff] px-5 py-3 text-[14.5px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(31,107,255,0.3)] hover:bg-[#1859d6]">
          {L("Find jobs", "काम खोजें", "कामे शोधा")}
        </Link>
      </section>

      <SectionCard title={L("Profile completion", "प्रोफ़ाइल पूर्णता", "प्रोफाइल पूर्णता")} href="/worker-profile" linkLabel={percent === 100 ? L("View profile", "प्रोफ़ाइल देखें", "प्रोफाइल पहा") : L("Complete profile", "प्रोफ़ाइल पूरी करें", "प्रोफाइल पूर्ण करा")}>
        <div className="flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e6ecf5]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#1f6bff]" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-[16px] font-bold text-[#0b1b3d]">{percent}%</span>
        </div>
        {missing.length > 0 ? (
          <p className="mb-0 mt-3 text-[13.5px] text-[#5b6a88]">
            {L("Still missing: ", "बाकी: ", "बाकी: ")}
            {missing.map((m) => ((c) => L(c[0], c[1], c[2]))(COMPLETION_LABELS[m.key])).join(", ")}
          </p>
        ) : (
          <p className="mb-0 mt-3 flex items-center gap-2 text-[13.5px] font-medium text-[#047857]"><FiCheckCircle size={15} aria-hidden="true" /> {L("Your profile is complete.", "आपकी प्रोफ़ाइल पूरी है।", "तुमची प्रोफाइल पूर्ण आहे.")}</p>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={L("Available jobs", "उपलब्ध काम", "उपलब्ध कामे")} href="/jobs" linkLabel={viewAll}>
          {jobsState === "loading" ? (
            <Skeleton />
          ) : jobsState === "error" ? (
            <ErrorPanel message={L("Could not load jobs.", "काम लोड नहीं हो सके।", "कामे लोड करता आली नाहीत.")} onRetry={loadJobs} />
          ) : openJobs.length === 0 ? (
            <Empty text={L("No new jobs right now.", "अभी कोई नया काम नहीं।", "सध्या नवीन काम नाही.")} />
          ) : (
            <div className="space-y-2.5">
              {openJobs.slice(0, PREVIEW).map((j) => (
                <Row
                  key={j._id}
                  href={`/jobs/${j._id}`}
                  title={localizedTradeLabel(j.jobTitle?.[language] || j.jobTitle?.en || "", language)}
                  sub={[j.companyName, localizedLocation(j.location, language)].filter(Boolean).join(" • ")}
                  right={<span>{inr(Number(j.salary) || 0)}</span>}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={L("My pending applications", "मेरे लंबित आवेदन", "माझे प्रलंबित अर्ज")} href="/my-applications" linkLabel={viewAll}>
          {appSection(sections.pending, "/my-applications", L("No pending applications.", "कोई लंबित आवेदन नहीं।", "प्रलंबित अर्ज नाही."), "/jobs", L("Find jobs to apply", "आवेदन के लिए काम खोजें", "अर्जासाठी कामे शोधा"))}
        </SectionCard>

        <SectionCard title={L("Received offers", "प्राप्त ऑफर", "मिळालेल्या ऑफर")} href="/job-offers" linkLabel={viewAll}>
          {appSection(sections.offers, "/job-offers", L("No offers waiting for you.", "आपके लिए कोई ऑफर नहीं।", "तुमच्यासाठी ऑफर नाही."))}
        </SectionCard>

        <SectionCard title={L("Active work", "सक्रिय काम", "सक्रिय कामे")} href="/active-work" linkLabel={viewAll}>
          {appSection(sections.active, "/active-work", L("You have no active work.", "आपका कोई सक्रिय काम नहीं।", "तुमचे सक्रिय काम नाही."))}
        </SectionCard>

        <SectionCard title={L("Recently completed", "हाल में पूरे हुए", "अलीकडे पूर्ण झालेले")} href="/work-history" linkLabel={viewAll}>
          {appSection(sections.completed, "/work-history", L("No completed work yet.", "अभी तक कोई काम पूरा नहीं।", "अजून काम पूर्ण नाही."))}
          {sections.completed.length > 0 && <p className="mb-0 mt-3 text-[12.5px] text-[#8a96ae]">{L("Last completed", "अंतिम पूर्ण", "शेवटचे पूर्ण")}: {dateOf(sections.completed[0].updatedAt)}</p>}
        </SectionCard>

        <SectionCard title={L("Recent notifications", "हाल की सूचनाएं", "अलीकडील सूचना")} href="/worker-notifications" linkLabel={viewAll}>
          {notesState === "loading" ? (
            <Skeleton />
          ) : notesState === "error" ? (
            <ErrorPanel message={L("Could not load notifications.", "सूचनाएं लोड नहीं हो सकीं।", "सूचना लोड करता आल्या नाहीत.")} onRetry={loadNotes} />
          ) : notes.length === 0 ? (
            <Empty text={L("No notifications yet.", "अभी कोई सूचना नहीं।", "अजून सूचना नाही.")} />
          ) : (
            <ul className="m-0 list-none space-y-2.5 p-0">
              {notes.slice(0, PREVIEW + 1).map((n) => (
                <li key={n._id}>
                  <button type="button" onClick={() => openNote(n)} className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-[#edf1f7] bg-white px-4 py-3 text-left hover:bg-[#f6f9ff]">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-[#1f6bff]"}`} aria-label={n.isRead ? undefined : L("Unread", "अपठित", "न वाचलेले")} />
                    <span className="min-w-0">
                      <span className={`block truncate text-[14.5px] text-[#0b1b3d] ${n.isRead ? "font-medium" : "font-bold"}`}>{localizedNotification(n, language).title}</span>
                      <span className="mt-0.5 line-clamp-1 block text-[13px] text-[#5b6a88]">{localizedNotification(n, language).message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

    </PageContainer>
  );
}
