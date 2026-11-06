"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FiFileText, FiTrash2, FiUpload } from "react-icons/fi";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { SectionCard } from "@/components/worker/WorkerUi";
import { useL } from "@/hooks/useL";
import type { Worker } from "@/types";

interface StoredDoc {
  name: string;
  type: string;
  dataUrl: string;
  addedAt: string;
}
interface LocalDocs {
  aadhaar?: StoredDoc;
  licence?: StoredDoc;
  other?: StoredDoc[];
}
type Slot = "aadhaar" | "licence" | "other";
const MAX_OTHER = 5;

/** Images are shrunk to ~1280px JPEG so they fit in browser storage; PDFs must be under 1 MB. */
async function fileToStoredDoc(file: File): Promise<StoredDoc> {
  const read = () =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Could not read the file"));
      r.readAsDataURL(file);
    });
  const addedAt = new Date().toISOString();
  if (file.type === "application/pdf") {
    if (file.size > 1024 * 1024) throw new Error("PDF must be under 1 MB");
    return { name: file.name, type: file.type, dataUrl: await read(), addedAt };
  }
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo or a PDF");
  const src = await read();
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not read the image"));
    i.src = src;
  });
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { name: file.name, type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.75), addedAt };
}

export default function ProfileDocuments({ worker }: { worker: Worker }) {
  const { L } = useL();
  const key = `workerDocs_${worker._id || worker.phone}`;
  const [docs, setDocs] = useState<LocalDocs>({});
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<{ slot: Slot; index: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<Slot>("aadhaar");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setDocs(raw ? (JSON.parse(raw) as LocalDocs) : {});
    } catch {
      setDocs({});
    }
  }, [key]);

  const persist = (next: LocalDocs) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setDocs(next);
    } catch {
      toast(L("Not enough storage on this device. Try a smaller file.", "इस डिवाइस पर जगह कम है। छोटी फ़ाइल चुनें।", "या डिव्हाइसवर जागा कमी आहे. लहान फाइल निवडा."), "error");
    }
  };

  const pick = (slot: Slot) => {
    slotRef.current = slot;
    inputRef.current?.click();
  };

  const onChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const slot = slotRef.current;
    setBusy(true);
    try {
      const doc = await fileToStoredDoc(file);
      persist(slot === "other" ? { ...docs, other: [...(docs.other || []), doc].slice(-MAX_OTHER) } : { ...docs, [slot]: doc });
      toast(L("Document saved on this device.", "दस्तावेज़ इस डिवाइस पर सेव हुआ।", "कागदपत्र या डिव्हाइसवर सेव्ह झाले."), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    }
    setBusy(false);
  };

  const remove = () => {
    if (!removing) return;
    if (removing.slot === "other") persist({ ...docs, other: (docs.other || []).filter((_, i) => i !== removing.index) });
    else {
      const next = { ...docs };
      delete next[removing.slot];
      persist(next);
    }
    setRemoving(null);
  };

  const view = (d: StoredDoc) => {
    const w = window.open();
    if (w) {
      w.document.write(d.type === "application/pdf" ? `<iframe src="${d.dataUrl}" style="border:0;width:100%;height:100vh"></iframe>` : `<img src="${d.dataUrl}" style="max-width:100%">`);
      w.document.title = d.name;
    }
  };

  const row = (title: string, items: { doc: StoredDoc; index: number }[], slot: Slot) => (
    <div className="rounded-xl border border-[#e6ecf5] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[14.5px] font-semibold text-[#0b1b3d]"><FiFileText size={16} aria-hidden="true" />{title}</span>
        {(slot !== "other" ? items.length === 0 : items.length < MAX_OTHER) && (
          <button type="button" onClick={() => pick(slot)} disabled={busy} className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#e9f1ff] px-3 py-1.5 text-[13px] font-semibold text-[#1a4fb0] hover:bg-[#d9e8ff] disabled:opacity-50">
            <FiUpload size={14} aria-hidden="true" /> {L("Upload", "अपलोड", "अपलोड")}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mb-0 mt-2 text-[13px] text-[#8a96ae]">{L("Not added", "जोड़ा नहीं", "जोडलेले नाही")}</p>
      ) : (
        <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
          {items.map(({ doc, index }) => (
            <li key={`${doc.addedAt}-${index}`} className="flex items-center justify-between gap-2 text-[13.5px]">
              <button type="button" onClick={() => view(doc)} className="min-w-0 cursor-pointer truncate bg-transparent p-0 text-left font-medium text-[#1a4fc4] hover:underline">{doc.name}</button>
              <button type="button" onClick={() => setRemoving({ slot, index })} aria-label={L("Remove document", "दस्तावेज़ हटाएँ", "कागदपत्र काढा")} className="cursor-pointer rounded-md p-1.5 text-[#8a96ae] hover:bg-[#fff1f3] hover:text-[#d6203a]">
                <FiTrash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <SectionCard title={L("ID & documents", "पहचान और दस्तावेज़", "ओळख आणि कागदपत्रे")}>
      <p className="mb-4 mt-0 text-[13px] text-[#5b6a88]">{L("Files are saved on this device only and are never shown to employers. Photo or PDF under 1 MB.", "फ़ाइलें केवल इस डिवाइस पर सेव रहती हैं और नियोक्ताओं को नहीं दिखतीं। फोटो या 1 MB से छोटी PDF।", "फाइल्स फक्त या डिव्हाइसवर सेव्ह राहतात आणि मालकांना दिसत नाहीत. फोटो किंवा 1 MB खालील PDF.")}</p>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onChosen} />
      <div className="grid gap-3 sm:grid-cols-3">
        {row(L("Aadhaar Card", "आधार कार्ड", "आधार कार्ड"), docs.aadhaar ? [{ doc: docs.aadhaar, index: 0 }] : [], "aadhaar")}
        {row(L("Driving License", "ड्राइविंग लाइसेंस", "ड्रायव्हिंग लायसन्स"), docs.licence ? [{ doc: docs.licence, index: 0 }] : [], "licence")}
        {row(L("Other Documents", "अन्य दस्तावेज़", "इतर कागदपत्रे"), (docs.other || []).map((doc, index) => ({ doc, index })), "other")}
      </div>
      <ConfirmDialog
        open={removing !== null}
        danger
        title={L("Remove this document?", "यह दस्तावेज़ हटाएँ?", "हे कागदपत्र काढायचे?")}
        message={L("It will be deleted from this device.", "यह इस डिवाइस से हट जाएगा।", "हे या डिव्हाइसवरून काढले जाईल.")}
        confirmLabel={L("Remove", "हटाएँ", "काढा")}
        cancelLabel={L("Cancel", "रद्द करें", "रद्द करा")}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />
    </SectionCard>
  );
}
