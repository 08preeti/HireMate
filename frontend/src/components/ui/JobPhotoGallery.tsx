"use client";

import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

interface Props {
  urls: string[];
  alt: string;
}

/** Photos of a job on its details page: a large photo, thumbnails below, and tap-to-enlarge. */
export default function JobPhotoGallery({ urls, alt }: Props) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const shown = urls.filter((u) => !failed.has(u));
  const i = Math.min(active, shown.length - 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setActive((a) => (a + 1) % shown.length);
      if (e.key === "ArrowLeft") setActive((a) => (a - 1 + shown.length) % shown.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shown.length]);

  if (!shown.length) return null;
  const fail = (u: string) => setFailed((s) => new Set(s).add(u));

  return (
    <div className="border-b border-[#e6ecf5] bg-[#f3f6fb]">
      <button type="button" onClick={() => setOpen(true)} aria-label={`${alt} — enlarge photo`} className="block h-[220px] w-full cursor-zoom-in overflow-hidden sm:h-[320px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown[i]} alt={`${alt} (${i + 1}/${shown.length})`} onError={() => fail(shown[i])} className="h-full w-full object-cover" />
      </button>

      {shown.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2.5">
          {shown.map((u, n) => (
            <button key={u} type="button" onClick={() => setActive(n)} aria-label={`Photo ${n + 1}`} aria-current={n === i} className={`h-[58px] w-[78px] shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${n === i ? "border-[#1a6cf0]" : "border-transparent opacity-80 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><FiX size={22} /></button>
          {shown.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + shown.length) % shown.length); }} aria-label="Previous photo" className="absolute left-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><FiChevronLeft size={24} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % shown.length); }} aria-label="Next photo" className="absolute right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><FiChevronRight size={24} /></button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown[i]} alt={alt} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}