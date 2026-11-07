import { haversine } from "@/lib/geo";
import type { EmployerKey } from "@/i18n/employerText";
import type { Application, Job } from "@/types";

export type Stage = "new" | "review" | "offers" | "confirmed" | "active" | "completed" | "declined";
export type TabKey = "all" | Stage;
export type SortKey = "newest" | "oldest" | "rating" | "wage";

export const STAGES: readonly Stage[] = ["new", "review", "offers", "confirmed", "active", "completed", "declined"];

export const TAB_LABEL: Record<TabKey, EmployerKey> = {
  all: "tab_all",
  new: "tab_new",
  review: "tab_review",
  offers: "tab_offers",
  confirmed: "tab_confirmedW",
  active: "tab_activeW",
  completed: "tab_completedW",
  declined: "tab_declined",
};

export const parseTab = (value: string | null): TabKey =>
  value === "all" || (STAGES as readonly string[]).includes(value ?? "") ? ((value ?? "all") as TabKey) : "all";

/**
 * Where an application sits. The backend statuses are untouched:
 * pending → (new | review) · accepted = offer sent · confirmed · on_the_way / arrived = active · completed (or rated)
 * declined / rejected / withdrawn / cancelled end the application.
 * "new" vs "review" is only whether the employer has opened the application yet.
 */
export const stageOf = (a: Application, viewed: ReadonlySet<string>): Stage => {
  if (a.rating) return "completed";
  switch (a.status) {
    case "declined":
    case "rejected":
    case "withdrawn":
    case "cancelled":
      return "declined";
    case "completed":
      return "completed";
    case "on_the_way":
    case "arrived":
      return "active";
    case "confirmed":
      return "confirmed";
    case "accepted":
      return "offers";
    default:
      return viewed.has(a._id) ? "review" : "new";
  }
};

export const isPending = (a: Application) => !a.status || a.status === "pending";
export const isStaffed = (a: Application) =>
  !!a.rating || ["accepted", "confirmed", "on_the_way", "arrived", "completed"].includes(a.status ?? "");

export const STATUS_LABEL: Record<string, EmployerKey> = {
  pending: "badge_awaiting",
  accepted: "badge_offer",
  confirmed: "badge_confirmed",
  on_the_way: "badge_onTheWay",
  arrived: "badge_arrived",
  completed: "badge_completed",
  declined: "badge_declined",
  rejected: "badge_rejected",
  withdrawn: "badge_withdrawn",
  cancelled: "badge_cancelled",
};

export const statusLabelKey = (a: Application, stage: Stage): EmployerKey => {
  if (a.rating) return "badge_rated";
  if (stage === "new") return "badge_new";
  return STATUS_LABEL[a.status ?? "pending"] ?? "badge_awaiting";
};

const STATUS_ENGLISH: Record<string, string> = {
  pending: "Under Review",
  accepted: "Offer Sent",
  confirmed: "Confirmed",
  on_the_way: "On the way",
  arrived: "Arrived",
  completed: "Ready to Rate",
  declined: "Declined",
  rejected: "Offer rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};
export const statusEnglish = (a: Application) => (a.rating ? "Rated" : (STATUS_ENGLISH[a.status ?? "pending"] ?? "Under Review"));

export const STAGE_TONE: Record<Stage, string> = {
  new: "bg-blue-50 text-blue-700",
  review: "bg-slate-100 text-slate-600",
  offers: "bg-sky-50 text-sky-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  active: "bg-violet-50 text-violet-700",
  completed: "bg-amber-50 text-amber-700",
  declined: "bg-rose-50 text-rose-700",
};

export const nameOf = (a: Application) => a.applicantName || a.worker?.name || "Worker";
export const phoneOf = (a: Application) => a.applicantContact || a.worker?.phone || a.worker?.contact || "";
export const initialsOf = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "W";
export const wageOf = (j?: Job) => Number(j?.salary) || 0;
export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const unitKey = (j?: Job): EmployerKey => (j?.salaryUnit ? (`unit_${j.salaryUnit}` as EmployerKey) : "unit_day");
export const workerRating = (a: Application) => Number(a.worker?.rating) || 0;
export const appCode = (a: Application) => a._id.slice(-6).toUpperCase();
export const skillsOf = (a: Application) =>
  (a.worker?.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const displayPhone = (phone: string) => (/^\+/.test(phone) ? phone : `+91 ${phone}`);
export const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

export const distanceOf = (a: Application): number | null => {
  const c = a.liveLocation;
  if (!c || a.job?.latitude == null || a.job?.longitude == null) return null;
  return haversine(c.lat, c.lng, a.job.latitude, a.job.longitude);
};

export const appliedLabel = (
  iso: string | undefined,
  tr: (key: EmployerKey, vars?: Record<string, string | number>) => string,
  locale: string,
) => {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? tr("appliedToday", { time })
    : tr("appliedOn", { date: d.toLocaleDateString(locale, { day: "numeric", month: "short" }), time });
};

export interface ApplicationFilterState {
  query: string;
  jobId: string;
  distance: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ApplicationFilterState = { query: "", jobId: "all", distance: "any", sort: "newest" };

export function filterApplications(
  apps: Application[],
  tab: TabKey,
  filters: ApplicationFilterState,
  viewed: ReadonlySet<string>,
  jobTitle: (a: Application) => string,
): Application[] {
  const q = filters.query.trim().toLowerCase();
  const maxKm = filters.distance === "any" ? Infinity : Number(filters.distance);
  const list = apps.filter((a) => {
    if (tab !== "all" && stageOf(a, viewed) !== tab) return false;
    if (filters.jobId !== "all" && a.job?._id !== filters.jobId) return false;
    const d = distanceOf(a);
    if (d !== null && d > maxKm) return false;
    if (!q) return true;
    return [nameOf(a), phoneOf(a), jobTitle(a), a.worker?.skills || "", a.worker?.location || ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  return list.sort((x, y) => {
    switch (filters.sort) {
      case "oldest":
        return (x.createdAt || "").localeCompare(y.createdAt || "");
      case "rating":
        return workerRating(y) - workerRating(x);
      case "wage":
        return wageOf(y.job) - wageOf(x.job);
      default:
        return (y.createdAt || "").localeCompare(x.createdAt || "");
    }
  });
}

export function exportApplicationsCsv(apps: Application[], stageLabel: (a: Application) => string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ["Name", "Phone", "Job", "Status", "Rating", "Review", "Wage", "Applied"],
    ...apps.map((a) => [
      nameOf(a),
      phoneOf(a),
      a.job?.jobTitle?.en ?? "",
      stageLabel(a),
      a.rating ?? "",
      a.review ?? "",
      wageOf(a.job) || "",
      a.createdAt ?? "",
    ]),
  ];
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "applications.csv";
  link.click();
  URL.revokeObjectURL(url);
}
