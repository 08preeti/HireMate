"use client";

import type { ReactNode } from "react";
import { FiAlertCircle, FiBriefcase, FiCheckCircle, FiMapPin, FiNavigation, FiSend, FiStar, FiUserPlus, FiX, FiXCircle } from "react-icons/fi";
import type { AppNotification, NotificationType } from "@/types";

const ICONS: Record<NotificationType, { icon: ReactNode; tone: string }> = {
  job_match: { icon: <FiBriefcase />, tone: "bg-blue-50 text-blue-600" },
  application_submitted: { icon: <FiSend />, tone: "bg-indigo-50 text-indigo-600" },
  application_accepted: { icon: <FiCheckCircle />, tone: "bg-emerald-50 text-emerald-600" },
  application_declined: { icon: <FiXCircle />, tone: "bg-rose-50 text-rose-600" },
  application_completed: { icon: <FiCheckCircle />, tone: "bg-emerald-50 text-emerald-600" },
  new_application: { icon: <FiUserPlus />, tone: "bg-blue-50 text-blue-600" },
  worker_on_the_way: { icon: <FiNavigation />, tone: "bg-amber-50 text-amber-600" },
  worker_arrived: { icon: <FiMapPin />, tone: "bg-violet-50 text-violet-600" },
  worker_completed: { icon: <FiCheckCircle />, tone: "bg-emerald-50 text-emerald-600" },
  offer_confirmed: { icon: <FiCheckCircle />, tone: "bg-emerald-50 text-emerald-600" },
  offer_rejected: { icon: <FiXCircle />, tone: "bg-rose-50 text-rose-600" },
  application_withdrawn: { icon: <FiXCircle />, tone: "bg-amber-50 text-amber-600" },
  application_cancelled: { icon: <FiXCircle />, tone: "bg-rose-50 text-rose-600" },
  job_closed: { icon: <FiXCircle />, tone: "bg-rose-50 text-rose-600" },
  job_updated: { icon: <FiBriefcase />, tone: "bg-amber-50 text-amber-600" },
  completion_requested: { icon: <FiCheckCircle />, tone: "bg-violet-50 text-violet-600" },
  completion_approved: { icon: <FiCheckCircle />, tone: "bg-emerald-50 text-emerald-600" },
  completion_rejected: { icon: <FiAlertCircle />, tone: "bg-rose-50 text-rose-600" },
  review_received: { icon: <FiStar />, tone: "bg-amber-50 text-amber-600" },
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  notification: AppNotification;
  dismissLabel: string;
  onOpen: (n: AppNotification) => void;
  onDismiss: (n: AppNotification) => void;
  onMarkRead?: (n: AppNotification) => void;
  markReadLabel?: string;
}

export default function NotificationItem({ notification: n, dismissLabel, onOpen, onDismiss, onMarkRead, markReadLabel }: Props) {
  const { icon, tone } = ICONS[n.type] ?? ICONS.job_match;
  return (
    <li className={`group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${n.isRead ? "" : "bg-blue-50/60"}`}>
      <button type="button" onClick={() => onOpen(n)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] ${tone}`}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-[13.5px] text-slate-900 ${n.isRead ? "font-medium" : "font-bold"}`}>{n.title}</span>
            <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-slate-600">{n.message}</span>
        </span>
      </button>
      {!n.isRead && <span className="absolute right-3 top-9 h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />}
      {!n.isRead && onMarkRead && (
        <button type="button" onClick={() => onMarkRead(n)} className="absolute bottom-2 right-3 cursor-pointer text-[11.5px] font-semibold text-blue-600 hover:underline">
          {markReadLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(n)}
        aria-label={dismissLabel}
        className="absolute right-2 top-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 group-hover:flex"
      >
        <FiX size={14} />
      </button>
    </li>
  );
}
