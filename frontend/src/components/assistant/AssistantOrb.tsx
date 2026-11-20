"use client";

import type { OrbState } from "@/context/AssistantProvider";

const RING: Record<OrbState, string> = {
  idle: "from-[#1f6bff] via-[#00b4d8] to-[#7c3aed]",
  processing: "from-[#00b4d8] via-[#7c3aed] to-[#1f6bff]",
  confirm: "from-[#f59e0b] via-[#fbbf24] to-[#f59e0b]",
  error: "from-[#f97316] via-[#ef4444] to-[#f97316]",
};

/** Floating launcher. States: idle, processing, waiting for confirmation, error (listening/speaking arrive with voice). */
export default function AssistantOrb({ state, open, onClick, label }: { state: OrbState; open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      className="group relative flex h-14 w-14 items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-[0_8px_28px_rgba(31,107,255,0.45)] outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#1f6bff]/40"
    >
      {state === "processing" && <span className="absolute inset-0 animate-ping rounded-full bg-[#00b4d8]/40 motion-reduce:hidden" />}
      <span className={`absolute inset-0 rounded-full bg-gradient-to-br ${RING[state]} ${state === "processing" ? "animate-spin [animation-duration:3s] motion-reduce:animate-none" : ""}`} />
      <span className="absolute inset-[3px] rounded-full bg-[#071229]" />
      <span className={`relative h-5 w-5 rounded-full bg-gradient-to-br ${RING[state]} shadow-[0_0_16px_rgba(0,180,216,0.9)] ${state === "idle" || state === "confirm" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
    </button>
  );
}
