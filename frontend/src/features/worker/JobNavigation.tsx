"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import MapViewLazy from "@/components/maps/MapViewLazy";
import UberNavHUD, { type ManeuverInfo } from "@/components/maps/UberNavHUD";
import UberTripSheet from "@/components/maps/UberTripSheet";
import { useGeoWatch } from "@/hooks/useGeoWatch";
import { useL } from "@/hooks/useL";
import { useLiveRoute } from "@/hooks/useLiveRoute";
import { useWakeLock } from "@/hooks/useWakeLock";
import { calculateBearing, haversine } from "@/lib/geo";
import { isValidLatLng } from "@/lib/maps";
import { locateOnRoute, measureRoute } from "@/lib/routeProgress";
import { jobLocationOf } from "@/lib/workerApplications";
import { requestCompletion, setLocationConsent, updateApplicationStatus } from "@/services/applications";
import { getRouteToJob } from "@/services/location";
import type { LatLng, LatLngTuple, LocationStatus, MapMarker, MapTheme, RouteInfo } from "@/types";
import { useWorkerApplications } from "./useApplicationActions";

const ACTIVE = ["confirmed", "on_the_way", "arrived"];
const NEAR_SITE_KM = 0.15; // 150 meters

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-4 p-8 text-center bg-slate-50">
      {children}
    </div>
  );
}

function Back({ label }: { label: string }) {
  return (
    <Link
      href="/active-work"
      className="rounded-xl bg-brand px-6 py-3 text-[15px] font-bold text-white no-underline shadow-md hover:bg-brand/90 transition"
    >
      {label}
    </Link>
  );
}

