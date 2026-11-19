"use client";

import { useEffect, useRef } from "react";
import {
  FiArrowUp,
  FiArrowUpLeft,
  FiArrowUpRight,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiCrosshair,
  FiMaximize2,
  FiMoon,
  FiRepeat,
  FiSun,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { useL } from "@/hooks/useL";
import { formatDistance } from "@/lib/maps";
import { speak, stopSpeaking } from "@/lib/speech";
import type { MapTheme, RouteStatus } from "@/types";

export interface ManeuverInfo {
  text: string;
  inMeters: number;
  modifier?: string;
  type?: string;
  streetName?: string;
}

interface Props {
  currentStep: ManeuverInfo | null;
  nextStep?: ManeuverInfo | null;
  routeStatus: RouteStatus;
  theme: MapTheme;
  voiceEnabled: boolean;
  isFollowing: boolean;
  onToggleTheme: () => void;
  onToggleVoice: () => void;
  onRecenter: () => void;
  onFitOverview: () => void;
}

/** Parses instruction text or modifier to determine the appropriate turn icon. */
function getManeuverIcon(step: ManeuverInfo | null) {
  if (!step) return <FiArrowUp size={28} className="text-white" />;
  const mod = (step.modifier || "").toLowerCase();
  const text = (step.text || "").toLowerCase();

  if (mod.includes("u-turn") || mod.includes("uturn") || text.includes("u-turn")) {
    return <FiCornerUpLeft size={28} className="text-amber-400 rotate-180" />;
  }
  if (mod.includes("sharp left") || text.includes("sharp left")) {
    return <FiCornerUpLeft size={28} className="text-amber-400" />;
  }
  if (mod.includes("sharp right") || text.includes("sharp right")) {
    return <FiCornerUpRight size={28} className="text-amber-400" />;
  }
  if (mod.includes("slight left") || text.includes("slight left") || text.includes("slightly left")) {
    return <FiArrowUpLeft size={28} className="text-emerald-400" />;
  }
  if (mod.includes("slight right") || text.includes("slight right") || text.includes("slightly right")) {
    return <FiArrowUpRight size={28} className="text-emerald-400" />;
  }
  if (mod.includes("left") || text.includes("turn left")) {
    return <FiCornerUpLeft size={28} className="text-emerald-400" />;
  }
  if (mod.includes("right") || text.includes("turn right")) {
    return <FiCornerUpRight size={28} className="text-emerald-400" />;
  }
  if (mod.includes("roundabout") || text.includes("roundabout") || text.includes("rotary")) {
    return <FiRepeat size={28} className="text-cyan-400" />;
  }
  if (text.includes("reached") || text.includes("destination") || text.includes("arrived")) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-sm">
        ✓
      </span>
    );
  }
  return <FiArrowUp size={28} className="text-white" />;
}

