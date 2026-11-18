"use client";

import { useEffect, useRef } from "react";
import { FiBriefcase, FiMapPin } from "react-icons/fi";

interface ApplicationSentDialogProps {
  open: boolean;
  /** Trade / job title, already localized */
  jobTitle: string;
  /** Company name; falls back to a generic label when missing */
  company?: string;
  /** Localized location label */
  location?: string;
  /** Translate helper: L(en, hi, mr) */
  L: (en: string, hi: string, mr: string) => string;
  onClose: () => void;
  onViewJobs: () => void;
}

export default function ApplicationSentDialog({
  open,
  jobTitle,
  company,
  location,
  L,
  onClose,
  onViewJobs,
}: ApplicationSentDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const employer = company || L("the employer", "नियोक्ता", "नियोक्ता");

  const steps = [
    L(
      "The employer reviews your application",
      "नियोक्ता आपका आवेदन देखेगा",
      "नियोक्ता तुमचा अर्ज पाहील",
    ),
    L(
      "The employer calls you soon",
      "नियोक्ता जल्द आपको कॉल करेगा",
      "नियोक्ता लवकरच तुम्हाला कॉल करेल",
    ),
    L(
      "Accept the offer and start work",
      "ऑफर स्वीकारें और काम शुरू करें",
      "ऑफर स्वीकारा आणि काम सुरू करा",
    ),
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[rgba(8,20,40,0.55)] p-4 backdrop-blur-[3px] motion-safe:animate-fade-in sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-sent-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_60px_rgba(8,20,40,0.35)] motion-safe:animate-pop-in"
      >
        {/* Confirmation header */}
        <div className="flex flex-col items-center bg-gradient-to-b from-emerald-50 to-white px-7 pb-5 pt-8 text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
            <svg
              viewBox="0 0 24 24"
              className="h-9 w-9"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                className="[stroke-dasharray:24] [stroke-dashoffset:0] motion-safe:[stroke-dashoffset:24] motion-safe:animate-draw-check"
              />
            </svg>
          </div>
          <h2
            id="application-sent-title"
            className="m-0 mt-5 text-[22px] font-extrabold tracking-tight text-slate-900"
          >
            {L("Application sent", "आवेदन भेज दिया गया", "अर्ज पाठवला")}
          </h2>
          <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-slate-500">
            {L(
              `${employer} has received your application.`,
              `${employer} को आपका आवेदन मिल गया है।`,
              `${employer} ला तुमचा अर्ज मिळाला आहे.`,
            )}
          </p>
        </div>

        <div className="px-6 pb-6">
          {/* The job that was applied to */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-light text-brand">
              <FiBriefcase size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-bold text-slate-900">
                {jobTitle}
              </div>
              {location ? (
                <div className="mt-0.5 flex items-center gap-1 text-[12.5px] text-slate-500">
                  <FiMapPin size={12} aria-hidden="true" />
                  <span className="truncate">{location}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* What happens next: a real sequence */}
          <div className="mb-0 mt-5 text-[13px] font-bold text-slate-900">
            {L("What happens next", "आगे क्या होगा", "पुढे काय होईल")}
          </div>
          <ol className="m-0 mt-3 list-none p-0">
            {steps.map((text, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {!last && (
                    <span
                      className="absolute left-[11px] top-6 h-[calc(100%-20px)] w-px bg-slate-200"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      i === 0
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-300 bg-white text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`pt-[2px] text-[13.5px] leading-snug ${
                      i === 1 ? "font-semibold text-brand" : "text-slate-600"
                    }`}
                  >
                    {text}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              ref={primaryRef}
              type="button"
              onClick={onViewJobs}
              className="w-full cursor-pointer rounded-xl bg-brand px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(0,100,145,0.28)] transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {L("View my jobs", "मेरे काम देखें", "माझी कामे पहा")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full cursor-pointer rounded-xl bg-transparent px-4 py-2.5 text-[14px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {L("Keep browsing", "और काम देखें", "आणखी कामे पहा")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}