"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";
import LocationSharePanel from "@/components/maps/LocationSharePanel";
import MapViewLazy from "@/components/maps/MapViewLazy";
import { useGeoWatch } from "@/hooks/useGeoWatch";
import { useL } from "@/hooks/useL";
import { haversine } from "@/lib/geo";
import { clockTime, formatDistance, formatDuration, googleMapsDirectionsUrl, isValidLatLng } from "@/lib/maps";
import { jobLocationOf, jobTitleOf } from "@/lib/workerApplications";
import { ApiError } from "@/services/api";
import { requestCompletion, setLocationConsent, updateApplicationStatus } from "@/services/applications";
import { getRouteToJob } from "@/services/location";
import type { LatLng, MapMarker, RouteInfo } from "@/types";
import { useWorkerApplications } from "./useApplicationActions";

const ACTIVE = ["confirmed", "on_the_way", "arrived"];
const REROUTE_MIN_KM = 0.1;
const REROUTE_MIN_MS = 15_000;
const NEAR_SITE_KM = 0.1;

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-4 p-8 text-center">{children}</div>;
}

function Back({ label }: { label: string }) {
  return (
    <Link href="/active-work" className="rounded-lg bg-brand px-5 py-3 text-[15px] font-semibold text-white no-underline">
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
  const [route, setRoute] = useState<{ info: RouteInfo; at: number } | null>(null);
  const [routeProblem, setRouteProblem] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const lastRoute = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const routingRef = useRef(false);

  const job = app?.job;
  const dest = useMemo<LatLng | null>(() => (isValidLatLng(job?.latitude, job?.longitude) ? { lat: job!.latitude as number, lng: job!.longitude as number } : null), [job]);
  const eligible = !!app && ACTIVE.includes(app.status ?? "") && !app.isCompleted;
  const here: LatLng | null = geo.fix ? { lat: geo.fix.lat, lng: geo.fix.lng } : null;
  const address = app ? jobLocationOf(app, language) : "";

  const refreshRoute = useCallback(
    async (from: LatLng) => {
      if (!appId || routingRef.current) return;
      routingRef.current = true;
      setRouting(true);
      lastRoute.current = { at: Date.now(), lat: from.lat, lng: from.lng };
      try {
        const info = await getRouteToJob(appId, from);
        setRoute({ info, at: Date.now() });
        setRouteProblem(null);
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        setRouteProblem(
          status === 404
            ? L("No driving route was found. Use Google Maps below.", "ड्राइविंग रूट नहीं मिला। नीचे Google Maps का उपयोग करें।", "ड्रायव्हिंग मार्ग सापडला नाही. खाली Google Maps वापरा.")
            : status === 429
              ? L("Too many route requests. Please wait a moment.", "रूट के बहुत अनुरोध। कृपया थोड़ा रुकें।", "मार्गाच्या खूप विनंत्या. कृपया थोडे थांबा.")
              : status === 0
                ? L("No internet connection. The route will update when you are back online.", "इंटरनेट नहीं है। इंटरनेट लौटने पर रूट अपडेट होगा।", "इंटरनेट नाही. इंटरनेट आल्यावर मार्ग अपडेट होईल.")
                : L("The routing service is not available right now. You can still use Google Maps below.", "रूटिंग सेवा अभी उपलब्ध नहीं है। आप नीचे Google Maps का उपयोग कर सकते हैं।", "रूटिंग सेवा सध्या उपलब्ध नाही. तुम्ही खाली Google Maps वापरू शकता."),
        );
      } finally {
        routingRef.current = false;
        setRouting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appId, language],
  );

  // Calculate the first route, then only recalculate after moving ~100 m (and at most every 15 s).
  const fixLat = geo.fix?.lat;
  const fixLng = geo.fix?.lng;
  useEffect(() => {
    if (!eligible || !dest || fixLat === undefined || fixLng === undefined) return;
    const prev = lastRoute.current;
    const elapsed = prev ? Date.now() - prev.at : Infinity;
    const movedKm = prev ? haversine(prev.lat, prev.lng, fixLat, fixLng) : Infinity;
    if (elapsed < REROUTE_MIN_MS) return;
    if (!route || routeProblem || movedKm >= REROUTE_MIN_KM) void refreshRoute({ lat: fixLat, lng: fixLng });
  }, [fixLat, fixLng, eligible, dest, route, routeProblem, refreshRoute]);

  useEffect(() => {
    if (!eligible) geo.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await fn();
      after?.();
      state.reload();
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : L("Could not update. Please try again.", "अपडेट नहीं हो सका। कृपया फिर कोशिश करें।", "अपडेट करता आले नाही. कृपया पुन्हा प्रयत्न करा."));
    } finally {
      setActionBusy(false);
    }
  };

  const backLabel = L("Back to Active Work", "सक्रिय काम पर वापस", "सक्रिय कामाकडे परत");

  if (!appId) return <Frame><h2 className="m-0">{L("No job selected", "कोई काम चुना नहीं गया", "कोणतेही काम निवडलेले नाही")}</h2><p className="m-0 text-gray-600">{L("Open navigation from one of your active jobs.", "अपने किसी सक्रिय काम से नेविगेशन खोलें।", "तुमच्या सक्रिय कामातून नेव्हिगेशन उघडा.")}</p><Back label={backLabel} /></Frame>;
  if (state.loading) return <Frame><p className="m-0 text-gray-600">{L("Loading your job…", "आपका काम लोड हो रहा है…", "तुमचे काम लोड होत आहे…")}</p></Frame>;
  if (state.error && !app) return <Frame><p role="alert" className="m-0 text-rose-700">{L("Could not load your job.", "आपका काम लोड नहीं हो सका।", "तुमचे काम लोड करता आले नाही.")}</p><button type="button" onClick={state.reload} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-5 py-3 text-[15px] font-semibold">{L("Try again", "फिर कोशिश करें", "पुन्हा प्रयत्न करा")}</button></Frame>;
  if (!app) return <Frame><h2 className="m-0">{L("Job not found", "काम नहीं मिला", "काम सापडले नाही")}</h2><Back label={backLabel} /></Frame>;
  if (!eligible) {
    return (
      <Frame>
        <h2 className="m-0">{L("Navigation is not available", "नेविगेशन उपलब्ध नहीं है", "नेव्हिगेशन उपलब्ध नाही")}</h2>
        <p className="m-0 text-gray-600">{L("Navigation works for confirmed jobs that are still active. This job is completed, cancelled or not confirmed yet.", "नेविगेशन उन पक्के किए गए कामों के लिए है जो अभी चालू हैं। यह काम पूरा, रद्द या अभी पक्का नहीं है।", "नेव्हिगेशन निश्चित केलेल्या आणि सुरू असलेल्या कामांसाठी आहे. हे काम पूर्ण, रद्द किंवा अजून निश्चित नाही.")}</p>
        <Back label={backLabel} />
      </Frame>
    );
  }
  if (!dest) {
    const q = encodeURIComponent(address || "");
    return (
      <Frame>
        <h2 className="m-0">{L("This job has no map pin", "इस काम की मैप पिन नहीं है", "या कामाला नकाशा पिन नाही")}</h2>
        <p className="m-0 text-gray-600">{L("The employer did not pin the exact location, so a route cannot be calculated.", "नियोक्ता ने सही जगह पिन नहीं की, इसलिए रूट नहीं बन सकता।", "मालकाने अचूक ठिकाण पिन केलेले नाही, त्यामुळे मार्ग काढता येत नाही.")}</p>
        {address && <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-[15px] font-semibold text-[#1a73e8] no-underline">{L("Search the address in Google Maps", "पते को Google Maps में खोजें", "पत्ता Google Maps मध्ये शोधा")}</a>}
        <Back label={backLabel} />
      </Frame>
    );
  }

  const markers: MapMarker[] = [{ id: "dest", kind: "destination", position: [dest.lat, dest.lng], label: address || L("Job location", "काम की जगह", "कामाचे ठिकाण") }];
  if (here) markers.push({ id: "me", kind: "worker", position: [here.lat, here.lng], label: L("You are here", "आप यहाँ हैं", "तुम्ही येथे आहात") });
  const straightKm = here ? haversine(here.lat, here.lng, dest.lat, dest.lng) : null;
  const nearSite = straightKm !== null && straightKm <= NEAR_SITE_KM;
  const nextStep = route?.info.steps[1] ?? route?.info.steps[0];
  const arriveAt = route ? route.at + route.info.durationSeconds * 1000 : null;
  const navigating = geo.status === "watching";

  const geoMessage =
    geo.status === "denied"
      ? L("Location permission is blocked. Allow location for this site in your browser settings, then try again.", "लोकेशन की अनुमति बंद है। ब्राउज़र सेटिंग में अनुमति देकर फिर कोशिश करें।", "लोकेशन परवानगी बंद आहे. ब्राउझर सेटिंगमध्ये परवानगी देऊन पुन्हा प्रयत्न करा.")
      : geo.status === "unavailable"
        ? L("Your phone could not find its location. Turn on GPS and try again.", "आपका फ़ोन लोकेशन नहीं ढूँढ सका। GPS चालू करके फिर कोशिश करें।", "तुमचा फोन ठिकाण शोधू शकला नाही. GPS चालू करून पुन्हा प्रयत्न करा.")
        : geo.status === "timeout"
          ? L("Getting your location is taking too long. Move to an open area.", "लोकेशन मिलने में बहुत समय लग रहा है। खुली जगह जाएं।", "ठिकाण मिळण्यास खूप वेळ लागत आहे. मोकळ्या जागी जा.")
          : geo.status === "unsupported"
            ? L("This browser cannot read your location.", "यह ब्राउज़र आपकी लोकेशन नहीं पढ़ सकता।", "हा ब्राउझर तुमचे ठिकाण वाचू शकत नाही.")
            : "";

  const PRIMARY = "w-full cursor-pointer rounded-[14px] py-4 text-[16px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex h-screen flex-col bg-[#f8f9fa]">
      <div className="z-[500] flex shrink-0 items-center justify-between gap-3 bg-brand px-4 py-3 text-white shadow">
        <Link href="/active-work" aria-label={L("Back", "वापस", "परत")} className="flex items-center text-white"><FiArrowLeft size={22} /></Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{jobTitleOf(app, language)}</div>
          <div className="text-[12.5px] opacity-90">
            {route ? `${formatDistance(route.info.distanceMeters)} · ${formatDuration(route.info.durationSeconds)}${arriveAt ? ` · ${L("Arrive about", "लगभग पहुँचेंगे", "सुमारे पोहोचाल")} ${clockTime(arriveAt)}` : ""}` : navigating ? (routing ? L("Calculating route…", "रूट निकाला जा रहा है…", "मार्ग काढत आहे…") : L("Route not available yet", "रूट अभी उपलब्ध नहीं", "मार्ग अजून उपलब्ध नाही")) : L("Navigation not started", "नेविगेशन शुरू नहीं हुआ", "नेव्हिगेशन सुरू नाही")}
          </div>
        </div>
        {routing && route && <span className="text-[12px] opacity-80">{L("Updating…", "अपडेट हो रहा है…", "अपडेट होत आहे…")}</span>}
      </div>

      {nextStep && navigating && <div className="shrink-0 bg-[#1a1a2e] px-4 py-2.5 text-[14px] text-white"><b>{L("Next", "अगला", "पुढे")}:</b> {nextStep}</div>}

      <div className="relative min-h-0 flex-1">
        <MapViewLazy center={markers[markers.length - 1].position} markers={markers} route={route?.info.coordinates} focusKey={navigating ? "nav" : "idle"} />
        <a href={googleMapsDirectionsUrl(dest, here ?? undefined)} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-lg border border-[#ddd] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1a73e8] no-underline shadow">
          <FiExternalLink aria-hidden="true" /> {L("Open in Google Maps", "Google Maps में खोलें", "Google Maps मध्ये उघडा")}
        </a>
      </div>

      <div className="z-[500] max-h-[55vh] shrink-0 overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        <div className="mb-1 text-[15px] font-bold text-[#1a1a1a]">{address || L("Job location", "काम की जगह", "कामाचे ठिकाण")}</div>
        {here && !route && straightKm !== null && <div className="mb-2 text-[13px] text-gray-500">{L("Straight-line distance", "सीधी दूरी", "सरळ अंतर")}: {formatDistance(straightKm * 1000)}</div>}
        {routeProblem && <div role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{routeProblem}{route ? ` ${L("Showing the last route.", "आखिरी रूट दिखाया जा रहा है।", "शेवटचा मार्ग दाखवला आहे.")}` : ""}</div>}
        {geoMessage && <div role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{geoMessage}</div>}
        {actionError && <div role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{actionError}</div>}
        {nearSite && app.status !== "arrived" && <div role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{L("You are close to the site. Tap “I have arrived” when you reach it.", "आप साइट के पास हैं। पहुँचकर “मैं पहुँच गया” दबाएं।", "तुम्ही साइटजवळ आहात. पोहोचल्यावर “मी पोहोचलो” दाबा.")}</div>}

        {!navigating ? (
          <button type="button" disabled={geo.status === "requesting"} onClick={() => void geo.start()} className={`${PRIMARY} bg-brand`}>
            {geo.status === "requesting" ? L("Getting your location…", "आपकी लोकेशन ली जा रही है…", "तुमचे ठिकाण मिळवत आहे…") : L("Start navigation", "नेविगेशन शुरू करें", "नेव्हिगेशन सुरू करा")}
          </button>
        ) : (
          <button type="button" onClick={geo.stop} className="w-full cursor-pointer rounded-[14px] border border-slate-300 bg-white py-3 text-[15px] font-semibold text-slate-700">
            {L("Stop navigation", "नेविगेशन बंद करें", "नेव्हिगेशन थांबवा")}
          </button>
        )}
        <p className="mb-0 mt-2 text-center text-[12px] text-gray-500">{L("Text directions only. For voice turn-by-turn, open Google Maps.", "सिर्फ़ टेक्स्ट दिशा-निर्देश। आवाज़ वाले दिशा-निर्देश के लिए Google Maps खोलें।", "फक्त मजकूर दिशा. आवाजी दिशांसाठी Google Maps उघडा.")}</p>

        <LocationSharePanel app={app} />

        <div className="mt-4 flex flex-col gap-3">
          {app.status === "confirmed" && <button type="button" disabled={actionBusy} onClick={() => void act(() => updateApplicationStatus(app._id, "on_the_way"))} className={`${PRIMARY} bg-amber-500`}>{L("I am on the way", "मैं रास्ते में हूँ", "मी मार्गावर आहे")}</button>}
          {(app.status === "confirmed" || app.status === "on_the_way") && <button type="button" disabled={actionBusy} onClick={() => void act(() => updateApplicationStatus(app._id, "arrived"))} className={`${PRIMARY} bg-emerald-500`}>{L("I have arrived", "मैं पहुँच गया", "मी पोहोचलो")}</button>}
          {app.status === "arrived" && !app.completionRequestedAt && (
            <button type="button" disabled={actionBusy} onClick={() => void act(() => requestCompletion(app._id), () => void setLocationConsent(app._id, false).catch(() => {}))} className={`${PRIMARY} bg-violet-500`}>{L("Work is finished", "काम पूरा हुआ", "काम पूर्ण झाले")}</button>
          )}
          {app.status === "arrived" && app.completionRequestedAt && (
            <div className="rounded-[14px] border-2 border-emerald-500 bg-green-50 py-4 text-center text-[15px] font-bold text-emerald-800">{L("Waiting for the employer to confirm", "नियोक्ता की पुष्टि का इंतज़ार", "मालकाच्या पुष्टीची प्रतीक्षा")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