export default function UberNavHUD({
  currentStep,
  nextStep,
  routeStatus,
  theme,
  voiceEnabled,
  isFollowing,
  onToggleTheme,
  onToggleVoice,
  onRecenter,
  onFitOverview,
}: Props) {
  const { L, language } = useL();
  const lastSpokenKey = useRef<string>("");

  // Automated voice guidance when approaching turn
  useEffect(() => {
    if (!voiceEnabled || !currentStep) return;
    const dist = currentStep.inMeters;
    // Announce when first notified (e.g. ~200m or initial) and close (~40m)
    const promptTier = dist > 150 ? "far" : dist > 20 ? "near" : "immediate";
    const key = `${currentStep.text}-${promptTier}`;

    if (lastSpokenKey.current !== key) {
      lastSpokenKey.current = key;
      let speechText = currentStep.text;
      if (dist > 30) {
        if (language === "hi") {
          speechText = `${dist} मीटर में, ${currentStep.text}`;
        } else if (language === "mr") {
          speechText = `${dist} मीटरमध्ये, ${currentStep.text}`;
        } else {
          speechText = `In ${formatDistance(dist)}, ${currentStep.text}`;
        }
      }
      const bcp = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
      speak(speechText, bcp);
    }
  }, [currentStep?.text, currentStep?.inMeters, voiceEnabled, language]);

  useEffect(() => {
    if (!voiceEnabled) stopSpeaking();
  }, [voiceEnabled]);

  const isRerouting = routeStatus === "rerouting";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-4">
      <div className="mx-auto flex max-w-lg flex-col gap-2">
        {/* Top Turn-by-Turn Card */}
        <div className="pointer-events-auto flex items-stretch overflow-hidden rounded-2xl bg-[#0b132b]/95 text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md border border-slate-700/60">
          {/* Maneuver Icon Box */}
          <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-slate-800 bg-[#1c2541]/90 p-3">
            {getManeuverIcon(currentStep)}
            {currentStep && currentStep.inMeters > 0 && (
              <span className="mt-1 font-mono text-[11px] font-bold text-slate-300">
                {formatDistance(currentStep.inMeters)}
              </span>
            )}
          </div>

          {/* Instruction Text & Distance */}
          <div className="flex flex-1 flex-col justify-center px-4 py-3 min-w-0">
            {isRerouting ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                <span className="text-[15px] font-bold text-cyan-300">
                  {L("Recalculating route…", "नया रूट ढूँढ रहे हैं…", "नवीन मार्ग शोधत आहे…")}
                </span>
              </div>
            ) : currentStep ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-extrabold tracking-tight text-white leading-tight">
                    {currentStep.inMeters > 0
                      ? formatDistance(currentStep.inMeters)
                      : L("Now", "अब", "आता")}
                  </span>
                </div>
                <div className="truncate text-[14.5px] font-semibold text-slate-100">
                  {currentStep.text}
                </div>
                {nextStep && nextStep.inMeters > 0 && (
                  <div className="mt-1 truncate text-[12px] font-medium text-slate-400">
                    <span className="text-slate-300">{L("Then", "फिर", "मग")}:</span> {nextStep.text}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[15px] font-medium text-slate-300">
                {L("Proceed to route…", "रूट की ओर बढ़ें…", "मार्गाकडे पुढे जा…")}
              </div>
            )}
          </div>

          {/* Quick HUD controls inside top banner */}
          <div className="flex flex-col justify-between border-l border-slate-800/80 bg-[#141d36]/60 p-1.5">
            <button
              type="button"
              onClick={onToggleVoice}
              title={voiceEnabled ? L("Mute voice", "आवाज़ बंद करें", "आवाज बंद करा") : L("Unmute voice", "आवाज़ चालू करें", "आवाज चालू करा")}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                voiceEnabled ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
              }`}
            >
              {voiceEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === "night" ? L("Day mode", "दिन मोड", "दिवस मोड") : L("Night mode", "रात मोड", "रात्र मोड")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-white transition"
            >
              {theme === "night" ? <FiSun size={17} className="text-amber-300" /> : <FiMoon size={17} />}
            </button>
          </div>
        </div>

        {/* Floating Quick Action Row */}
        <div className="flex items-center justify-between px-1">
          {/* Follow Worker / Re-center Pill */}
          {!isFollowing && (
            <button
              type="button"
              onClick={onRecenter}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#0b132b]/95 px-3.5 py-1.5 text-[12.5px] font-bold text-cyan-300 shadow-lg backdrop-blur hover:bg-[#1c2541] transition animate-bounce"
            >
              <FiCrosshair size={14} className="text-cyan-400" />
              <span>{L("Re-center on me", "मेरी लोकेशन पर आएँ", "माझ्या स्थानावर या")}</span>
            </button>
          )}

          {/* Overview button */}
          <div className="ml-auto pointer-events-auto">
            <button
              type="button"
              onClick={onFitOverview}
              title={L("Fit entire route", "पूरा रूट देखें", "संपूर्ण मार्ग पहा")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/80 bg-[#0b132b]/90 text-slate-300 shadow-md backdrop-blur hover:text-white"
            >
              <FiMaximize2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
