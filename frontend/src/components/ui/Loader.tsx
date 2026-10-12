/** Neutral placeholder shown while the session is read or a redirect is in flight. */
export default function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center font-plain" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-gray-500 text-[14px]">
        <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-brand animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}
