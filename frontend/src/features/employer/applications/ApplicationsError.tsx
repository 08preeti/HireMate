import { FiAlertCircle } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";

export default function ApplicationsError({ onRetry }: { onRetry: () => void }) {
  const { tr } = useEmployerT();
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center flex flex-col items-center gap-4">
      <FiAlertCircle className="text-[28px] text-rose-500" />
      <p className="m-0 max-w-[420px] text-[14.5px] text-rose-800">{tr("errLoad")}</p>
      <button type="button" onClick={onRetry} className="h-10 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[14px] font-semibold cursor-pointer">
        {tr("ws_retry")}
      </button>
    </div>
  );
}
