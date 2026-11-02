"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronDown,
  FiMapPin,
  FiPhone,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import EmployerShell from "@/components/layout/EmployerShell";
import { useAuth } from "@/context/AuthContext";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { getSeenCount } from "@/lib/seenApplications";
import { getEmployerDashboard, getWorkersList } from "@/services/employer";
import type { WorkerListItem } from "@/types";

type SortKey = "newest" | "rating" | "name";

const POLL_MS = 30_000; // check for newly registered workers every 30 seconds
const DAY = 24 * 60 * 60 * 1000;

const initialsOf = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "W";
const skillsOf = (w: WorkerListItem) =>
  (w.skills || "")
    .split(/[,/|]/)
    .map((s) => s.trim())
    .filter(Boolean);
const ageOf = (w: WorkerListItem) =>
  w.createdAt ? Date.now() - new Date(w.createdAt).getTime() : Infinity;
const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};
const showPhone = (phone: string) =>
  /^\+/.test(phone) ? phone : `+91 ${phone}`;

export default function Workers() {
  const { employer } = useAuth();
  const { tr, trp, locale } = useEmployerT();

  const [workers, setWorkers] = useState<WorkerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set()); // joined while this page was open
  const [bannerOpen, setBannerOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [newApps, setNewApps] = useState(0);
  const knownIds = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getWorkersList();
      const list = data.workers || [];
      if (knownIds.current === null) {
        knownIds.current = new Set(list.map((w) => w._id)); // first load: nothing counts as "just joined"
      } else {
        const known = knownIds.current;
        const added = list.filter((w) => !known.has(w._id)).map((w) => w._id);
        if (added.length) {
          added.forEach((id) => known.add(id));
          setFreshIds((prev) => new Set([...prev, ...added]));
          setBannerOpen(true);
        }
      }
      setWorkers(list);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Keeps the red "new applications" badge in the sidebar correct on this page too.
  useEffect(() => {
    getEmployerDashboard()
      .then((d) =>
        setNewApps(
          Math.max(0, (d.totalApplications || 0) - getSeenCount(employer?._id)),
        ),
      )
      .catch(() => {});
  }, [employer?._id]);

  const skillOptions = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>();
    workers.forEach((w) =>
      skillsOf(w).forEach((s) => {
        const k = s.toLowerCase();
        counts.set(k, {
          label: counts.get(k)?.label ?? s,
          n: (counts.get(k)?.n ?? 0) + 1,
        });
      }),
    );
    return [...counts.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 12)
      .map(([key, v]) => ({ key, label: v.label }));
  }, [workers]);

  const stats = useMemo(() => {
    const busy = workers.filter((w) => w.busy).length;
    return {
      total: workers.length,
      week: workers.filter((w) => ageOf(w) < 7 * DAY).length,
      busy,
      available: workers.length - busy,
    };
  }, [workers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = workers.filter((w) => {
      if (
        skill !== "all" &&
        !skillsOf(w).some((s) => s.toLowerCase() === skill)
      )
        return false;
      return (
        !q ||
        [w.name, w.phone, w.skills, w.location]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    });
    return list.sort((a, b) => {
      if (sort === "rating")
        return (
          (b.rating || 0) - (a.rating || 0) ||
          (b.totalReviews || 0) - (a.totalReviews || 0)
        );
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [workers, query, skill, sort]);

  const joinedLabel = (w: WorkerListItem) => {
    if (!w.createdAt) return "";
    const d = new Date(w.createdAt);
    return d.toDateString() === new Date().toDateString()
      ? tr("ws_joinedToday")
      : tr("ws_joinedOn", {
          date: d.toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        });
  };

  const statCards: { key: EmployerKey; value: number; tone: string }[] = [
    { key: "ws_total", value: stats.total, tone: "bg-blue-50 text-blue-600" },
    {
      key: "ws_newWeek",
      value: stats.week,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      key: "ws_available",
      value: stats.available,
      tone: "bg-emerald-50 text-emerald-600",
    },
    { key: "ws_busy", value: stats.busy, tone: "bg-amber-50 text-amber-600" },
  ];

  return (
    <EmployerShell applicationBadge={newApps}>
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 font-plain">
        {/* Heading */}
        <div>
          <h1 className="m-0 text-[26px] sm:text-[28px] font-extrabold text-[#0F1F4B]">
            {tr("ws_title")}
          </h1>
          <p className="m-0 mt-1.5 text-[14.5px] text-slate-500 max-w-[680px]">
            {tr("ws_sub")}
          </p>
        </div>

        {/* New-worker banner */}
        {freshIds.size > 0 && bannerOpen && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] font-semibold text-emerald-800">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              {trp("ws_newBanner", freshIds.size)}
            </span>
            <button
              onClick={() => setBannerOpen(false)}
              className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 cursor-pointer"
            >
              <FiX /> {tr("ws_dismiss")}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div
              key={c.key}
              className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-4 flex items-center gap-3.5"
            >
              <span
                className={`w-11 h-11 rounded-xl text-[20px] flex items-center justify-center shrink-0 ${c.tone}`}
              >
                <FiUsers />
              </span>
              <div className="min-w-0">
                <div className="text-[26px] font-extrabold text-slate-900 leading-none">
                  {c.value}
                </div>
                <div className="mt-1 text-[12.5px] text-slate-500 truncate">
                  {tr(c.key)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,.05)] p-4 flex flex-col gap-3.5">
          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1 flex items-center gap-2.5 h-11 rounded-lg border border-slate-300 px-3.5 focus-within:border-blue-500">
              <FiSearch className="text-slate-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr("ws_searchPh")}
                className="flex-1 min-w-0 bg-transparent text-[14px] outline-none"
              />
            </label>
            <div className="relative md:w-[220px]">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full h-11 appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="newest">{tr("ws_sort_newest")}</option>
                <option value="rating">{tr("ws_sort_rating")}</option>
                <option value="name">{tr("ws_sort_name")}</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
          {skillOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {[{ key: "all", label: tr("ws_allSkills") }, ...skillOptions].map(
                (o) => (
                  <button
                    key={o.key}
                    onClick={() => setSkill(o.key)}
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold cursor-pointer ${skill === o.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {o.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[190px] rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : failed && workers.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-10 text-center">
            <p className="m-0 text-[14px] text-slate-500">{tr("ws_failed")}</p>
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="mt-3 rounded-lg bg-blue-600 text-white px-4 py-2 text-[13px] font-bold cursor-pointer"
            >
              {tr("ws_retry")}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-10 text-center text-[14px] text-slate-500">
            {workers.length === 0 ? tr("ws_none") : tr("ws_noMatch")}
          </div>
        ) : (
          <>
            <div className="text-[13px] text-slate-500 -mb-2">
              {tr("ws_showing", { a: visible.length, b: workers.length })}
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((w) => {
                const fresh = freshIds.has(w._id);
                const isNew = fresh || ageOf(w) < 2 * DAY;
                const skills = skillsOf(w);
                const phone = w.phone || "";
                return (
                  <div
                    key={w._id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(15,23,42,.05)] ${fresh ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-100"}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-bold flex items-center justify-center shrink-0">
                        {initialsOf(w.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[16px] font-extrabold text-[#0F1F4B] truncate">
                            {w.name}
                          </span>
                          {isNew && (
                            <span className="text-[10.5px] font-bold rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                              {tr("ws_badgeNew")}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-500">
                          {w.rating ? (
                            <>
                              ★ {w.rating.toFixed(1)}
                              {w.totalReviews
                                ? ` ${tr("shiftsN", { n: w.totalReviews })}`
                                : ""}
                            </>
                          ) : (
                            <>★ {tr("isNew")}</>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${w.busy ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {w.busy ? tr("ws_busy") : tr("ws_available")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {skills.length > 0 ? (
                        skills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-blue-50 text-blue-700 text-[12px] font-semibold px-2.5 py-1"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-slate-400">
                          {tr("ws_noSkills")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
                      <FiMapPin className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {w.location || tr("ws_noLocation")}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11.5px] text-slate-400">
                        {joinedLabel(w)}
                      </span>
                      {phone && (
                        <div className="flex gap-2">
                          <a
                            href={`tel:${phone}`}
                            aria-label={showPhone(phone)}
                            className="h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[12.5px] font-semibold text-slate-800 no-underline flex items-center gap-1.5"
                          >
                            <FiPhone /> {tr("callNow")}
                          </a>
                          <a
                            href={waLink(phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold no-underline flex items-center"
                          >
                            {tr("whatsapp")}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </EmployerShell>
  );
}
