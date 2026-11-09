"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck } from "react-icons/fi";
import NotificationItem from "@/components/notifications/NotificationItem";
import { openTarget } from "@/lib/notificationTargets";
import { NOTIFICATION_EVENT, announceNotificationsChanged } from "@/lib/notificationEvents";
import { CARD, EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { deleteNotification, getNotificationPreferences, getNotifications, markAllNotificationsRead, markNotificationRead, setNotificationPreferences } from "@/services/notifications";
import type { AppNotification, NotificationFilter } from "@/types";

export default function WorkerNotifications() {
  const { L } = useL();
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const filterRef = useRef(filter);
  const [jobMatches, setJobMatches] = useState<boolean | null>(null);

  const load = useCallback(async (f: NotificationFilter, p: number) => {
    const id = ++seq.current;
    setLoading(true);
    setFailed(false);
    try {
      const d = await getNotifications(f, p);
      if (id !== seq.current) return;
      setItems((prev) => (p === 1 ? d.notifications : [...prev, ...d.notifications.filter((n) => !prev.some((x) => x._id === n._id))]));
      setPage(p);
      setHasMore(d.hasMore);
      setUnread(d.unreadCount);
    } catch {
      if (id === seq.current) setFailed(true);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    filterRef.current = filter;
    void load(filter, 1);
  }, [filter, load]);

  useEffect(() => {
    const reload = () => void load(filterRef.current, 1);
    window.addEventListener(NOTIFICATION_EVENT, reload);
    return () => window.removeEventListener(NOTIFICATION_EVENT, reload);
  }, [load]);

  useEffect(() => {
    getNotificationPreferences()
      .then((p) => setJobMatches(p.jobMatches))
      .catch(() => setJobMatches(null));
  }, []);

  const toggleJobMatches = () => {
    if (jobMatches === null) return;
    const next = !jobMatches;
    setJobMatches(next);
    setNotificationPreferences(next)
      .then((p) => setJobMatches(p.jobMatches))
      .catch(() => setJobMatches(!next));
  };

  const write = (action: () => Promise<unknown>) => {
    action()
      .catch(() => {})
      .finally(() => {
        void load(filter, 1);
        announceNotificationsChanged();
      });
  };

  const markRead = (n: AppNotification) => {
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
    write(() => markNotificationRead(n._id));
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead(n);
    openTarget(router, "worker", n);
  };

  const dismiss = (n: AppNotification) => {
    setItems((prev) => prev.filter((x) => x._id !== n._id));
    write(() => deleteNotification(n._id));
  };

  const markAll = () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    write(() => markAllNotificationsRead());
  };

  const tabs: { key: NotificationFilter; label: string }[] = [
    { key: "all", label: L("All", "सभी", "सर्व") },
    { key: "unread", label: L("Unread", "अपठित", "न वाचलेले") },
    { key: "read", label: L("Read", "पढ़े गए", "वाचलेले") },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={L("Notifications", "सूचनाएं", "सूचना")}
        subtitle={L("Updates about your applications, offers and new jobs.", "आपके आवेदन, ऑफर और नए कामों की जानकारी।", "तुमचे अर्ज, ऑफर आणि नवीन कामांची माहिती.")}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-[#e6ecf5] p-0.5" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filter === t.key}
              onClick={() => {
                if (t.key !== filter) {
                  setItems([]);
                  setFilter(t.key);
                }
              }}
              className={`cursor-pointer rounded-md px-4 py-1.5 text-[13.5px] font-semibold ${filter === t.key ? "bg-white text-[#0b1b3d] shadow-sm" : "text-[#5b6a88] hover:text-[#0b1b3d]"}`}
            >
              {t.label}
              {t.key === "unread" && unread > 0 && <span className="ml-1.5 text-[#1f6bff]">{unread}</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={markAll} disabled={unread === 0} className="flex cursor-pointer items-center gap-1.5 text-[13.5px] font-semibold text-[#1a4fc4] hover:underline disabled:cursor-default disabled:text-[#b8c2d6] disabled:no-underline">
          <FiCheck aria-hidden="true" /> {L("Mark all as read", "सभी पढ़ा हुआ करें", "सर्व वाचले म्हणून चिन्हांकित करा")}
        </button>
      </div>

      {jobMatches !== null && (
        <div className={`${CARD} flex items-center justify-between gap-4 p-4`}>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#0b1b3d]">{L("New job alerts", "नए काम की सूचना", "नवीन कामाच्या सूचना")}</div>
            <p className="m-0 mt-0.5 text-[12.5px] text-[#5b6a88]">
              {L(
                "Get told when a job matching your skills is posted. Updates about your applications, offers and work are always on.",
                "आपके हुनर से मिलता काम आने पर सूचना पाएं। आपके आवेदन, ऑफ़र और काम की जानकारी हमेशा चालू रहती है।",
                "तुमच्या कौशल्याशी जुळणारे काम आल्यावर सूचना मिळवा. तुमचे अर्ज, ऑफर आणि कामाची माहिती नेहमी चालू असते.",
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={jobMatches}
            aria-label={L("New job alerts", "नए काम की सूचना", "नवीन कामाच्या सूचना")}
            onClick={toggleJobMatches}
            className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${jobMatches ? "bg-[#1f6bff]" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${jobMatches ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {failed && items.length === 0 ? (
        <ErrorPanel message={L("Could not load notifications.", "सूचनाएं लोड नहीं हो सकीं।", "सूचना लोड करता आल्या नाहीत.")} onRetry={() => void load(filter, 1)} />
      ) : loading && items.length === 0 ? (
        <LoadingCards count={3} />
      ) : items.length === 0 ? (
        <EmptyPanel
          message={filter === "read" ? L("No read notifications.", "कोई पढ़ी हुई सूचना नहीं।", "वाचलेली सूचना नाही.") : filter === "unread" ? L("No unread notifications.", "कोई अपठित सूचना नहीं।", "न वाचलेली सूचना नाही.") : L("No notifications yet.", "अभी कोई सूचना नहीं।", "अजून सूचना नाही.")}
          hint={L("New job matches and application updates will show up here.", "नए काम और आवेदन अपडेट यहाँ दिखेंगे।", "नवीन कामे आणि अर्जाचे अपडेट येथे दिसतील.")}
        />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <ul className="m-0 list-none divide-y divide-[#edf1f7] p-0">
            {items.map((n) => (
              <NotificationItem key={n._id} notification={n} dismissLabel={L("Dismiss", "हटाएं", "काढा")} markReadLabel={L("Mark as read", "पढ़ा हुआ", "वाचले")} onOpen={open} onDismiss={dismiss} onMarkRead={markRead} />
            ))}
          </ul>
          {hasMore && (
            <button type="button" onClick={() => void load(filter, page + 1)} disabled={loading} className="w-full cursor-pointer border-t border-[#edf1f7] bg-white py-3 text-[13.5px] font-semibold text-[#1a4fc4] hover:bg-[#f6f8fc] disabled:opacity-60">
              {loading ? "…" : L("Load more", "और देखें", "आणखी पहा")}
            </button>
          )}
        </div>
      )}
    </PageContainer>
  );
}
