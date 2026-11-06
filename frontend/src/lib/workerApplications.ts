import type { Application, Language, TimelineEntry, TimelineEventName } from "@/types";

export type ApplicationGroup = "pending" | "offers" | "confirmed" | "declined" | "withdrawn" | "completed";

export const ACTIVE_STATUSES = ["confirmed", "on_the_way", "arrived"] as const;
const WITHDRAWABLE = ["pending", "accepted", "confirmed"];

export const isCompleted = (a: Application): boolean => !!a.isCompleted || a.status === "completed";

export function groupOf(a: Application): ApplicationGroup {
  if (isCompleted(a)) return "completed";
  switch (a.status) {
    case "accepted":
      return "offers";
    case "confirmed":
    case "on_the_way":
    case "arrived":
      return "confirmed";
    case "declined":
    case "rejected":
      return "declined";
    case "withdrawn":
    case "cancelled":
      return "withdrawn";
    default:
      return "pending";
  }
}

export const isActiveWork = (a: Application): boolean => groupOf(a) === "confirmed";
export const isOffer = (a: Application): boolean => groupOf(a) === "offers";
export const isPending = (a: Application): boolean => groupOf(a) === "pending";

/** Mirrors the server rule: only a pending application, an offer or a confirmed job not yet started can be withdrawn. */
export const canWithdraw = (a: Application): boolean => !isCompleted(a) && WITHDRAWABLE.includes(a.status ?? "pending");

export const salaryOf = (a: Application): number => {
  const n = Number(String(a.job?.salary ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const inr = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

export const timeOf = (iso?: string): number => (iso ? new Date(iso).getTime() : 0);

export const dateOf = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

export const jobTitleOf = (a: Application, language: Language): string =>
  a.job?.jobTitle?.[language] || a.job?.jobTitle?.en || "";

export const jobLocationOf = (a: Application, language: Language): string =>
  a.job?.location?.[language] || a.job?.location?.en || "";

/** Newest activity first. */
export const byLatest = (a: Application, b: Application): number =>
  timeOf(b.updatedAt || b.createdAt) - timeOf(a.updatedAt || a.createdAt);

export const GROUP_STYLE: Record<ApplicationGroup, { badge: string; dot: string; bar: string }> = {
  pending: { badge: "border-[#fcd9a1] bg-[#fff7e8] text-[#b45309]", dot: "bg-[#f59e0b]", bar: "bg-[#f59e0b]" },
  offers: { badge: "border-[#bcd3ff] bg-[#eaf1ff] text-[#1a4fc4]", dot: "bg-[#1f6bff]", bar: "bg-[#1f6bff]" },
  confirmed: { badge: "border-[#a7e8c8] bg-[#ecfdf5] text-[#047857]", dot: "bg-[#10b981]", bar: "bg-[#10b981]" },
  declined: { badge: "border-[#f6c1c9] bg-[#fff1f3] text-[#b4233a]", dot: "bg-[#d6203a]", bar: "bg-[#d6203a]" },
  withdrawn: { badge: "border-[#d5dbe8] bg-[#f3f5f9] text-[#5b6a88]", dot: "bg-[#8a96ae]", bar: "bg-[#8a96ae]" },
  completed: { badge: "border-[#a7e8c8] bg-[#ecfdf5] text-[#047857]", dot: "bg-[#10b981]", bar: "bg-[#10b981]" },
};

type LFn = (en: string, hi: string, mr: string) => string;

/** Human-readable current status of an application. */
export function statusLabel(a: Application, L: LFn): string {
  if (isCompleted(a)) return L("Completed", "पूर्ण", "पूर्ण");
  switch (a.status) {
    case "accepted":
      return L("Offer received", "ऑफर मिला", "ऑफर मिळाली");
    case "confirmed":
      return L("Confirmed", "पक्का", "निश्चित");
    case "on_the_way":
      return L("On the way", "रास्ते में", "मार्गावर");
    case "arrived":
      return L("Arrived on site", "पहुँच गए", "पोहोचला");
    case "declined":
      return L("Declined by employer", "नियोक्ता ने अस्वीकार किया", "मालकाने नाकारले");
    case "rejected":
      return L("Offer rejected by you", "आपने ऑफर अस्वीकार किया", "तुम्ही ऑफर नाकारली");
    case "withdrawn":
      return L("Withdrawn by you", "आपने वापस लिया", "तुम्ही मागे घेतले");
    case "cancelled":
      return L("Cancelled by employer", "नियोक्ता ने रद्द किया", "मालकाने रद्द केले");
    default:
      return L("Pending review", "समीक्षा लंबित", "पुनरावलोकन प्रलंबित");
  }
}

export function splitSkills(text?: string): string[] {
  return (text || "")
    .split(/[,،;、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Stored events only; an application created before timelines existed still shows its real submit time. */
export function timelineOf(a: Application): TimelineEntry[] {
  if (a.timeline?.length) return a.timeline;
  return a.createdAt ? [{ event: "submitted", at: a.createdAt, by: "worker" }] : [];
}

export const offerDateOf = (a: Application): string | undefined => a.timeline?.find((t) => t.event === "accepted")?.at;

export function timelineLabel(event: TimelineEventName, L: LFn): string {
  switch (event) {
    case "submitted":
      return L("Application submitted", "आवेदन जमा किया", "अर्ज सादर केला");
    case "reviewed":
      return L("Employer reviewed your application", "नियोक्ता ने आपका आवेदन देखा", "मालकाने तुमचा अर्ज पाहिला");
    case "accepted":
      return L("Employer accepted - offer received", "नियोक्ता ने स्वीकार किया - ऑफर मिला", "मालकाने स्वीकारले - ऑफर मिळाली");
    case "declined":
      return L("Employer declined your application", "नियोक्ता ने आवेदन अस्वीकार किया", "मालकाने अर्ज नाकारला");
    case "confirmed":
      return L("You accepted the offer - work confirmed", "आपने ऑफर स्वीकार की - काम पक्का", "तुम्ही ऑफर स्वीकारली - काम निश्चित");
    case "rejected":
      return L("You rejected the offer", "आपने ऑफर अस्वीकार किया", "तुम्ही ऑफर नाकारली");
    case "withdrawn":
      return L("You withdrew your application", "आपने आवेदन वापस लिया", "तुम्ही अर्ज मागे घेतला");
    case "cancelled":
      return L("Employer cancelled the job", "नियोक्ता ने काम रद्द किया", "मालकाने काम रद्द केले");
    case "on_the_way":
      return L("You marked on the way", "आपने रास्ते में बताया", "तुम्ही मार्गावर असल्याचे नोंदवले");
    case "arrived":
      return L("You marked arrived", "आपने पहुंचना बताया", "तुम्ही पोहोचल्याचे नोंदवले");
    default:
      return L("Job completed", "काम पूरा हुआ", "काम पूर्ण झाले");
  }
}
