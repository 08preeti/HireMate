"use client";

import { useEffect, type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger = false, busy = false, children, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[rgba(11,27,61,0.5)] p-5" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(11,27,61,0.3)]"
      >
        <h3 id="confirm-title" className="m-0 text-[18px] font-bold text-[#0b1b3d]">{title}</h3>
        <p className="mb-0 mt-2 text-[14.5px] leading-relaxed text-[#5b6a88]">{message}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="cursor-pointer rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0b1b3d] hover:bg-[#f6f8fc] disabled:cursor-not-allowed disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`cursor-pointer rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${danger ? "bg-[#d6203a] hover:bg-[#b4233a]" : "bg-[#1f6bff] hover:bg-[#1859d6]"}`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
