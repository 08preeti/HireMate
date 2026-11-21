"use client";

import React from "react";
import type { AssistantOrbState } from "@/types/assistant";

interface AssistantOrbProps {
  state: AssistantOrbState;
  size?: number;
  onClick?: () => void;
  className?: string;
  showStatusLabel?: boolean;
}

export function AssistantOrb({
  state,
  size = 48,
  onClick,
  className = "",
  showStatusLabel = false,
}: AssistantOrbProps) {
  // Normalize aliases
  const normalizedState: AssistantOrbState =
    state === "processing" ? "thinking" : state === "action" ? "executing" : state;

  // Visual configuration for the 9 states inspired by Iron Man ARC Reactor & Siri
  const stateConfig: Record<
    string,
    { core: string; ring: string; glow: string; label: string; badge: string }
  > = {
    idle: {
      core: "#00f0ff",
      ring: "rgba(0, 240, 255, 0.45)",
      glow: "rgba(0, 240, 255, 0.4)",
      label: "JARVIS Ready",
      badge: "ONLINE",
    },
    greeting: {
      core: "#facc15",
      ring: "rgba(250, 204, 21, 0.6)",
      glow: "rgba(250, 204, 21, 0.6)",
      label: "Greeting You",
      badge: "GREETING",
    },
    listening: {
      core: "#10b981",
      ring: "rgba(16, 185, 129, 0.7)",
      glow: "rgba(16, 185, 129, 0.7)",
      label: "Listening...",
      badge: "LISTENING",
    },
    thinking: {
      core: "#818cf8",
      ring: "rgba(129, 140, 248, 0.7)",
      glow: "rgba(129, 140, 248, 0.8)",
      label: "Thinking...",
      badge: "PROCESSING",
    },
    speaking: {
      core: "#38bdf8",
      ring: "rgba(56, 189, 248, 0.75)",
      glow: "rgba(56, 189, 248, 0.8)",
      label: "Speaking...",
      badge: "SPEAKING",
    },
    executing: {
      core: "#34d399",
      ring: "rgba(52, 211, 153, 0.75)",
      glow: "rgba(52, 211, 153, 0.8)",
      label: "Executing...",
      badge: "EXECUTING",
    },
    confirmation: {
      core: "#fbbf24",
      ring: "rgba(251, 191, 36, 0.8)",
      glow: "rgba(251, 191, 36, 0.85)",
      label: "Approval Needed",
      badge: "CONFIRMATION",
    },
    success: {
      core: "#22c55e",
      ring: "rgba(34, 197, 94, 0.8)",
      glow: "rgba(34, 197, 94, 0.85)",
      label: "Action Complete",
      badge: "SUCCESS",
    },
    error: {
      core: "#f43f5e",
      ring: "rgba(244, 63, 94, 0.8)",
      glow: "rgba(244, 63, 94, 0.85)",
      label: "Attention Required",
      badge: "ERROR",
    },
  };

  const current = stateConfig[normalizedState] || stateConfig.idle;

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`HireMate JARVIS Assistant (${current.label})`}
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-none cursor-pointer group"
      >
        {/* State 1 & 2: Ambient Halo Glow */}
        <div
          className={`absolute inset-0 rounded-full blur-md opacity-80 group-hover:opacity-100 transition-opacity ${
            normalizedState === "listening" || normalizedState === "confirmation"
              ? "animate-ping opacity-40"
              : "animate-pulse"
          }`}
          style={{ backgroundColor: current.glow }}
        />

        {/* State 3: Listening Soundwave Ripple Rings */}
        {normalizedState === "listening" && (
          <>
            <div
              className="absolute -inset-2 rounded-full border border-emerald-400/40 animate-ping"
              style={{ animationDuration: "1.6s" }}
            />
            <div
              className="absolute -inset-3.5 rounded-full border border-emerald-400/20 animate-ping"
              style={{ animationDuration: "2.2s" }}
            />
          </>
        )}

        {/* State 4: Thinking / Processing - Rotating Outer Orbital Ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${
            normalizedState === "thinking"
              ? "animate-spin border-dashed"
              : normalizedState === "executing"
              ? "animate-[spin_1.5s_linear_infinite]"
              : normalizedState === "confirmation"
              ? "animate-pulse"
              : ""
          }`}
          style={{
            borderColor: current.ring,
            animationDuration: normalizedState === "thinking" ? "2.5s" : undefined,
          }}
        />

        {/* Secondary Counter-Rotating Concentric Ring */}
        <div
          className={`absolute inset-1 rounded-full border border-dashed transition-all duration-500 ${
            normalizedState === "thinking"
              ? "animate-[spin_1.8s_linear_infinite_reverse]"
              : normalizedState === "executing"
              ? "animate-[spin_2s_linear_infinite_reverse]"
              : ""
          }`}
          style={{ borderColor: current.core, opacity: 0.7 }}
        />

        {/* Core Futuristic ARC Reactor SVG */}
        <div
          className={`relative z-10 rounded-full flex items-center justify-center shadow-inner overflow-hidden transition-all duration-300 ${
            normalizedState === "speaking"
              ? "scale-105"
              : normalizedState === "confirmation"
              ? "scale-105"
              : ""
          }`}
          style={{
            width: size * 0.72,
            height: size * 0.72,
            background: "radial-gradient(circle, #0f172a 35%, #020617 100%)",
            boxShadow: `0 0 14px ${current.core}`,
          }}
        >
          {/* Geometric Reactor Geometry */}
          <svg
            viewBox="0 0 36 36"
            className="w-full h-full p-1"
            style={{ color: current.core }}
          >
            {/* Outer dotted track */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.75"
            />

            {/* Inner ring */}
            <circle
              cx="18"
              cy="18"
              r="8.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.9"
            />

            {/* Center Core Node */}
            <circle
              cx="18"
              cy="18"
              r="3.5"
              fill="currentColor"
              className={normalizedState === "idle" ? "animate-pulse" : ""}
            />

            {/* State 5: Speaking - Dynamic Audio Waveform Bars */}
            {normalizedState === "speaking" && (
              <>
                <line x1="18" y1="5" x2="18" y2="31" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="animate-pulse" />
                <line x1="13" y1="9" x2="13" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
                <line x1="23" y1="9" x2="23" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
                <line x1="8" y1="13" x2="8" y2="23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" />
                <line x1="28" y1="13" x2="28" y2="23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="animate-pulse" />
              </>
            )}

            {/* State 8: Success Checkmark */}
            {normalizedState === "success" && (
              <polyline
                points="11,18 16,23 25,13"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* State 9: Error Warning Sign */}
            {normalizedState === "error" && (
              <>
                <line x1="18" y1="10" x2="18" y2="20" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                <circle cx="18" cy="24" r="1.2" fill="#f43f5e" />
              </>
            )}

            {/* State 7: Confirmation Alert Ring */}
            {normalizedState === "confirmation" && (
              <circle
                cx="18"
                cy="18"
                r="6"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.8"
                className="animate-ping"
                opacity="0.8"
              />
            )}
          </svg>
        </div>

        {/* High-Tech Status Bead */}
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 z-20 transition-colors shadow-sm"
          style={{ backgroundColor: current.core }}
        />
      </button>

      {showStatusLabel && (
        <span
          className="mt-1.5 text-[9.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-800 text-cyan-300 shadow-md whitespace-nowrap"
        >
          {current.label}
        </span>
      )}
    </div>
  );
}
