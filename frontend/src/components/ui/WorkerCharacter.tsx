"use client";

export type CharKind = "cook" | "driver" | "electrician" | "generic";
export type CharGender = "male" | "female";

export const CHAR_W = 64;
export const CHAR_H = 118;

const SKIN = "#f1c27d";
const HAIR = "#1f2937";

const OUTFIT: Record<CharKind, { shirt: string; pants: string; trim: string }> =
  {
    cook: { shirt: "#ffffff", pants: "#475569", trim: "#cbd5e1" },
    driver: { shirt: "#2563eb", pants: "#1e293b", trim: "#1d4ed8" },
    electrician: { shirt: "#f97316", pants: "#1e3a8a", trim: "#fde047" },
    generic: { shirt: "#0d9488", pants: "#334155", trim: "#0f766e" },
  };

/** Cartoon worker. Outfit follows the skill; hair/body follow gender. */
export default function WorkerCharacter({
  kind,
  gender,
  walking = false,
  waving = false,
  facing = "right",
}: {
  kind: CharKind;
  gender: CharGender;
  walking?: boolean;
  waving?: boolean;
  facing?: "right" | "left";
}) {
  const o = OUTFIT[kind];
  const female = gender === "female";
  return (
    <svg
      viewBox={`0 0 ${CHAR_W} ${CHAR_H}`}
      width={CHAR_W}
      height={CHAR_H}
      aria-hidden="true"
      style={{
        display: "block",
        overflow: "visible",
        transform: facing === "left" ? "scaleX(-1)" : undefined,
      }}
    >
      <ellipse cx="32" cy="112" rx="18" ry="3.5" fill="rgba(15,23,42,.18)" />
      <g className={walking ? "hm-bob" : undefined}>
        {/* long hair behind head (female) */}
        {female && (
          <rect x="17" y="18" width="30" height="36" rx="13" fill={HAIR} />
        )}

        {/* legs */}
        <g className={walking ? "hm-leg-a" : undefined}>
          <rect x="22" y="76" width="9" height="30" rx="3" fill={o.pants} />
          <rect x="20" y="103" width="13" height="7" rx="3.5" fill="#111827" />
        </g>
        <g className={walking ? "hm-leg-b" : undefined}>
          <rect x="33" y="76" width="9" height="30" rx="3" fill={o.pants} />
          <rect x="31" y="103" width="13" height="7" rx="3.5" fill="#111827" />
        </g>

        {/* back arm */}
        <g className={walking ? "hm-arm-b" : undefined}>
          <rect
            x="13"
            y="43"
            width="8"
            height="27"
            rx="4"
            fill={o.shirt}
            stroke={o.trim}
            strokeWidth="1"
          />
          <circle cx="17" cy="72" r="4.5" fill={SKIN} />
        </g>

        {/* torso */}
        <rect
          x="19"
          y="40"
          width="26"
          height="40"
          rx="9"
          fill={o.shirt}
          stroke={o.trim}
          strokeWidth="1.2"
        />
        {female && (
          <path
            d="M18 68 L46 68 L51 92 L13 92 Z"
            fill={o.shirt}
            stroke={o.trim}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        )}
        {kind === "cook" && (
          <>
            <circle cx="32" cy="52" r="1.6" fill="#94a3b8" />
            <circle cx="32" cy="60" r="1.6" fill="#94a3b8" />
            <circle cx="32" cy="68" r="1.6" fill="#94a3b8" />
          </>
        )}
        {kind === "electrician" && (
          <>
            <rect x="19" y="56" width="26" height="4" fill="#fde047" />
            <rect x="19" y="66" width="26" height="4" fill="#fde047" />
          </>
        )}
        {kind === "driver" && <path d="M26 40 L32 49 L38 40 Z" fill="#fff" />}

        {/* head */}
        <rect x="28" y="36" width="8" height="6" fill={SKIN} />
        <circle cx="32" cy="26" r="13" fill={SKIN} />
        {/* hair when no hat */}
        {kind === "generic" && (
          <path
            d="M19 25 a13 13 0 0 1 26 0 q-6 -7 -13 -6 q-8 0 -13 6 z"
            fill={HAIR}
          />
        )}
        {female && kind !== "generic" && (
          <path d="M19.5 27 q0 -9 6 -11 q-4 6 -2 13 z" fill={HAIR} />
        )}
        {/* face (looks slightly forward) */}
        <circle cx="29" cy="27" r="1.7" fill="#111827" />
        <circle cx="38" cy="27" r="1.7" fill="#111827" />
        {female && (
          <>
            <path
              d="M26.6 24.8 l-1.6 -1"
              stroke="#111827"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <path
              d="M40.4 24.8 l1.6 -1"
              stroke="#111827"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </>
        )}
        <circle cx="26" cy="31" r="2.2" fill="#f9a8a8" opacity=".55" />
        <circle cx="41" cy="31" r="2.2" fill="#f9a8a8" opacity=".55" />
        <path
          d="M29 32.5 q4 4 8 0"
          stroke={female ? "#be123c" : "#7c2d12"}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        {!female && kind !== "generic" && (
          <path
            d="M21 25 q0 -5 3 -7"
            stroke={HAIR}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* hats */}
        {kind === "cook" && (
          <g fill="#fff" stroke="#cbd5e1" strokeWidth="1.2">
            <circle cx="24" cy="10" r="7" />
            <circle cx="40" cy="10" r="7" />
            <circle cx="32" cy="6" r="8" />
            <rect x="21.5" y="11" width="21" height="9" rx="2" />
          </g>
        )}
        {kind === "driver" && (
          <>
            <path d="M19 23 a13 13 0 0 1 26 0 z" fill="#1e293b" />
            <rect x="30" y="20.5" width="19" height="4" rx="2" fill="#0f172a" />
            <circle cx="32" cy="14" r="1.6" fill="#fbbf24" />
          </>
        )}
        {kind === "electrician" && (
          <>
            <path
              d="M18.5 23 a13.5 13.5 0 0 1 27 0 z"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="1"
            />
            <rect x="29" y="9" width="6" height="14" rx="3" fill="#eab308" />
            <rect
              x="16.5"
              y="21.5"
              width="31"
              height="3.4"
              rx="1.7"
              fill="#eab308"
            />
          </>
        )}

        {/* front arm: swings when walking, waves when greeting */}
        <g className={walking ? "hm-arm-a" : waving ? "hm-wave" : undefined}>
          <rect
            x="43"
            y="43"
            width="8"
            height="27"
            rx="4"
            fill={o.shirt}
            stroke={o.trim}
            strokeWidth="1"
          />
          <circle cx="47" cy="72" r="4.5" fill={SKIN} />
        </g>
      </g>
    </svg>
  );
}
