"use client";

import React from "react";
import { useAssistant } from "@/context/AssistantContext";
import { useAuth } from "@/context/AuthContext";
import { AssistantOrb } from "./AssistantOrb";
import { AssistantHUD } from "./AssistantHUD";

export function HireMateAssistant() {
  const { authenticated } = useAuth();
  const { isOpen, orbState, toggleAssistant } = useAssistant();

  // If user is not authenticated, JARVIS companion is not displayed
  if (!authenticated) return null;

  return (
    <>
      {/* ── Fixed Top-Right Floating AI Orb ── */}
      <div className="fixed top-3.5 right-3.5 sm:right-6 z-[950] flex items-center gap-2 group">
        <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 text-cyan-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-cyan-500/40 shadow-xl pointer-events-none whitespace-nowrap">
          HireMate JARVIS
        </div>
        <AssistantOrb
          state={orbState}
          size={42}
          onClick={toggleAssistant}
          className="shadow-[0_4px_25px_rgba(0,0,0,0.6)] cursor-pointer"
        />
      </div>

      {/* ── Compact Siri / Gemini HUD Overlay ── */}
      <AssistantHUD />
    </>
  );
}
