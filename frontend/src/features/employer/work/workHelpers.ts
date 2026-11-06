import type { Application, TimelineEntry, TimelineEventName } from "@/types";

export const ACTIVE_STATUSES = ["confirmed", "on_the_way", "arrived"];

export const isActiveWork = (a: Application) => ACTIVE_STATUSES.includes(a.status ?? "");
export const isDoneWork = (a: Application) => a.status === "completed";
export const hasEvent = (a: Application, event: TimelineEventName) => !!a.timeline?.some((t) => t.event === event);
export const isEndedAfterHire = (a: Application) => (a.status === "cancelled" || a.status === "withdrawn") && hasEvent(a, "confirmed");
export const completionPending = (a: Application) => a.status === "arrived" && !!a.completionRequestedAt;

export const eventAt = (a: Application, event: TimelineEventName): string | undefined => [...(a.timeline ?? [])].reverse().find((t) => t.event === event)?.at;
export const lastEvent = (a: Application): TimelineEntry | undefined => a.timeline?.[a.timeline.length - 1];
export const completedAtOf = (a: Application) => a.completedAt || eventAt(a, "completed");

export const scheduleOf = (a: Application) => a.job?.workSchedule || a.job?.dutyTimings || "";

export const latestFirst = (a: Application, b: Application) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();

export const formatDate = (iso: string | undefined, locale: string, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) })
    : "";

export const workDateOf = (a: Application, locale: string) =>
  a.job?.startDate ? new Date(a.job.startDate).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : formatDate(eventAt(a, "arrived") || eventAt(a, "confirmed"), locale);
