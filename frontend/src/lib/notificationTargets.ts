import { FOCUS_RECORD_EVENT } from "@/lib/notificationEvents";
import type { AppNotification, UserRole } from "@/types";

const withRecord = (path: string, n: AppNotification): string => (n.application ? `${path}#app-${n.application}` : path);

/** Existing pages only; the hash makes the page scroll to and highlight the exact application. */
export function targetFor(role: UserRole, n: AppNotification): string {
  if (role === "employer") {
    switch (n.type) {
      case "job_closed":
        return "/employer-dashboard";
      case "job_filled":
        return "/employer-jobs";
      case "new_application":
        return withRecord("/applications?tab=new", n);
      case "offer_confirmed":
      case "worker_on_the_way":
      case "worker_arrived":
      case "completion_requested":
        return withRecord("/employer-active-work", n);
      case "offer_rejected":
      case "application_withdrawn":
        return withRecord("/applications?tab=declined", n);
      case "review_received":
        return withRecord("/employer-completed-work", n);
      default:
        return withRecord("/applications", n);
    }
  }
  switch (n.type) {
    case "job_match":
      return n.job ? `/jobs/${n.job}` : "/jobs";
    case "application_accepted":
      return withRecord("/job-offers", n);
    case "application_completed":
    case "completion_approved":
    case "review_received":
      return withRecord("/work-history", n);
    case "offer_confirmed":
    case "worker_on_the_way":
    case "worker_arrived":
    case "completion_rejected":
      return withRecord("/active-work", n);
    default:
      return withRecord("/my-applications", n);
  }
}

export function openTarget(router: { push: (href: string) => void }, role: UserRole, n: AppNotification): void {
  router.push(targetFor(role, n));
  setTimeout(() => window.dispatchEvent(new Event(FOCUS_RECORD_EVENT)), 0);
}
