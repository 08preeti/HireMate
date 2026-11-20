"use client";

import { useL } from "@/hooks/useL";
import { clockTime, formatDistance, formatDuration } from "@/lib/maps";
import type { LocationStatus, RouteStatus } from "@/types";

interface Props {
  distanceMeters: number | null;
  etaSeconds: number | null;
  locationStatus: LocationStatus;
  routeStatus: RouteStatus;
  /** Address or name of where the trip is going. */
  destination?: string;
  /** Time of the latest location update (ms since epoch), if known. */
  updatedAt?: number | null;
  /** Small note under the grid, e.g. the connection state. */
  note?: string;
}

const DOT: Record<LocationStatus, string> = {
  live: "bg-emerald-500",
  stale: "bg-amber-500",
  waiting: "bg-sky-500",
  off: "bg-slate-400",
  ended: "bg-slate-400",
  denied: "bg-rose-500",
  unavailable: "bg-rose-500",
};

/** The Blinkit-style summary card: distance left, arrival time, and whether the location and route are healthy. */
export default function NavigationPanel({
  distanceMeters,
  etaSeconds,
  locationStatus,
  routeStatus,
  destination,
  updatedAt,
  note,
}: Props) {
  const { L } = useL();

  const location: Record<LocationStatus, string> = {
    live: L("Live", "लाइव", "लाइव्ह"),
    stale: L("Last known", "आखिरी ज्ञात", "शेवटचे ज्ञात"),
    waiting: L(
      "Waiting for location",
      "लोकेशन का इंतज़ार",
      "ठिकाणाची प्रतीक्षा",
    ),
    off: L("Not sharing", "शेयर नहीं हो रही", "शेअर होत नाही"),
    ended: L("Ended", "समाप्त", "संपले"),
    denied: L("Permission blocked", "अनुमति बंद", "परवानगी बंद"),
    unavailable: L("GPS unavailable", "GPS उपलब्ध नहीं", "GPS उपलब्ध नाही"),
  };
  const route: Record<RouteStatus, string> = {
    idle: "—",
    calculating: L("Calculating…", "निकाल रहे हैं…", "काढत आहे…"),
    onRoute: L("On route", "रूट पर", "मार्गावर"),
    rerouting: L(
      "Finding a new route…",
      "नया रूट ढूँढ रहे हैं…",
      "नवीन मार्ग शोधत आहे…",
    ),
    offRoute: L("Off route", "रूट से हटे", "मार्गावरून हटले"),
    unavailable: L("Route unavailable", "रूट उपलब्ध नहीं", "मार्ग उपलब्ध नाही"),
  };

  const active =
    routeStatus === "onRoute" ||
    routeStatus === "rerouting" ||
    routeStatus === "offRoute";
  const heading =
    active && locationStatus === "live"
      ? L("Navigation Active", "नेविगेशन चालू", "नेव्हिगेशन सुरू")
      : locationStatus === "stale"
        ? L("Tracking paused", "ट्रैकिंग रुकी है", "ट्रॅकिंग थांबले आहे")
        : L("Navigation", "नेविगेशन", "नेव्हिगेशन");
  const arrival =
    etaSeconds !== null ? clockTime(Date.now() + etaSeconds * 1000) : null;

  const cell = "rounded-lg bg-slate-50 px-3 py-2";
  const label =
    "text-[11.5px] font-semibold uppercase tracking-wide text-slate-500";
  const value = "mt-0.5 text-[15px] font-bold text-slate-900";

  return (
    <section
      aria-label={heading}
      className="rounded-xl border border-[#e6ecf5] bg-white p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[locationStatus]} ${locationStatus === "live" ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
        <h3 className="m-0 text-[14.5px] font-extrabold text-[#0F1F4B]">
          {heading}
        </h3>
      </div>
      {destination && (
        <p className="m-0 mb-2 truncate text-[13px] text-slate-600">
          {destination}
        </p>
      )}
      <dl className="m-0 grid grid-cols-2 gap-2">
        <div className={cell}>
          <dt className={label}>
            {L("Distance remaining", "बची दूरी", "उरलेले अंतर")}
          </dt>
          <dd className={`m-0 ${value}`}>
            {distanceMeters !== null ? formatDistance(distanceMeters) : "—"}
          </dd>
        </div>
        <div className={cell}>
          <dt className={label}>
            {L("Estimated arrival", "अनुमानित आगमन", "अंदाजे आगमन")}
          </dt>
          <dd className={`m-0 ${value}`}>
            {etaSeconds !== null
              ? `${formatDuration(etaSeconds)}${arrival ? ` · ${arrival}` : ""}`
              : "—"}
          </dd>
        </div>
        <div className={cell}>
          <dt className={label}>
            {L("Location status", "लोकेशन स्थिति", "लोकेशन स्थिती")}
          </dt>
          <dd className={`m-0 ${value}`}>{location[locationStatus]}</dd>
        </div>
        <div className={cell}>
          <dt className={label}>
            {L("Route status", "रूट स्थिति", "मार्ग स्थिती")}
          </dt>
          <dd className={`m-0 ${value}`}>{route[routeStatus]}</dd>
        </div>
      </dl>
      {(updatedAt || note) && (
        <p className="m-0 mt-2 text-[12px] text-slate-500">
          {updatedAt
            ? `${L("Last update", "आखिरी अपडेट", "शेवटचे अपडेट")}: ${clockTime(updatedAt, true)}`
            : ""}
          {updatedAt && note ? " · " : ""}
          {note}
        </p>
      )}
    </section>
  );
}
