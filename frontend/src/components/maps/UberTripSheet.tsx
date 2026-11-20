"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiExternalLink,
  FiMapPin,
  FiMaximize2,
  FiMinimize2,
  FiNavigation,
  FiPause,
  FiPhone,
  FiPlay,
  FiRotateCcw,
} from "react-icons/fi";
import LocationSharePanel from "@/components/maps/LocationSharePanel";
import { useL } from "@/hooks/useL";
import {
  clockTime,
  formatDistance,
  formatDuration,
  googleMapsDirectionsUrl,
} from "@/lib/maps";
import { jobLocationOf, jobTitleOf } from "@/lib/workerApplications";
import type {
  Application,
  LatLng,
  LocationStatus,
  MapTheme,
  RouteStatus,
} from "@/types";

interface Props {
  app: Application;
  distanceMeters: number | null;
  etaSeconds: number | null;
  speedKmh?: number | null;
  progressPercent: number; // 0 to 100
  nearSite: boolean;
  locationStatus: LocationStatus;
  routeStatus: RouteStatus;
  destination: LatLng;
  currentPosition?: LatLng | null;
  actionBusy: boolean;
  actionError: string | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdateStatus: (newStatus: "on_the_way" | "arrived") => void;
  onRequestCompletion: () => void;
  // Simulation controls
  isSimulating: boolean;
  simSpeed: number;
  onToggleSimulation: () => void;
  onPauseSimulation: () => void;
  onSetSimSpeed: (speed: number) => void;
  onResetSimulation: () => void;
  theme?: MapTheme;
}

