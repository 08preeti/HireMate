"use client";

import { useRef, useState } from "react";
import { FiCamera, FiStar, FiX } from "react-icons/fi";
import { MAX_JOB_PHOTOS, compressImage } from "@/lib/jobPhotos";

/** One photo in the form: `src` is what the preview shows, `value` is what is sent to the server. */
export interface PhotoItem {
  id: string;
  src: string;
  /** A new photo as a data URL, or "existing:<n>" for a photo the job already has. */
  value: string;
}

let counter = 0;
export const newPhotoId = () => `p${Date.now()}-${counter++}`;

interface Props {
  photos: PhotoItem[];
  onChange: (next: PhotoItem[]) => void;
  disabled?: boolean;
}

export default function JobPhotoPicker({ photos, onChange, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const room = MAX_JOB_PHOTOS - photos.length;

  const add = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError("");
    const chosen = Array.from(files);
    const picked = chosen.slice(0, room);
    if (chosen.length > room) setError(`You can add up to ${MAX_JOB_PHOTOS} photos. Extra photos were skipped.`);
    setBusy(true);
    const added: PhotoItem[] = [];
    for (const file of picked) {
      try {
        const data = await compressImage(file);
        added.push({ id: newPhotoId(), src: data, value: data });
      } catch (e) {
        setError(e instanceof Error ? e.message : "This photo could not be added.");
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (added.length) onChange([...photos, ...added]);
  };

  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));
  const makeCover = (id: string) => {
    const hit = photos.find((p) => p.id === id);
    if (hit) onChange([hit, ...photos.filter((p) => p.id !== id)]);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((p, i) => (
          <div key={p.id} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`Job photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Cover</span>}
            {!disabled && (
              <>
                <button type="button" onClick={() => remove(p.id)} aria-label={`Remove photo ${i + 1}`} className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <FiX size={14} />
                </button>
                {i !== 0 && (
                  <button type="button" onClick={() => makeCover(p.id)} className="absolute bottom-1.5 left-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/80">
                    <FiStar size={11} /> Make cover
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {room > 0 && !disabled && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-red-400 hover:bg-red-50/40 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
          >
            <FiCamera size={22} />
            <span className="text-[12px] font-semibold">{busy ? "Preparing…" : photos.length ? "Add more" : "Add photos"}</span>
          </button>
        )}
      </div>

      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />

      <p className="mt-2.5 text-[12px] text-slate-500">
        Optional. Up to {MAX_JOB_PHOTOS} photos of the site or the work. The first photo is shown on the job card. Photos are shrunk automatically.
      </p>
      {error && <p role="alert" className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p>}
    </div>
  );
}