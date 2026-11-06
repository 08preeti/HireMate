"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBell, FiCheck } from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import NotificationItem from "@/components/notifications/NotificationItem";
import { targetFor } from "@/components/notifications/NotificationBell";
import { useEmployerData } from "@/context/EmployerDataContext";
import { useEmployerT } from "@/i18n/employerText";
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notifications";
import type { AppNotification, NotificationFilter } from "@/types";

export default function EmployerNotifications() {
  const { tr } = useEmployerT();
  const router = useRouter();
  const { setUnreadNotifications } = useEmployerData();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(
    async (nextFilter: NotificationFilter, nextPage: number) => {
      const seq = ++loadSeq.current;
      setLoading(true);
      setFailed(false);
      try {
        const data = await getNotifications(nextFilter, nextPage);
        if (seq !== loadSeq.current) return;
        setItems((prev) => (nextPage === 1 ? data.notifications : [...prev, ...data.notifications.filter((n) => !prev.some((x) => x._id === n._id))]));
        setPage(nextPage);
        setHasMore(data.hasMore);
        setUnread(data.unreadCount);
        setUnreadNotifications(data.unreadCount);
      } catch (err) {
        console.error(err);
        if (seq === loadSeq.current) setFailed(true);
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [setUnreadNotifications],
  );

  useEffect(() => {
    void load(filter, 1);
  }, [filter, load]);

  const write = (action: () => Promise<unknown>) => {
    action()
      .catch((err: unknown) => console.error(err))
      .finally(() => void load(filter, 1));
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      write(() => markNotificationRead(n._id));
    }
    router.push(targetFor("employer", n));
  };

  const dismiss = (n: AppNotification) => {
    setItems((prev) => prev.filter((x) => x._id !== n._id));
    write(() => deleteNotification(n._id));
  };

  const markAll = () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    write(() => markAllNotificationsRead());
  };

  const changeFilter = (next: NotificationFilter) => {
    if (next === filter) return;
    setItems([]);
    setFilter(next);
  };

  const tabs: { key: NotificationFilter; label: string }[] = [
    { key: "all", label: tr("nt_all") },
    { key: "unread", label: tr("nt_unread") },
  ];

  return (
    <EmployerShell>
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">
        <div>
          <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold text-[#0F1F4B]">{tr("nt_title")}</h1>
          <p className="m-0 mt-1.5 text-[14.5px] text-slate-500">{tr("nt_sub")}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-200/60 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => changeFilter(t.key)}
                className={`cursor-pointer rounded-md px-4 py-1.5 text-[13.5px] font-semibold ${filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
                {t.key === "unread" && unread > 0 && <span className="ml-1.5 text-blue-600">{unread}</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={markAll}
            disabled={unread === 0}
            className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-default disabled:text-slate-300"
          >
            <FiCheck /> {tr("nt_markAll")}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {failed && items.length === 0 ? (
            <div role="alert" className="px-6 py-12 text-center flex flex-col items-center gap-4">
              <p className="m-0 text-[14.5px] text-rose-700">{tr("nt_failed")}</p>
              <button type="button" onClick={() => void load(filter, 1)} className="h-10 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[14px] font-semibold cursor-pointer">
                {tr("ws_retry")}
              </button>
            </div>
          ) : loading && items.length === 0 ? (
            <div role="status" aria-label={tr("loading")} className="animate-pulse divide-y divide-slate-100">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[72px] px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3.5 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-14 text-center flex flex-col items-center gap-3 text-slate-500">
              <span className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[22px]">
                <FiBell />
              </span>
              <p className="m-0 text-[14.5px]">{tr(filter === "unread" ? "nt_emptyUnread" : "nt_empty")}</p>
            </div>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-slate-100">
              {items.map((n) => (
                <NotificationItem key={n._id} notification={n} dismissLabel={tr("nt_dismiss")} onOpen={open} onDismiss={dismiss} />
              ))}
            </ul>
          )}
          {hasMore && items.length > 0 && (
            <div className="border-t border-slate-100 p-3 text-center">
              <button
                type="button"
                onClick={() => void load(filter, page + 1)}
                disabled={loading}
                className="h-10 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-[13.5px] font-semibold text-slate-700 cursor-pointer"
              >
                {tr("nt_loadMore")}
              </button>
            </div>
          )}
        </div>
      </div>
    </EmployerShell>
  );
}
