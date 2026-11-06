"use client";

import { useEffect, useState } from "react";
import { FiStar } from "react-icons/fi";

interface ReviewDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  ratingLabel: string;
  placeholder: string;
  submitLabel: string;
  cancelLabel: string;
  requiredMessage: string;
  busy?: boolean;
  error?: string;
  onSubmit: (rating: number, review: string) => void;
  onCancel: () => void;
}

export default function ReviewDialog({ open, title, subtitle, ratingLabel, placeholder, submitLabel, cancelLabel, requiredMessage, busy = false, error = "", onSubmit, onCancel }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(0);
      setReview("");
      setTouched(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const missing = touched && rating === 0;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[rgba(11,27,61,0.5)] p-5" onClick={() => !busy && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(11,27,61,0.3)]">
        <h2 id="review-title" className="m-0 text-[19px] font-bold text-[#0b1b3d]">{title}</h2>
        {subtitle && <p className="m-0 mt-1 text-[13.5px] text-[#5b6a88]">{subtitle}</p>}
        <p className="m-0 mt-4 text-[13.5px] font-semibold text-[#33415f]">{ratingLabel}</p>
        <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={ratingLabel}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} / 5`} onClick={() => setRating(n)} className="cursor-pointer bg-transparent p-0.5">
              <FiStar size={32} className={n <= rating ? "fill-[#f5b301] text-[#f5b301]" : "text-[#c5cde0]"} />
            </button>
          ))}
        </div>
        {missing && <p role="alert" className="m-0 mt-2 text-[13px] font-medium text-[#d6203a]">{requiredMessage}</p>}
        <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} maxLength={500} placeholder={placeholder} className="mt-4 w-full resize-none rounded-lg border border-[#dde4f0] p-3 text-[14px] outline-none focus:border-[#1f6bff]" />
        {error && <p role="alert" className="m-0 mt-2 text-[13px] font-medium text-[#d6203a]">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="cursor-pointer rounded-lg border border-[#dde4f0] bg-white px-4 py-2.5 text-[14px] font-medium text-[#33415f] hover:bg-[#f6f8fc] disabled:opacity-50">{cancelLabel}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setTouched(true);
              if (rating > 0) onSubmit(rating, review.trim());
            }}
            className="cursor-pointer rounded-lg bg-[#1f6bff] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1859d6] disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
