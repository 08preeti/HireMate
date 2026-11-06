import { initialsOf } from "./helpers";

interface WorkerAvatarProps {
  name: string;
  size?: "sm" | "lg";
}

/** The data has no profile photos, so workers are shown by their initials. */
export default function WorkerAvatar({ name, size = "sm" }: WorkerAvatarProps) {
  const cls = size === "lg" ? "w-[72px] h-[72px] rounded-2xl text-[24px] bg-slate-900 text-white" : "w-12 h-12 rounded-xl text-[16px] bg-slate-100 text-slate-700";
  return (
    <span aria-hidden className={`${cls} shrink-0 font-bold flex items-center justify-center`}>
      {initialsOf(name)}
    </span>
  );
}
