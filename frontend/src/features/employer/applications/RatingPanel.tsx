import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useEmployerT, type EmployerKey } from "@/i18n/employerText";
import { rateApplication } from "@/services/applications";
import type { Application } from "@/types";
import { money, nameOf, phoneOf, wageOf } from "./helpers";

const SCORES = ["5", "4", "3", "2", "1"];
const PREF_KEY = "hm_preferred_workers";

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
};

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <span className="inline-flex gap-1 text-[22px] leading-none">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star`}
          className={`${n <= value ? "text-amber-400" : "text-slate-300"} ${onChange ? "cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

interface RatingPanelProps {
  application: Application;
  onRated: () => void;
}

export default function RatingPanel({ application: a, onRated }: RatingPanelProps) {
  const { tr } = useEmployerT();
  const draftKey = `hm_rating_draft_${a._id}`;
  const prefId = phoneOf(a) || a._id;
  const draft = typeof window === "undefined" ? null : readJSON<{ rating?: string; notes?: string } | null>(draftKey, null);

  const [rating, setRating] = useState(draft?.rating || "5");
  const [notes, setNotes] = useState(draft?.notes || "");
  const [preferred, setPreferred] = useState(() => typeof window !== "undefined" && readJSON<string[]>(PREF_KEY, []).includes(prefId));
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const wage = wageOf(a.job);
  const name = nameOf(a);

  if (a.rating) {
    return (
      <div>
        <h4 className="m-0 text-[15px] font-bold text-slate-900">{tr("yourRating")}</h4>
        <div className="mt-2 flex items-center gap-3">
          <Stars value={a.rating} />
          <span className="text-[14.5px] font-semibold text-slate-700">{a.rating.toFixed(1)} / 5</span>
        </div>
        {a.review && <p className="mt-3 mb-0 rounded-lg bg-slate-50 border border-slate-200 p-3 text-[14px] text-slate-700">{a.review}</p>}
      </div>
    );
  }

  const saveDraft = () => {
    writeJSON(draftKey, { rating, notes });
    setSavedMsg(tr("draftSaved"));
    window.setTimeout(() => setSavedMsg(""), 2000);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await rateApplication(a._id, { rating: Number(rating), review: notes });
      const pool = readJSON<string[]>(PREF_KEY, []).filter((x) => x !== prefId);
      writeJSON(PREF_KEY, preferred ? [...pool, prefId] : pool);
      window.localStorage.removeItem(draftKey);
      onRated();
    } catch (err) {
      console.error(err);
      setError(tr("failedRating"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-[16px] font-bold text-slate-900">{tr("rateClose")}</h4>
          <p className="m-0 mt-0.5 text-[13.5px] text-slate-500">{tr("rateSub")}</p>
        </div>
        {a.status === "completed" && (
          <span className="shrink-0 rounded-md bg-emerald-50 text-emerald-700 text-[12.5px] font-medium px-2.5 py-1">{tr("shiftCompletedChip")}</span>
        )}
      </div>

      <label className="block mt-4 text-[14px] font-semibold text-slate-800">{tr("perfScore")}</label>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full h-11 appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-slate-800 outline-none focus:border-blue-500"
          >
            {SCORES.map((s) => (
              <option key={s} value={s}>
                {tr(`score_${s}` as EmployerKey)}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <div className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 flex items-center justify-between">
          <Stars value={Number(rating)} onChange={(n) => setRating(String(n))} />
          <span className="text-[14px] font-semibold text-slate-700">{Number(rating).toFixed(1)} / 5</span>
        </div>
      </div>

      <label className="block mt-4 text-[14px] font-semibold text-slate-800">{tr("managerNotes")}</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder={tr("notesPlaceholder", { name })}
        className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-blue-500"
      />

      <label className="mt-3 flex items-center gap-3 text-[14px] text-slate-700 cursor-pointer">
        <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} className="w-[18px] h-[18px] accent-slate-900" />
        {tr("preferred", { name })}
      </label>

      {error && (
        <p role="alert" className="mt-3 mb-0 text-[13.5px] font-medium text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex-1 h-12 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-[14.5px] font-semibold cursor-pointer"
        >
          {busy ? tr("submitting") : `${tr("submitRating")}${wage ? ` (${money(wage)})` : ""}`}
        </button>
        <button
          type="button"
          onClick={saveDraft}
          className="h-12 px-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[14px] font-semibold cursor-pointer"
        >
          {savedMsg || tr("saveDraft")}
        </button>
      </div>
    </div>
  );
}