export default function JobNavigation() {
  const { L, language } = useL();
  const appId = useSearchParams().get("appId");
  const state = useWorkerApplications();
  const app = state.apps.find((a) => a._id === appId);

  const geo = useGeoWatch();
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tripStart, setTripStart] = useState<LatLng | null>(null);

  // Uber navigation states
  const [theme, setTheme] = useState<MapTheme>("day");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [followWorker, setFollowWorker] = useState(true);
  const [overviewKey, setOverviewKey] = useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Simulation / Demo Mode State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [simHeading, setSimHeading] = useState(0);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const job = app?.job;
  const dest = useMemo<LatLng | null>(
    () =>
      isValidLatLng(job?.latitude, job?.longitude)
        ? { lat: job!.latitude as number, lng: job!.longitude as number }
        : null,
    [job],
  );

  const eligible = !!app && ACTIVE.includes(app.status ?? "") && !app.isCompleted;
  const address = app ? jobLocationOf(app, language) : "";
  const liveGPSNavigating = geo.status === "watching";
  const navigating = liveGPSNavigating || isSimulating;

  // Auto-start GPS watching when entering navigation if not already active
  useEffect(() => {
    if (eligible && geo.status === "idle" && !isSimulating) {
      void geo.start();
    }
  }, [eligible, geo.status, isSimulating, geo]);

  // Route calculation hook
  const effectiveGpsPosition = useMemo(() => {
    if (!geo.fix) return null;
    return {
      lat: geo.fix.lat,
      lng: geo.fix.lng,
      accuracy: geo.fix.accuracy,
      heading: geo.fix.heading,
      speed: geo.fix.speed,
    };
  }, [geo.fix]);

  const live = useLiveRoute({
    position: effectiveGpsPosition,
    destination: dest,
    enabled: eligible && (navigating || isSimulating),
    fetchRoute: (from) => getRouteToJob(appId ?? "", from),
  });

  const { info: routeInfo, progress } = live;

  // Route coordinates
  const routeCoords: LatLngTuple[] = useMemo(() => {
    return routeInfo?.coordinates ?? [];
  }, [routeInfo?.coordinates]);

  // Handle Simulation Stepping
  useEffect(() => {
    if (!isSimulating || !routeCoords.length) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      return;
    }

    const intervalMs = Math.max(300, Math.round(900 / simSpeed));
    simTimerRef.current = setInterval(() => {
      setSimIndex((prev) => {
        const next = prev + 1;
        if (next >= routeCoords.length) {
          setIsSimulating(false);
          return routeCoords.length - 1;
        }
        // Calculate heading to next waypoint
        if (next < routeCoords.length - 1) {
          const cur = routeCoords[next];
          const nxt = routeCoords[next + 1];
          const deg = calculateBearing(cur[0], cur[1], nxt[0], nxt[1]);
          setSimHeading(Math.round(deg));
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, routeCoords, simSpeed]);

  // Simulated position
  const simPosition: LatLngTuple | null = useMemo(() => {
    if (!isSimulating || !routeCoords.length) return null;
    return routeCoords[Math.min(simIndex, routeCoords.length - 1)] ?? null;
  }, [isSimulating, routeCoords, simIndex]);

  // Current effective position of worker
  const currentPos: LatLngTuple | null = useMemo(() => {
    if (isSimulating && simPosition) return simPosition;
    if (geo.fix) return [geo.fix.lat, geo.fix.lng];
    return null;
  }, [isSimulating, simPosition, geo.fix]);

  const currentHeading = useMemo(() => {
    if (isSimulating) return simHeading;
    return geo.fix?.heading ?? 0;
  }, [isSimulating, simHeading, geo.fix?.heading]);

  const currentSpeedKmh = useMemo(() => {
    if (isSimulating) return 32 * simSpeed;
    return geo.fix?.speed ?? 0;
  }, [isSimulating, simSpeed, geo.fix?.speed]);

  // Initial trip start
  useEffect(() => {
    if (!navigating) setTripStart(null);
    else if (!tripStart && currentPos) setTripStart({ lat: currentPos[0], lng: currentPos[1] });
  }, [navigating, tripStart, currentPos]);

  useWakeLock(eligible && navigating);

  // Turn-by-turn instruction parsing
  const measured = useMemo(() => (routeInfo ? measureRoute(routeInfo.coordinates) : null), [routeInfo]);

  const upcomingInstructions = useMemo<{ current: ManeuverInfo | null; subsequent: ManeuverInfo | null }>(() => {
    if (!measured || !routeInfo || !currentPos) {
      return { current: null, subsequent: null };
    }
    const loc = locateOnRoute(measured, currentPos);
    if (!loc) return { current: null, subsequent: null };
    const alongMeters = loc.alongMeters;

    const locations = routeInfo.stepLocations;
    const detailed = routeInfo.detailedSteps;
    const found: ManeuverInfo[] = [];

    for (let i = 1; i < routeInfo.steps.length; i++) {
      const at = locations?.[i];
      if (!at) continue;
      const stepPos = locateOnRoute(measured, at);
      if (stepPos && stepPos.alongMeters > alongMeters + 15) {
        const stepDetail = detailed?.[i];
        found.push({
          text: routeInfo.steps[i],
          inMeters: Math.round(stepPos.alongMeters - alongMeters),
          modifier: stepDetail?.modifier,
          type: stepDetail?.type,
          streetName: stepDetail?.streetName,
        });
        if (found.length >= 2) break;
      }
    }

    if (!found.length && routeInfo.steps.length > 0) {
      found.push({ text: routeInfo.steps[routeInfo.steps.length - 1], inMeters: 0 });
    }

    return {
      current: found[0] ?? null,
      subsequent: found[1] ?? null,
    };
  }, [measured, routeInfo, currentPos]);

  // Distance and progress calculations
  const remainingMeters = useMemo(() => {
    if (isSimulating && measured && simPosition) {
      const pos = locateOnRoute(measured, simPosition);
      if (pos) return Math.max(0, Math.round(measured.totalMeters - pos.alongMeters));
    }
    return progress?.remainingMeters ?? (routeInfo?.distanceMeters ?? null);
  }, [isSimulating, measured, simPosition, progress?.remainingMeters, routeInfo?.distanceMeters]);

  const remainingSeconds = useMemo(() => {
    if (isSimulating && remainingMeters !== null && routeInfo?.distanceMeters) {
      const frac = remainingMeters / Math.max(1, routeInfo.distanceMeters);
      return Math.round((routeInfo.durationSeconds || 600) * frac);
    }
    return progress?.remainingSeconds ?? (routeInfo?.durationSeconds ?? null);
  }, [isSimulating, remainingMeters, routeInfo?.distanceMeters, routeInfo?.durationSeconds, progress?.remainingSeconds]);

  const progressPercent = useMemo(() => {
    if (!measured || measured.totalMeters <= 0 || !currentPos) return 0;
    const pos = locateOnRoute(measured, currentPos);
    if (!pos) return 0;
    return Math.min(100, Math.max(0, (pos.alongMeters / measured.totalMeters) * 100));
  }, [measured, currentPos]);

  // Check near site
  const straightKm = currentPos && dest ? haversine(currentPos[0], currentPos[1], dest.lat, dest.lng) : null;
  const nearSite = straightKm !== null && straightKm <= NEAR_SITE_KM;

  // Active Map Markers
  const markers = useMemo<MapMarker[]>(() => {
    if (!dest) return [];
    const list: MapMarker[] = [
      {
        id: "dest",
        kind: "destination",
        position: [dest.lat, dest.lng],
        label: address || L("Work Location", "काम की जगह", "कामाचे ठिकाण"),
      },
    ];

    if (tripStart && navigating) {
      list.push({
        id: "start",
        kind: "start",
        position: [tripStart.lat, tripStart.lng],
        label: L("Start", "शुरू", "सुरू"),
      });
    }

    if (currentPos) {
      list.push({
        id: "worker-live",
        kind: "worker",
        position: currentPos,
        heading: currentHeading,
        speed: currentSpeedKmh,
        label: L("You are here", "आप यहाँ हैं", "तुम्ही येथे आहात"),
      });
    }

    return list;
  }, [dest, address, tripStart, navigating, currentPos, currentHeading, currentSpeedKmh, L]);

  // Active / Done polyline coordinates
  const activeRemainingPolyline: LatLngTuple[] | undefined = useMemo(() => {
    if (isSimulating && routeCoords.length > 0) {
      return routeCoords.slice(Math.min(simIndex, routeCoords.length - 1));
    }
    return progress?.remaining ?? routeInfo?.coordinates;
  }, [isSimulating, routeCoords, simIndex, progress?.remaining, routeInfo?.coordinates]);

  const activeDonePolyline: LatLngTuple[] | undefined = useMemo(() => {
    if (isSimulating && routeCoords.length > 0) {
      return routeCoords.slice(0, Math.min(simIndex + 1, routeCoords.length));
    }
    return progress?.done;
  }, [isSimulating, routeCoords, simIndex, progress?.done]);

  // Actions
  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await fn();
      after?.();
      state.reload();
    } catch (err) {
      setActionError(
        err instanceof Error && err.message
          ? err.message
          : L("Could not update. Please try again.", "अपडेट नहीं हो सका। कृपया फिर कोशिश करें।", "अपडेट करता आले नाही. कृपया पुन्हा प्रयत्न करा.")
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateStatus = (newStatus: "on_the_way" | "arrived") => {
    if (!app) return;
    void act(
      () => updateApplicationStatus(app._id, newStatus),
      () => {
        if (newStatus === "on_the_way") {
          void geo.start();
          setFollowWorker(true);
        }
      }
    );
  };

  const handleRequestCompletion = () => {
    if (!app) return;
    void act(
      () => requestCompletion(app._id),
      () => void setLocationConsent(app._id, false).catch(() => {})
    );
  };

  // Simulation controls
  const handleToggleSimulation = useCallback(() => {
    if (!routeCoords.length) return;
    setIsSimulating(true);
    setFollowWorker(true);
  }, [routeCoords.length]);

  const handlePauseSimulation = useCallback(() => {
    setIsSimulating(false);
  }, []);

  const handleResetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimIndex(0);
    setFollowWorker(true);
  }, []);

  const handleRecenter = useCallback(() => {
    setFollowWorker(true);
  }, []);

  const handleFitOverview = useCallback(() => {
    setFollowWorker(false);
    setOverviewKey((k) => k + 1);
  }, []);

  const backLabel = L("Back to Active Work", "सक्रिय काम पर वापस", "सक्रिय कामाकडे परत");

  if (!appId) {
    return (
      <Frame>
        <h2 className="m-0 text-[20px] font-bold text-slate-800">{L("No job selected", "कोई काम चुना नहीं गया", "कोणतेही काम निवडलेले नाही")}</h2>
        <p className="m-0 text-slate-600">{L("Open navigation from one of your active jobs.", "अपने किसी सक्रिय काम से नेविगेशन खोलें।", "तुमच्या सक्रिय कामातून नेव्हिगेशन उघडा.")}</p>
        <Back label={backLabel} />
      </Frame>
    );
  }

  if (state.loading) {
    return (
      <Frame>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="m-0 text-[15px] font-semibold text-slate-600">{L("Loading navigation…", "नेविगेशन लोड हो रहा है…", "नेव्हिगेशन लोड होत आहे…")}</p>
      </Frame>
    );
  }

  if (state.error && !app) {
    return (
      <Frame>
        <p role="alert" className="m-0 text-rose-700 font-semibold">{L("Could not load your job.", "आपका काम लोड नहीं हो सका।", "तुमचे काम लोड करता आले नाही.")}</p>
        <button type="button" onClick={state.reload} className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-[15px] font-bold shadow-sm">
          {L("Try again", "फिर कोशिश करें", "पुन्हा प्रयत्न करा")}
        </button>
      </Frame>
    );
  }

  if (!app) {
    return (
      <Frame>
        <h2 className="m-0 text-[20px] font-bold text-slate-800">{L("Job not found", "काम नहीं मिला", "काम सापडले नाही")}</h2>
        <Back label={backLabel} />
      </Frame>
    );
  }

  if (!eligible) {
    return (
      <Frame>
        <h2 className="m-0 text-[20px] font-bold text-slate-800">{L("Navigation is not available", "नेविगेशन उपलब्ध नहीं है", "नेव्हिगेशन उपलब्ध नाही")}</h2>
        <p className="m-0 text-slate-600">
          {L(
            "Navigation works for confirmed jobs that are currently active. This job is completed or not active.",
            "नेविगेशन चालू कामों के लिए है। यह काम पूरा या सक्रिय नहीं है।",
            "नेव्हिगेशन सध्या सुरू असलेल्या कामांसाठी आहे. हे काम पूर्ण किंवा सक्रिय नाही."
          )}
        </p>
        <Back label={backLabel} />
      </Frame>
    );
  }

  if (!dest) {
    return (
      <Frame>
        <h2 className="m-0 text-[20px] font-bold text-slate-800">{L("This job has no map pin", "इस काम की मैप पिन नहीं है", "या कामाला नकाशा पिन नाही")}</h2>
        <p className="m-0 text-slate-600">
          {L("The employer did not specify a GPS location for this job.", "नियोक्ता ने इस काम का सही GPS लोकेशन नहीं दिया।", "मालकाने या कामाचे GPS स्थान दिलेले नाही.")}
        </p>
        <Back label={backLabel} />
      </Frame>
    );
  }

  const locationStatus: LocationStatus =
    geo.status === "denied"
      ? "denied"
      : geo.status === "unavailable" || geo.status === "timeout" || geo.status === "unsupported"
        ? "unavailable"
        : navigating
          ? "live"
          : geo.status === "requesting"
            ? "waiting"
            : "off";

  const mapCenter: LatLngTuple = currentPos ?? [dest.lat, dest.lng];

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-slate-900 select-none">
      {/* Top Floating Back Button (Uber minimalist back icon) */}
      <div className="absolute left-3 top-3 z-[1100]">
        <Link
          href="/active-work"
          aria-label={L("Back to active jobs", "वापस", "परत")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b132b]/90 text-white shadow-lg backdrop-blur-md border border-slate-700/80 hover:bg-slate-800 transition"
        >
          <FiArrowLeft size={20} />
        </Link>
      </div>

      {/* Uber Turn-by-Turn Top HUD */}
      <UberNavHUD
        currentStep={upcomingInstructions.current}
        nextStep={upcomingInstructions.subsequent}
        routeStatus={live.status}
        theme={theme}
        voiceEnabled={voiceEnabled}
        isFollowing={followWorker}
        onToggleTheme={() => setTheme((t) => (t === "day" ? "night" : "day"))}
        onToggleVoice={() => setVoiceEnabled((v) => !v)}
        onRecenter={handleRecenter}
        onFitOverview={handleFitOverview}
      />

      {/* Main Map Canvas */}
      <div className="relative min-h-0 flex-1">
        <MapViewLazy
          center={mapCenter}
          markers={markers}
          route={activeRemainingPolyline}
          routeDone={activeDonePolyline}
          focusKey={overviewKey}
          theme={theme}
          followWorker={followWorker}
          onUserPan={() => setFollowWorker(false)}
        />

        {/* Floating Toggle Button on Map to expand/collapse bottom section */}
        <div className="absolute right-3 bottom-3 z-[990]">
          <button
            type="button"
            onClick={() => setIsSheetExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-[#0b132b]/90 px-3.5 py-2 text-[12px] font-bold text-white shadow-xl backdrop-blur hover:bg-slate-800 transition"
          >
            {isSheetExpanded ? (
              <>
                <FiMaximize2 size={13} className="text-cyan-400" />
                <span>{L("Full Map", "फुल मैप", "पूर्ण नकाशा")}</span>
              </>
            ) : (
              <>
                <FiMinimize2 size={13} className="text-cyan-400" />
                <span>{L("Show Details", "विवरण देखें", "तपशील पहा")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Uber Bottom HUD Sheet */}
      <UberTripSheet
        app={app}
        distanceMeters={remainingMeters}
        etaSeconds={remainingSeconds}
        speedKmh={currentSpeedKmh}
        progressPercent={progressPercent}
        nearSite={nearSite}
        locationStatus={locationStatus}
        routeStatus={live.status}
        destination={dest}
        currentPosition={currentPos ? { lat: currentPos[0], lng: currentPos[1] } : null}
        actionBusy={actionBusy}
        actionError={actionError}
        isExpanded={isSheetExpanded}
        onToggleExpanded={() => setIsSheetExpanded((v) => !v)}
        onUpdateStatus={handleUpdateStatus}
        onRequestCompletion={handleRequestCompletion}
        isSimulating={isSimulating}
        simSpeed={simSpeed}
        onToggleSimulation={handleToggleSimulation}
        onPauseSimulation={handlePauseSimulation}
        onSetSimSpeed={setSimSpeed}
        onResetSimulation={handleResetSimulation}
      />
    </div>
  );
}
