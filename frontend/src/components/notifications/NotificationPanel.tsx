"use client";

import { FiBell, FiCheck } from "react-icons/fi";
import NotificationItem from "./NotificationItem";
import type { AppNotification, NotificationFilter } from "@/types";

interface Props {
  open: boolean;
  items: AppNotification[];
  loading: boolean;
  hasMore: boolean;
  filter: NotificationFilter;
  unreadCount: number;
  L: (en: string, hi: string, mr: string) => string;
  onFilter: (f: NotificationFilter) => void;
  onMarkAll: () => void;
  onLoadMore: () => void;
  onOpenItem: (n: AppNotification) => void;
  onDismissItem: (n: AppNotification) => void;
}

export default function NotificationPanel({
  open, items, loading, hasMore, filter, unreadCount, L, onFilter, onMarkAll, onLoadMore, onOpenItem, onDismissItem,
}: Props) {
  const tabs: { key: NotificationFilter; label: string }[] = [
    { key: "all", label: L("All", "सभी", "सर्व") },
    { key: "unread", label: L("Unread", "अपठित", "न वाचलेले") },
    { key: "read", label: L("Read", "पढ़े गए", "वाचलेले") },
  ];

  return (
    <div
      role="dialog"
      aria-label={L("Notifications", "सूचनाएं", "सूचना")}
      aria-hidden={!open}
      className={`fixed inset-x-3 top-[72px] z-50 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-[0_16px_40px_rgba(15,23,42,.25)] transition duration-150 ease-out sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[380px] ${
        open ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-1 scale-95 opacity-0"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onFilter(t.key)}
              className={`cursor-pointer rounded-md px-3 py-1 text-[12.5px] font-semibold ${filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
              {t.key === "unread" && unreadCount > 0 && <span className="ml-1 text-blue-600">{unreadCount}</span>}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onMarkAll}
          disabled={unreadCount === 0}
          className="flex cursor-pointer items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-default disabled:text-slate-300"
        >
          <FiCheck size={14} /> {L("Mark all as read", "सभी पढ़ा हुआ करें", "सर्व वाचलेले करा")}
        </button>
      </div>

      <div className="max-h-[min(70vh,440px)] overflow-y-auto overscroll-contain">
        {loading && items.length === 0 ? (
          <ul className="divide-y divide-slate-100" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex animate-pulse gap-3 px-4 py-3">
                <span className="h-9 w-9 rounded-full bg-slate-100" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="block h-3 w-2/3 rounded bg-slate-100" />
                  <span className="block h-3 w-full rounded bg-slate-100" />
                </span>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[22px] text-slate-400"><FiBell /></span>
            <p className="mt-3 text-[14px] font-semibold text-slate-700">
              {filter === "read" ? L("No read notifications", "कोई पढ़ी हुई सूचना नहीं", "वाचलेली सूचना नाही") : filter === "unread" ? L("You're all caught up", "सब देख लिया", "सर्व पाहिले") : L("No notifications yet", "अभी कोई सूचना नहीं", "अद्याप सूचना नाही")}
            </p>
            <p className="mt-1 text-[12.5px] text-slate-500">{L("We'll let you know when something happens.", "कुछ होने पर हम बताएंगे।", "काही घडल्यावर कळवू.")}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <NotificationItem key={n._id} notification={n} dismissLabel={L("Dismiss", "हटाएं", "काढा")} onOpen={onOpenItem} onDismiss={onDismissItem} />
              ))}
            </ul>
            {hasMore && (
              <button type="button" onClick={onLoadMore} disabled={loading} className="w-full cursor-pointer border-t border-slate-100 py-2.5 text-[12.5px] font-semibold text-blue-600 hover:bg-slate-50 disabled:text-slate-400">
                {loading ? L("Loading…", "लोड हो रहा है…", "लोड होत आहे…") : L("Load more", "और देखें", "आणखी पहा")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
