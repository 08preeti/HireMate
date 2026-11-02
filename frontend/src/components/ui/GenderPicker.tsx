"use client";

export type Gender = "male" | "female";

/** Two big tap buttons: Male / Female. */
export default function GenderPicker({
  value,
  onChange,
  maleLabel,
  femaleLabel,
}: {
  value: Gender | "";
  onChange: (g: Gender) => void;
  maleLabel: string;
  femaleLabel: string;
}) {
  const opts: { v: Gender; label: string; emoji: string }[] = [
    { v: "male", label: maleLabel, emoji: "👨" },
    { v: "female", label: femaleLabel, emoji: "👩" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.v)}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-[14px] font-semibold transition-all duration-150 ${on ? "border-[#1a6cf0] bg-[#eaf2ff] text-[#1a6cf0]" : "border-[#dbe3f0] bg-white text-[#5b6a85] hover:border-[#1a6cf0]/50"}`}
          >
            <span className="text-[20px]" aria-hidden="true">
              {o.emoji}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