export default function UberTripSheet({
  app,
  distanceMeters,
  etaSeconds,
  speedKmh,
  progressPercent,
  nearSite,
  locationStatus,
  routeStatus,
  destination,
  currentPosition,
  actionBusy,
  actionError,
  isExpanded,
  onToggleExpanded,
  onUpdateStatus,
  onRequestCompletion,
  isSimulating,
  simSpeed,
  onToggleSimulation,
  onPauseSimulation,
  onSetSimSpeed,
  onResetSimulation,
  theme = "day",
}: Props) {
  const { L, language } = useL();
  const [showSimControls, setShowSimControls] = useState(false);
  // Drag-to-slide state (live finger/mouse tracking)
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef({
    active: false,
    moved: false,
    startY: 0,
    startHeight: 0,
    maxHeight: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0, // px per ms (negative = moving up)
    pointerId: -1,
  });

  const isNight = theme === "night";

  const jobTitle =
    jobTitleOf(app, language) ||
    L("Job Location", "काम का स्थान", "कामाचे ठिकाण");
  const jobAddress = jobLocationOf(app, language);
  const employerPhone = app.job?.contactInfo || app.applicantContact || "";
  const employerName =
    app.job?.companyName ||
    app.job?.ownerName ||
    L("Employer", "नियोक्ता", "मालक");

  const arrivalClock =
    etaSeconds !== null ? clockTime(Date.now() + etaSeconds * 1000) : null;
  const clampedProgress = Math.max(
    0,
    Math.min(100, Math.round(progressPercent)),
  );

  const isConfirmed = app.status === "confirmed";
  const isOnTheWay = app.status === "on_the_way";
  const isArrived = app.status === "arrived";
  const isPendingConfirmation = isArrived && !!app.completionRequestedAt;

  const DRAG_THRESHOLD_PX = 6;

  const maxDetailsHeight = () => {
    const cap = typeof window !== "undefined" ? window.innerHeight * 0.62 : 480;
    const natural = contentRef.current?.scrollHeight ?? cap;
    return Math.max(0, Math.min(cap, natural));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Let real buttons / links inside the drag zone keep working
    if ((e.target as HTMLElement).closest("button, a")) return;

    const d = drag.current;
    d.active = true;
    d.moved = false;
    d.pointerId = e.pointerId;
    d.startY = e.clientY;
    d.lastY = e.clientY;
    d.lastT = performance.now();
    d.velocity = 0;
    d.maxHeight = maxDetailsHeight();
    d.startHeight = isExpanded
      ? Math.min(detailsRef.current?.offsetHeight ?? d.maxHeight, d.maxHeight)
      : 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.pointerId) return;

    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    d.moved = true;

    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = now;

    // Dragging up (dy < 0) grows the details panel, dragging down shrinks it
    const next = Math.max(0, Math.min(d.maxHeight, d.startHeight - dy));
    setDragHeight(next);
  };

  const finishDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.pointerId) return;
    d.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    // Plain tap (no drag): handle always toggles; banner only toggles when collapsed
    if (!d.moved) {
      setDragHeight(null);
      if (cancelled) return;
      const onHandle = !!(e.target as HTMLElement).closest(
        "[data-sheet-handle]",
      );
      if (onHandle || !isExpanded) onToggleExpanded();
      return;
    }

    const current = dragHeight ?? d.startHeight;
    let shouldExpand: boolean;
    if (d.velocity < -0.4)
      shouldExpand = true; // fast flick up
    else if (d.velocity > 0.4)
      shouldExpand = false; // fast flick down
    else shouldExpand = current > d.maxHeight / 2; // snap to nearest

    setDragHeight(null);
    if (!cancelled && shouldExpand !== isExpanded) onToggleExpanded();
    else if (cancelled) return;
  };

  const isDragging = dragHeight !== null;

  return (
    <div
      className={`z-[1000] shrink-0 rounded-t-[28px] border-t backdrop-blur-lg transition-all duration-300 ease-out ${
        isNight
          ? "border-slate-800 bg-[#0b132b]/95 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
          : "border-slate-200/90 bg-white text-slate-900 shadow-[0_-10px_35px_rgba(0,0,0,0.18)]"
      } ${isExpanded ? "pb-6 pt-2.5 px-4 sm:px-6" : "pb-4 pt-2 px-4 sm:px-6"}`}
    >
      {/* Drag zone: grab the handle or the summary and drag up/down (tap also toggles) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e)}
        onPointerCancel={(e) => finishDrag(e, true)}
        style={{ touchAction: "none" }}
        className={`select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div
          data-sheet-handle
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleExpanded();
            }
          }}
          className="group mx-auto flex w-full max-w-md flex-col items-center justify-center pb-3 pt-2 select-none"
        >
          <div
            className={`h-1.5 w-12 rounded-full transition ${isNight ? "bg-slate-600 group-hover:bg-slate-500" : "bg-slate-300 group-hover:bg-slate-400"}`}
          />
          <div
            className={`mt-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-wide uppercase transition ${
              isNight
                ? "text-slate-400 group-hover:text-slate-200"
                : "text-slate-500 group-hover:text-slate-800"
            }`}
          >
            {isExpanded ? (
              <>
                <FiChevronDown
                  size={16}
                  className={`${isNight ? "text-cyan-400" : "text-slate-600"} animate-pulse`}
                />
                <span>
                  {L(
                    "Slide down for Full Map",
                    "फुल मैप के लिए नीचे करें",
                    "पूर्ण नकाशासाठी खाली करा",
                  )}
                </span>
              </>
            ) : (
              <>
                <FiChevronUp
                  size={16}
                  className="text-cyan-400 animate-bounce"
                />
                <span className="text-cyan-400 font-bold">
                  {L(
                    "Slide up for details",
                    "विवरण देखने के लिए ऊपर करें",
                    "तपशील पाहण्यासाठी वर करा",
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Metric Banner: Big ETA + Distance + Speed */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-[32px] sm:text-[36px] font-black tracking-tight leading-none ${
                  isNight ? "text-white" : "text-[#0b132b]"
                }`}
              >
                {etaSeconds !== null ? formatDuration(etaSeconds) : "—"}
              </span>
              <span
                className={`text-[12px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  nearSite
                    ? "text-emerald-400 bg-emerald-950/60 border-emerald-600"
                    : isNight
                      ? "text-cyan-300 bg-cyan-950/60 border-cyan-700"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                }`}
              >
                {nearSite
                  ? L("Near Site", "साइट के पास", "साइटजवळ")
                  : L("Fastest Route", "सबसे तेज़ रूट", "सर्वात वेगवान मार्ग")}
              </span>
            </div>

            <div
              className={`mt-1 flex items-center gap-2.5 text-[13px] sm:text-[14px] font-semibold truncate ${
                isNight ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <span>
                {distanceMeters !== null ? formatDistance(distanceMeters) : "—"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FiClock
                  size={13}
                  className={isNight ? "text-slate-400" : "text-slate-400"}
                />
                {arrivalClock
                  ? `${L("Arrive by", "पहुँचेंगे", "पोहोचाल")} ${arrivalClock}`
                  : "—"}
              </span>
            </div>
          </div>

          {/* Live Speed Badge & Toggle Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end">
              <div
                className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-white shadow-sm ${
                  isNight
                    ? "bg-slate-800 border border-slate-700"
                    : "bg-slate-900"
                }`}
              >
                <FiNavigation
                  size={13}
                  className="text-cyan-400 animate-pulse"
                />
                <span className="font-mono text-[13.5px] font-extrabold">
                  {speedKmh !== undefined && speedKmh !== null && speedKmh > 0
                    ? `${speedKmh} km/h`
                    : "0 km/h"}
                </span>
              </div>
              <span
                className={`mt-0.5 text-[10.5px] font-semibold ${isNight ? "text-slate-400" : "text-slate-500"}`}
              >
                {locationStatus === "live"
                  ? L("Live GPS", "लाइव GPS", "लाइव्ह GPS")
                  : L("Searching…", "खोज रहे हैं…", "शोधत आहे…")}
              </span>
            </div>

            {/* Quick full-screen map toggle icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded();
              }}
              title={
                isExpanded
                  ? L("Collapse to full map", "फुल मैप", "पूर्ण नकाशा")
                  : L("Expand details", "विस्तृत विवरण", "तपशील")
              }
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                isNight
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isExpanded ? (
                <FiMinimize2 size={16} />
              ) : (
                <FiMaximize2 size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* When Minimized: show quick compact action button if arriving or active */}
      {!isExpanded && (
        <div className="mt-3 flex items-center gap-2">
          {isOnTheWay ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus("arrived");
              }}
              className={`flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-extrabold text-white shadow transition ${
                nearSite
                  ? "bg-emerald-600 ring-2 ring-emerald-300 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <FiCheckCircle size={16} />
              <span>{L("I have arrived", "मैं पहुँच गया", "मी पोहोचलो")}</span>
            </button>
          ) : isConfirmed ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus("on_the_way");
              }}
              className="flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-[14px] font-extrabold text-white shadow hover:opacity-95"
            >
              <FiNavigation size={16} />
              <span>
                {L("I am on the way", "मैं रास्ते में हूँ", "मी मार्गावर आहे")}
              </span>
            </button>
          ) : null}

          {employerPhone && (
            <a
              href={`tel:${employerPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
              title={L(
                "Call Employer",
                "नियोक्ता को कॉल करें",
                "मालकाला कॉल करा",
              )}
            >
              <FiPhone size={16} />
            </a>
          )}
        </div>
      )}

      {/* Expandable Details Container */}
      <div
        ref={detailsRef}
        style={
          isDragging
            ? {
                maxHeight: dragHeight!,
                marginTop: dragHeight! > 0 ? 16 : 0,
                opacity: Math.min(1, dragHeight! / 80),
                overflow: "hidden",
                transition: "none",
              }
            : undefined
        }
        className={`${isDragging ? "" : "transition-all duration-300 ease-out"} ${
          isDragging
            ? ""
            : isExpanded
              ? "mt-4 max-h-[62vh] overflow-y-auto opacity-100"
              : "max-h-0 opacity-0 pointer-events-none mt-0 overflow-hidden"
        }`}
      >
        <div ref={contentRef}>
          {/* Trip Progress Bar */}
          <div
            className={`mb-4 rounded-xl p-2.5 border ${isNight ? "bg-slate-900/80 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}
          >
            <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold">
              <span
                className={`flex items-center gap-1 ${isNight ? "text-slate-200" : "text-slate-700"}`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {L("Start", "शुरू", "सुरू")}
              </span>
              <span
                className={`font-extrabold ${isNight ? "text-white" : "text-slate-900"}`}
              >
                {clampedProgress}% {L("completed", "पूर्ण", "पूर्ण")}
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <FiMapPin size={12} />
                {L("Work Site", "काम की जगह", "कामाचे ठिकाण")}
              </span>
            </div>
            <div
              className={`relative h-2.5 w-full overflow-hidden rounded-full ${isNight ? "bg-slate-800" : "bg-slate-200"}`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-brand transition-all duration-500"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </div>

          {/* Near site alert */}
          {nearSite && !isArrived && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-950/80 px-3.5 py-2.5 text-[13.5px] font-bold text-emerald-200 shadow-sm animate-pulse">
              <FiCheckCircle size={18} className="text-emerald-400 shrink-0" />
              <span>
                {L(
                  "You are right at the work site! Tap “I have arrived” below.",
                  "आप काम की जगह पर पहुँच चुके हैं! नीचे “मैं पहुँच गया” दबाएं।",
                  "तुम्ही कामाच्या ठिकाणी पोहोचले आहात! खाली “मी पोहोचलो” दाबा.",
                )}
              </span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800"
            >
              {actionError}
            </div>
          )}

          {/* Destination & Employer Details */}
          <div
            className={`mb-3.5 flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm ${
              isNight
                ? "bg-[#141d36] border-slate-700/80 text-white"
                : "bg-white border-slate-200/90 text-slate-900"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-bold">{jobTitle}</div>
              <div
                className={`truncate text-[12.5px] ${isNight ? "text-slate-400" : "text-slate-500"}`}
              >
                {jobAddress}
              </div>
              <div
                className={`mt-1 flex items-center gap-2 text-[12px] font-medium ${isNight ? "text-slate-300" : "text-slate-600"}`}
              >
                <span>{employerName}</span>
              </div>
            </div>

            {employerPhone ? (
              <a
                href={`tel:${employerPhone}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition"
                title={L(
                  "Call Employer",
                  "नियोक्ता को कॉल करें",
                  "मालकाला कॉल करा",
                )}
              >
                <FiPhone size={19} />
              </a>
            ) : null}
          </div>

          {/* Location Share Status Accordion / Sub-panel */}
          <div className="mb-3">
            <LocationSharePanel app={app} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            {isConfirmed && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => onUpdateStatus("on_the_way")}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-[16px] font-extrabold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
              >
                <FiNavigation size={18} />
                <span>
                  {L(
                    "Start Trip • I am on the way",
                    "नेविगेशन शुरू करें • मैं रास्ते में हूँ",
                    "नेव्हिगेशन सुरू करा • मी मार्गावर आहे",
                  )}
                </span>
              </button>
            )}

            {isOnTheWay && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => onUpdateStatus("arrived")}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-extrabold text-white shadow-lg transition ${
                  nearSite
                    ? "bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-300 animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                <FiCheckCircle size={18} />
                <span>
                  {L(
                    "I have arrived at work location",
                    "मैं काम की जगह पहुँच गया",
                    "मी कामाच्या ठिकाणी पोहोचलो",
                  )}
                </span>
              </button>
            )}

            {isArrived && !isPendingConfirmation && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={onRequestCompletion}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-[16px] font-extrabold text-white shadow-lg hover:bg-violet-700 transition disabled:opacity-50"
              >
                <FiCheckCircle size={18} />
                <span>
                  {L("Work is finished", "काम पूरा हुआ", "काम पूर्ण झाले")}
                </span>
              </button>
            )}

            {isPendingConfirmation && (
              <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 py-3 text-center text-[14.5px] font-bold text-emerald-800">
                {L(
                  "Waiting for employer to confirm completion",
                  "नियोक्ता की पुष्टि का इंतज़ार",
                  "मालकाच्या पुष्टीची प्रतीक्षा",
                )}
              </div>
            )}

            {/* Secondary Bar: Simulation & Google Maps */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSimControls((v) => !v)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[13px] font-bold transition ${
                  isNight
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isSimulating ? (
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    {L("Simulation Active", "सिमुलेशन चालू", "सिम्युलेशन सुरू")}
                  </span>
                ) : (
                  <>
                    <FiPlay size={13} className="text-cyan-400" />
                    <span>
                      {L(
                        "Simulate Route",
                        "रूट सिमुलेट करें",
                        "मार्ग सिम्युलेट करा",
                      )}
                    </span>
                  </>
                )}
              </button>

              <a
                href={googleMapsDirectionsUrl(
                  destination,
                  currentPosition ?? undefined,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[13px] font-bold transition no-underline ${
                  isNight
                    ? "border-slate-700 bg-slate-800 text-sky-400 hover:bg-slate-700"
                    : "border-slate-300 bg-white text-[#1a73e8] hover:bg-slate-50"
                }`}
              >
                <FiExternalLink size={13} />
                <span>{L("Google Maps", "गूगल मैप्स", "गुगल मॅप्स")}</span>
              </a>
            </div>

            {/* Simulation Controls Drawer */}
            {showSimControls && (
              <div
                className={`mt-2 rounded-2xl border p-3 ${
                  isNight
                    ? "border-cyan-800 bg-[#0f2142] text-slate-200"
                    : "border-cyan-200 bg-cyan-50/70 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[12.5px] font-extrabold uppercase tracking-wide ${isNight ? "text-cyan-300" : "text-cyan-950"}`}
                  >
                    {L(
                      "Route Test Drive (Demo)",
                      "रूट टेस्ट ड्राइव (डेमो)",
                      "मार्ग टेस्ट ड्राईव्ह (डेमो)",
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={onResetSimulation}
                    className={`flex items-center gap-1 text-[11.5px] font-bold hover:underline ${isNight ? "text-slate-300" : "text-slate-600"}`}
                  >
                    <FiRotateCcw size={12} /> {L("Reset", "रीसेट", "रीसेट")}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      isSimulating ? onPauseSimulation : onToggleSimulation
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-[12.5px] font-bold text-white shadow hover:bg-cyan-700 transition"
                  >
                    {isSimulating ? (
                      <>
                        <FiPause size={13} /> {L("Pause", "रोकें", "थांबवा")}
                      </>
                    ) : (
                      <>
                        <FiPlay size={13} />{" "}
                        {L("Start Drive", "ड्राइव शुरू", "ड्राईव्ह सुरू")}
                      </>
                    )}
                  </button>

                  <div
                    className={`flex items-center gap-1 rounded-xl p-1 border ${isNight ? "bg-slate-900 border-slate-700" : "bg-white border-cyan-200"}`}
                  >
                    {[1, 2, 4].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => onSetSimSpeed(spd)}
                        className={`px-2 py-1 text-[11.5px] font-bold rounded-lg transition ${
                          simSpeed === spd
                            ? "bg-cyan-600 text-white"
                            : isNight
                              ? "text-slate-400 hover:bg-slate-800"
                              : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
                <p
                  className={`mt-2 text-[11px] m-0 ${isNight ? "text-slate-400" : "text-slate-600"}`}
                >
                  {L(
                    "Simulates GPS movement along the route to test turn guidance, arrival detection, and voice prompts.",
                    "रूट के साथ GPS मूवमेंट सिमुलेट करता है ताकि टर्न दिशा-निर्देश और वॉइस जांच सकें।",
                    "वळण मार्गदर्शन, आगमन सूचना आणि आवाज तपासण्यासाठी GPS हालचाल सिम्युलेट करते.",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
