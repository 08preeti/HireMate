"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck } from "react-icons/fi";
import NotificationItem from "@/components/notifications/NotificationItem";
import { targetFor } from "@/components/notifications/NotificationBell";
import { CARD, EmptyPanel, ErrorPanel, LoadingCards, PageContainer, PageHeader } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notifications";
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
    void load(filter, 1);
  }, [filter, load]);

  const write = (action: () => Promise<unknown>) => {
    action()
      .catch(() => {})
      .finally(() => void load(filter, 1));
  };

  const markRead = (n: AppNotification) => {
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
    write(() => markNotificationRead(n._id));
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead(n);
    router.push(targetFor("worker", n));
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

      {failed && items.length === 0 ? (
        <ErrorPanel message={L("Could not load notifications.", "सूचनाएं लोड नहीं हो सकीं।", "सूचना लोड करता आल्या नाहीत.")} onRetry={() => void load(filter, 1)} />
      ) : loading && items.length === 0 ? (
        <LoadingCards count={3} />
      ) : items.length === 0 ? (
        <EmptyPanel
          message={filter === "unread" ? L("No unread notifications.", "कोई अपठित सूचना नहीं।", "न वाचलेली सूचना नाही.") : L("No notifications yet.", "अभी कोई सूचना नहीं।", "अजून सूचना नाही.")}
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
