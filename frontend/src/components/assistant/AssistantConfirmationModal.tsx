"use client";

import React from "react";
import type { ConfirmationPayload } from "@/types/assistant";

interface ConfirmationModalProps {
  confirmation: ConfirmationPayload;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function AssistantConfirmationModal({
  confirmation,
  onConfirm,
  onCancel,
  isExecuting = false,
}: ConfirmationModalProps) {
  const { title, summary, details, safetyWarning } = confirmation;

  return (
    <div className="p-4 rounded-xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl text-slate-100 my-2 backdrop-blur-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="p-1.5 rounded-full bg-amber-500/20 text-amber-400 text-sm">
          ⚠️
        </span>
        <h4 className="font-bold text-sm tracking-wide text-amber-300">
          {title || "Action Confirmation Required"}
        </h4>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-3">{summary}</p>

      {/* Structured Key Details */}
      {details && Object.keys(details).length > 0 && (
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1 mb-3">
          {Object.entries(details).map(([key, value]) => {
            if (typeof value === "object" || key.toLowerCase().includes("id"))
              return null;
            return (
              <div
                key={key}
                className="flex justify-between items-center text-slate-400"
              >
                <span className="capitalize font-medium text-slate-300">
                  {key.replace(/([A-Z])/g, " $1")}:
                </span>
                <span className="text-slate-100 font-semibold">
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Warning */}
      {safetyWarning && (
        <div className="mb-3 p-2 rounded bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300">
          <span className="font-bold">Notice:</span> {safetyWarning}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={isExecuting}
          onClick={onConfirm}
          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isExecuting ? (
            <>
              <span className="animate-spin text-sm">⚙</span>
              <span>Executing...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Confirm & Proceed</span>
            </>
          )}
        </button>
        <button
          type="button"
          disabled={isExecuting}
          onClick={onCancel}
          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
