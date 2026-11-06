"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBell } from "react-icons/fi";
import NotificationPanel from "./NotificationPanel";
import { useLanguage } from "@/context/LanguageContext";
import {
  deleteNotification, getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead,
} from "@/services/notifications";
import type { AppNotification, NotificationFilter, UserRole } from "@/types";

const POLL_MS = 5_000;

// Existing routes only.
export function targetFor(role: UserRole, n: AppNotification): string {
  if (role === "employer") {
    switch (n.type) {
      case "job_closed":
        return "/employer-dashboard";
      case "new_application":
        return "/applications?tab=new";
      case "offer_confirmed":
        return "/applications?tab=confirmed";
      case "offer_rejected":
      case "application_withdrawn":
        return "/applications?tab=declined";
      case "worker_on_the_way":
      case "worker_arrived":
      case "completion_requested":
        return "/employer-active-work";
      case "review_received":
        return "/employer-completed-work";
      default:
        return "/applications";
    }
  }
  switch (n.type) {
    case "job_match":
      return n.job ? `/jobs/${n.job}` : "/jobs";
    case "application_accepted":
      return "/job-offers";
    case "application_completed":
    case "completion_approved":
    case "review_received":
      return "/work-history";
    case "offer_confirmed":
    case "worker_on_the_way":
    case "worker_arrived":
    case "completion_rejected":
      return "/active-work";
    default:
      return "/my-applications";
  }
}

export default function NotificationBell({ role, onUnreadChange }: { role: UserRole; onUnreadChange?: (count: number) => void }) {
  const router = useRouter();
  const { language } = useLanguage();
  const L = (en: string, hi: string, mr: string) => (language === "hi" ? hi : language === "mr" ? mr : en);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mirrors of state, so the single long-lived interval/listeners never read stale values.
  const openRef = useRef(false);
  const filterRef = useRef<NotificationFilter>("all");
  const pageRef = useRef(1);
  const unreadRef = useRef(0);
  useEffect(() => {
    openRef.current = open;
    filterRef.current = filter;
    pageRef.current = page;
  });

  // Request bookkeeping: latest-wins sequence numbers, one-at-a-time polling, and a write guard
  // so a response that raced a local change (read/delete/mark-all) can never overwrite it.
  const countSeq = useRef(0);
  const listSeq = useRef(0);
  const countBusy = useRef(false);
  const listBusy = useRef(false);
  const pendingWrites = useRef(0);
  const writeVersion = useRef(0);
  const mounted = useRef(true);
  const failing = useRef(false);

  const onUnreadChangeRef = useRef(onUnreadChange);
  useEffect(() => {
    onUnreadChangeRef.current = onUnreadChange;
  });

  const setUnreadCount = useCallback((n: number) => {
    unreadRef.current = n;
    setUnread(n);
    onUnreadChangeRef.current?.(n);
  }, []);

  const reportFailure = useCallback((what: string, err: unknown) => {
    if (failing.current) return; // log once per outage, not every 5s
    failing.current = true;
    console.error(`[notifications] ${what} failed:`, err);
  }, []);

  // Loads page 1 (replace) or a later page (append) together with the unread count.
  const loadList = useCallback(async (f: NotificationFilter, p: number) => {
    const id = ++listSeq.current;
    const version = writeVersion.current;
    listBusy.current = true;
    setLoading(true);
    try {
      const d = await getNotifications(f, p);
      failing.current = false;
      if (id !== listSeq.current || !mounted.current) return;
      if (pendingWrites.current > 0 || writeVersion.current !== version) return; // raced a write; resync follows
      setItems((prev) => (p === 1 ? d.notifications : [...prev, ...d.notifications.filter((n) => !prev.some((x) => x._id === n._id))]));
      setPage(p);
      setHasMore(d.hasMore);
      setUnreadCount(d.unreadCount);
    } catch (err) {
      reportFailure("load", err);
    } finally {
      if (id === listSeq.current) {
        listBusy.current = false;
        if (mounted.current) setLoading(false);
      }
    }
  }, [setUnreadCount, reportFailure]);

  // Cheap badge refresh. If the count changed while the popup is open, the list is refreshed too.
  const fetchCount = useCallback(async (force = false) => {
    if (countBusy.current && !force) return;
    const id = ++countSeq.current;
    const version = writeVersion.current;
    countBusy.current = true;
    try {
      const { unreadCount } = await getUnreadCount();
      failing.current = false;
      if (id !== countSeq.current || !mounted.current) return;
      if (pendingWrites.current > 0 || writeVersion.current !== version) return;
      const changed = unreadCount !== unreadRef.current;
      setUnreadCount(unreadCount);
      if (changed && openRef.current) void loadList(filterRef.current, 1);
    } catch (err) {
      reportFailure("unread-count", err);
    } finally {
      if (id === countSeq.current) countBusy.current = false;
    }
  }, [loadList, setUnreadCount, reportFailure]);

  // One poll step: open panel on page 1 -> refresh the list (carries the count); otherwise the count only.
  const tick = useCallback(() => {
    if (document.hidden || pendingWrites.current > 0) return;
    if (openRef.current && pageRef.current === 1) {
      if (!listBusy.current) void loadList(filterRef.current, 1);
    } else {
      void fetchCount();
    }
  }, [loadList, fetchCount]);

  // Mount: fetch now, then poll every POLL_MS (one interval), and refresh when the tab/app comes back.
  useEffect(() => {
    mounted.current = true;
    tick();
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [tick]);

  // Opening the popup (or switching tabs) fetches the latest list and count immediately.
  useEffect(() => {
    if (open) void loadList(filter, 1);
  }, [open, filter, loadList]);

  // Outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // After a write settles, re-read the server's truth (also repairs optimistic updates that failed).
  const resync = useCallback(() => {
    void fetchCount(true);
    if (openRef.current) void loadList(filterRef.current, 1);
  }, [fetchCount, loadList]);

  const write = (action: () => Promise<unknown>, what: string) => {
    pendingWrites.current += 1;
    writeVersion.current += 1;
    action()
      .catch((err) => console.error(`[notifications] ${what} failed:`, err))
      .finally(() => {
        pendingWrites.current -= 1;
        writeVersion.current += 1;
        if (mounted.current) resync();
      });
  };

  const openItem = (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount(Math.max(0, unreadRef.current - 1));
      write(() => markNotificationRead(n._id), "mark read");
    }
    setOpen(false);
    router.push(targetFor(role, n));
  };

  const markAll = () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    write(() => markAllNotificationsRead(), "mark all read");
  };

  const dismiss = (n: AppNotification) => {
    setItems((prev) => prev.filter((x) => x._id !== n._id));
    if (!n.isRead) setUnreadCount(Math.max(0, unreadRef.current - 1));
    write(() => deleteNotification(n._id), "delete");
  };

  const changeFilter = (f: NotificationFilter) => {
    if (f === filter) return;
    setItems([]);
    setFilter(f);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={L("Notifications", "सूचनाएं", "सूचना")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[19px] text-white hover:bg-white/10"
      >
        <FiBell />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0b1f47] bg-[#ff4757] px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <NotificationPanel
        open={open}
        items={items}
        loading={loading}
        hasMore={hasMore}
        filter={filter}
        unreadCount={unread}
        L={L}
        onFilter={changeFilter}
        onMarkAll={markAll}
        onLoadMore={() => loadList(filter, page + 1)}
        onOpenItem={openItem}
        onDismissItem={dismiss}
      />
    </div>
  );
}
