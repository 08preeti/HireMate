"use client";

import { useEffect, useId, useRef, type MutableRefObject } from "react";

export type CharKind = "cook" | "driver" | "electrician" | "generic";
export type CharGender = "male" | "female";

/** Size of the drawing's coordinate space. */
export const CHAR_W = 160;
export const CHAR_H = 300;
/** y of the ground line and x of the front-most point of the standing pose (facing right). */
export const CHAR_GROUND = 290;
export const CHAR_FRONT = 116;
/** Distance (drawing units) the character travels during one full walk cycle (two steps). */
export const CHAR_STRIDE = 215;

type Look = {
  top: string;
  topDk: string;
  trim: string;
  pants: string;
  pantsDk: string;
  shoe: string;
  hair: string;
  hairHi: string;
  eye: string;
};

const LOOK: Record<CharKind, Record<CharGender, Look>> = {
  cook: {
    male: {
      top: "#fafafa", topDk: "#d5dbe5", trim: "#dc2626", pants: "#566273", pantsDk: "#3f4a5a",
      shoe: "#1f2937", hair: "#4a3022", hairHi: "#7a5236", eye: "#7c4a2a",
    },
    female: {
      top: "#fafafa", topDk: "#d5dbe5", trim: "#dc2626", pants: "#566273", pantsDk: "#3f4a5a",
      shoe: "#1f2937", hair: "#5a3a2e", hairHi: "#8a5a45", eye: "#7c4a2a",
    },
  },
  driver: {
    male: {
      top: "#2f6fe4", topDk: "#2150b4", trim: "#fbbf24", pants: "#26334a", pantsDk: "#182236",
      shoe: "#0f172a", hair: "#1b2437", hairHi: "#3a4a72", eye: "#2b4a8a",
    },
    female: {
      top: "#2f6fe4", topDk: "#2150b4", trim: "#fbbf24", pants: "#26334a", pantsDk: "#182236",
      shoe: "#0f172a", hair: "#2a2f55", hairHi: "#56609a", eye: "#2b4a8a",
    },
  },
  electrician: {
    male: {
      top: "#f97316", topDk: "#c2570f", trim: "#fde047", pants: "#27418f", pantsDk: "#1a2d68",
      shoe: "#5b3a1e", hair: "#7a3b14", hairHi: "#b3652d", eye: "#3f6b3a",
    },
    female: {
      top: "#f97316", topDk: "#c2570f", trim: "#fde047", pants: "#27418f", pantsDk: "#1a2d68",
      shoe: "#5b3a1e", hair: "#b4451f", hairHi: "#e07a45", eye: "#3f6b3a",
    },
  },
  generic: {
    male: {
      top: "#14b8a6", topDk: "#0d8d80", trim: "#f43f5e", pants: "#2f3b52", pantsDk: "#212a3c",
      shoe: "#111827", hair: "#f2c230", hairHi: "#fde68a", eye: "#2f7de1",
    },
    female: {
      top: "#14b8a6", topDk: "#0d8d80", trim: "#f43f5e", pants: "#2f3b52", pantsDk: "#212a3c",
      shoe: "#111827", hair: "#e86f9a", hairHi: "#f7a8c4", eye: "#1f9d6b",
    },
  },
};

const SKIN = "#fcd9bc";
const SKIN_DK = "#e9ab8c";
const LINE = "#2a1a16";
const SW = 1.4;

/* ───────────── animation maths ───────────── */
const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const wrap = (p: number) => p - Math.floor(p);
/** Soft bump on a 0‥1 cycle: 1 at `c`, fading with width `w`. */
const bump = (p: number, c: number, w: number) => {
  let d = Math.abs(wrap(p) - c);
  d = Math.min(d, 1 - d);
  return Math.exp(-((d / w) * (d / w)));
};

/** One leg through a full cycle (p = 0 heel strike). Angles in degrees; negative swings forward. */
function leg(p: number) {
  const t = -2 - 25 * Math.cos(TAU * p);
  const s =
    5 +
    62 * bump(p, 0.68, 0.12) +
    12 * bump(p, 0.12, 0.09) +
    14 * bump(p, 0.46, 0.07);
  const swing = bump(p, 0.8, 0.16);
  // keep the sole level on the ground during stance, toe slightly up in swing, heel lifts at push-off
  const f =
    -(t + s) * (1 - swing) - 10 * swing + 16 * bump(p, 0.52, 0.06) - 8 * bump(p, 0.0, 0.05);
  return { t, s, f };
}

/** Arm paired with the opposite leg (pp = that leg's phase). */
function arm(pp: number) {
  const c = Math.cos(TAU * pp);
  const lag = Math.cos(TAU * (pp - 0.1));
  return { sh: -2 - 24 * c, el: -(12 + 16 * (1 + lag) * 0.5) };
}

type Props = {
  kind: CharKind;
  gender: CharGender;
  walking?: boolean;
  waving?: boolean;
  facing?: "right" | "left";
  /** On-screen scale of the drawing (1 = CHAR_W × CHAR_H px). */
  scale?: number;
  /**
   * Optional live ground speed in px/s. When given, the legs follow the real movement
   * (stride length ↔ distance), so feet never skate. Otherwise a fixed cadence is used.
   */
  speedRef?: MutableRefObject<number>;
};

/**
 * Anime-style worker. A small jointed rig (hips, knees, ankles, shoulders, elbows, torso, head,
 * hair, scarf, tunic) is driven procedurally every frame, so starting, stopping, turning around
 * and waving all blend smoothly. Outfit follows the skill; hair/build follow gender.
 */
export default function WorkerCharacter({
  kind,
  gender,
  walking = false,
  waving = false,
  facing = "right",
  scale = 1,
  speedRef,
}: Props) {
  const L = LOOK[kind][gender];
  const female = gender === "female";
  const uid = useId().replace(/:/g, "");
  const el = useRef<Record<string, SVGElement | null>>({});
  const ref = (k: string) => (n: SVGElement | null) => {
    el.current[k] = n;
  };
  const live = useRef({ walking, waving, facing, scale, speedRef, female });
  live.current = { walking, waving, facing, scale, speedRef, female };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const set = (k: string, v: string) => el.current[k]?.setAttribute("transform", v);
    const setA = (k: string, a: string, v: string) => el.current[k]?.setAttribute(a, v);

    const f0 = live.current.facing === "left" ? -1 : 1;
    const S = {
      k: 0, // walk amount 0‥1
      w: 0, // wave amount 0‥1
      phase: 0,
      t: 0,
      flipFrom: f0,
      flipTo: f0,
      flipT: 1,
      blinkAt: 1.6,
      blinkT: -1,
      lastStep: 0,
      puffs: [0, 1, 2, 3].map(() => ({ age: 9, x: 0 })),
      nextPuff: 0,
    };
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const P = live.current;
      S.t += dt;
      const t = S.t;

      /* speed → walk amount + cadence */
      let sp: number;
      if (P.speedRef) sp = P.speedRef.current;
      else sp = P.walking ? 170 * P.scale : 0;
      const kT = smooth(clamp01(sp / 70));
      S.k += (kT - S.k) * (1 - Math.exp(-dt * 14));
      const k = reduce ? 0 : S.k;
      const strideNow = CHAR_STRIDE * P.scale;
      S.phase = wrap(S.phase + (sp / strideNow) * dt);
      const p = S.phase;

      /* wave blend */
      const wT = P.waving && !P.walking ? 1 : 0;
      S.w += (wT - S.w) * (1 - Math.exp(-dt * 7));
      const w = S.w;

      /* turn around */
      const fT = P.facing === "left" ? -1 : 1;
      if (fT !== S.flipTo) {
        const cur = lerp(S.flipFrom, S.flipTo, smooth(clamp01(S.flipT)));
        S.flipFrom = cur;
        S.flipTo = fT;
        S.flipT = 0;
      }
      S.flipT = Math.min(1, S.flipT + dt / 0.45);
      const fe = smooth(S.flipT);
      const flip = lerp(S.flipFrom, S.flipTo, fe);
      const hop = Math.sin(Math.PI * S.flipT) * 7;
      set("root", `translate(80 ${-hop}) scale(${flip.toFixed(3)} 1) translate(-80 0)`);

      /* gait */
      const a = leg(p);
      const b = leg(p + 0.5);
      const idleBreath = Math.sin(t * 1.9);
      set("thighA", `rotate(${(a.t * k).toFixed(2)} 80 156)`);
      set("shinA", `rotate(${(a.s * k).toFixed(2)} 80 222)`);
      set("footA", `rotate(${(a.f * k).toFixed(2)} 80 278)`);
      set("thighB", `rotate(${(b.t * k).toFixed(2)} 80 156)`);
      set("shinB", `rotate(${(b.s * k).toFixed(2)} 80 222)`);
      set("footB", `rotate(${(b.f * k).toFixed(2)} 80 278)`);

      /* body bob: lowest at heel strike, highest at mid-stance */
      const bob = -((1 - Math.cos(TAU * 2 * p)) / 2) * 4.2 * k + idleBreath * 0.5 * (1 - k);
      set("bob", `translate(0 ${bob.toFixed(2)})`);

      /* torso: forward lean + counter-twist, breathing at rest */
      const lean = 3.2 * k + Math.cos(TAU * p) * 1.3 * k + idleBreath * 0.35 * (1 - k);
      const breathe = 1 + idleBreath * 0.006 * (1 - k);
      set(
        "upper",
        `translate(80 160) rotate(${lean.toFixed(2)}) scale(1 ${breathe.toFixed(4)}) translate(-80 -160)`,
      );
      const head = -lean * 0.7 + Math.sin(TAU * 2 * p) * 1.3 * k + Math.sin(t * 1.3) * 0.9 * (1 - k) - w * 3;
      const headT = `rotate(${head.toFixed(2)} 80 84)`;
      set("head", headT);
      set("hairWrap", headT);

      /* arms (near arm swings with the far leg, far arm with the near leg) */
      const an = arm(p + 0.5);
      const af = arm(p);
      const idleA = Math.sin(t * 1.4) * 1.4;
      const wv = -150 + Math.sin(t * 2.2) * 4;
      const wvEl = -28 + Math.sin(t * 9) * 24;
      set(
        "armA",
        `rotate(${lerp(an.sh * k + 3 + idleA * (1 - k), wv, w).toFixed(2)} 80 92)`,
      );
      set(
        "foreA",
        `rotate(${lerp(an.el * k - 8 * (1 - k), wvEl, w).toFixed(2)} 80 134)`,
      );
      set("armB", `rotate(${(af.sh * k - 3 - idleA * (1 - k)).toFixed(2)} 80 92)`);
      set("foreB", `rotate(${(af.el * k - 8 * (1 - k)).toFixed(2)} 80 134)`);

      /* secondary motion: hair, scarf, headband tails, tunic trail the body */
      const dir = P.female ? 1 : -1; // long hair hangs below its pivot, spikes stand above it
      const hairA =
        dir * (5 * k + 3.2 * k * Math.sin(TAU * p - 0.9) + (1 - k) * 1.5 * Math.sin(t * 1.7)) +
        dir * w * 2;
      set("hairLag", `rotate(${hairA.toFixed(2)} 74 44)`);
      const scarf = 22 * k + 9 * k * Math.sin(TAU * 2 * p + 1) + Math.sin(t * 2.1) * 2.5;
      set("scarf", `rotate(${scarf.toFixed(2)} 74 88)`);
      set("scarfTip", `rotate(${(8 * k * Math.sin(TAU * 2 * p + 2.2) + Math.sin(t * 2.7) * 3).toFixed(2)} 60 112)`);
      const band = 16 * k + 7 * k * Math.sin(TAU * 2 * p + 0.4) + Math.sin(t * 2.3) * 2;
      set("band", `rotate(${band.toFixed(2)} 63 36)`);
      const skirt = (2 + 7 * k) * Math.sin(TAU * p + 0.6) + Math.sin(t * 1.5) * 1.2 + 5 * k;
      set("skirt", `rotate(${skirt.toFixed(2)} 80 162)`);

      /* eyes & mouth */
      if (S.blinkT < 0 && t > S.blinkAt) {
        S.blinkT = 0;
        S.blinkAt = t + 2.6 + ((Math.sin(t * 12.9898) + 1) / 2) * 2.4;
      }
      let blink = 1;
      if (S.blinkT >= 0) {
        S.blinkT += dt;
        const x = S.blinkT / 0.16;
        blink = x >= 1 ? 1 : Math.max(0.08, Math.abs(1 - 2 * x));
        if (x >= 1) S.blinkT = -1;
      }
      set("eyes", `translate(0 49) scale(1 ${blink.toFixed(2)}) translate(0 -49)`);
      setA("mouthOpen", "opacity", w > 0.5 ? "1" : "0");
      setA("mouthSmile", "opacity", w > 0.5 ? "0" : "1");

      /* cinematic bits: aura while greeting, speed streaks, dust puffs */
      setA("glow", "opacity", (0.5 * w).toFixed(3));
      setA("streaks", "opacity", (0.55 * smooth(clamp01((sp * 1.0) / (110 * P.scale + 1)))).toFixed(3));
      const dash = -(t * 220) % 36;
      ["s1", "s2", "s3"].forEach((id, i) =>
        setA(id, "stroke-dashoffset", (dash * (1 + i * 0.25)).toFixed(1)),
      );

      const step = Math.floor(p * 2);
      if (k > 0.45 && step !== S.lastStep) {
        const q = S.puffs[S.nextPuff++ % S.puffs.length];
        const front = step % 2 === 0 ? a : b;
        const kx = 80 - 62 * Math.sin((front.t * Math.PI) / 180);
        const ax = kx - 56 * Math.sin(((front.t + front.s) * Math.PI) / 180);
        q.age = 0;
        q.x = ax - 6;
      }
      S.lastStep = step;
      S.puffs.forEach((q, i) => {
        q.age += dt;
        const u = clamp01(q.age / 0.7);
        const n = el.current[`puff${i}`];
        if (!n) return;
        if (u >= 1) {
          n.setAttribute("opacity", "0");
          return;
        }
        n.setAttribute("cx", (q.x - u * 26).toFixed(1));
        n.setAttribute("cy", (287 - u * 9).toFixed(1));
        n.setAttribute("rx", (3 + u * 8).toFixed(1));
        n.setAttribute("ry", (2 + u * 5).toFixed(1));
        n.setAttribute("opacity", (0.55 * (1 - u)).toFixed(3));
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const o = { stroke: LINE, strokeWidth: SW, strokeLinejoin: "round" as const };
  const lash = { stroke: LINE, strokeWidth: 2.2, strokeLinecap: "round" as const, fill: "none" };

  /* ───── pieces ───── */
  const legPaths = (back: boolean, pantsC: string, k: "A" | "B") => (
    <g ref={ref(`thigh${k}`)}>
      <path d="M71 154 Q68 190 72 224 L88 224 Q92 190 89 154 Z" fill={pantsC} {...o} />
      <g ref={ref(`shin${k}`)}>
        <path d="M73 220 Q71 250 75.5 279 L85.5 279 Q89 250 87 220 Z" fill={pantsC} {...o} />
        {/* shinobi-style leg wrap */}
        <path d="M74.2 252 L86.6 252 M74.6 258 L86.2 258 M75 264 L85.8 264" stroke="#f1f5f9" strokeWidth="1.8" opacity={back ? 0.7 : 0.95} />
        <g ref={ref(`foot${k}`)}>
          <path
            d="M71 277 L88 277 Q92 279 102 283 Q113 285 113 289.5 L71 290 Q65.5 290 66 285 Q67 279 71 277 Z"
            fill={L.shoe}
            {...o}
          />
          <path d="M72 285.5 L111 285.5" stroke="#ffffff" strokeOpacity={0.3} strokeWidth="1.2" />
        </g>
      </g>
    </g>
  );

  const armParts = (back: boolean, k: "A" | "B") => {
    const sleeve = back ? L.topDk : L.top;
    return (
      <g ref={ref(`arm${k}`)}>
        <path d="M73.5 90 Q70.5 112 74 135 L86.5 135 Q89.5 112 86.5 90 Q80 85.5 73.5 90 Z" fill={sleeve} {...o} />
        <g ref={ref(`fore${k}`)}>
          <path d="M74.2 132 Q72.2 150 75 167 L85 167 Q87.8 150 85.8 132 Z" fill={sleeve} {...o} />
          <rect x="74.4" y="159.5" width="11.2" height="7" rx="2" fill={L.trim} {...o} />
          {/* hand */}
          <path d="M75 166 Q73 177 77 185 Q80.5 189 84.5 185 Q88.5 177 85 166 Z" fill={back ? SKIN_DK : SKIN} {...o} />
          <path d="M84 170 Q89 172 87.5 178" fill="none" stroke={LINE} strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${CHAR_W} ${CHAR_H}`}
      width={CHAR_W * scale}
      height={CHAR_H * scale}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`${uid}g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="80" cy="289" rx="36" ry="5" fill="rgba(15,23,42,.30)" />

      <g ref={ref("root")}>
        <circle ref={ref("glow")} cx="80" cy="150" r="125" fill={`url(#${uid}g)`} opacity="0" />

        {/* speed streaks trail behind (left of a right-facing body) */}
        <g ref={ref("streaks")} opacity="0" stroke="#e2e8f0" strokeLinecap="round" strokeWidth="2.2">
          <line ref={ref("s1")} x1="-30" y1="118" x2="44" y2="118" strokeDasharray="20 16" />
          <line ref={ref("s2")} x1="-48" y1="176" x2="40" y2="176" strokeDasharray="26 12" />
          <line ref={ref("s3")} x1="-24" y1="232" x2="50" y2="232" strokeDasharray="16 20" />
        </g>

        {/* dust kicked up by each footfall */}
        <g fill="#f1f5f9">
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} ref={ref(`puff${i}`)} cx="0" cy="288" rx="3" ry="2" opacity="0" />
          ))}
        </g>

        <g ref={ref("bob")}>
          {/* hair behind the head (spikes / long hair) */}
          <g ref={ref("hairWrap")}>
            <g ref={ref("hairLag")}>
              {female ? (
                <>
                  <path
                    d="M60 40 Q56 20 80 17 Q104 20 102 42 L104 74 Q86 80 74 74 Q60 78 52 112 Q40 118 44 138 Q58 142 64 124 Q70 100 70 84 Z"
                    fill={L.hair}
                    {...o}
                  />
                  <path d="M52 112 Q46 124 50 134" stroke={L.hairHi} strokeWidth="2" fill="none" strokeLinecap="round" />
                  {/* ponytail tie */}
                  <rect x="58" y="62" width="9" height="5" rx="2" fill={L.trim} {...o} />
                </>
              ) : (
                <path
                  d="M62 44 L46 40 L58 32 L40 22 L60 22 L48 6 L68 14 L68 -2 L80 12 L92 -2 L94 14 L110 8 L102 24 L112 24 L102 40 Z"
                  fill={L.hair}
                  {...o}
                />
              )}
            </g>
          </g>

          {legPaths(true, L.pantsDk, "B")}
          {legPaths(false, L.pants, "A")}

          {/* tunic skirt for the female build */}
          {female && (
            <g ref={ref("skirt")}>
              <path d="M63 156 Q56 184 51 204 Q80 211 109 204 Q104 184 97 156 Z" fill={L.top} {...o} />
              <path d="M54 198 Q80 205 106 198" stroke={L.trim} strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M70 160 L66 204 M80 160 L80 207 M90 160 L94 204" stroke={L.topDk} strokeWidth="1" opacity=".45" fill="none" />
            </g>
          )}

          <g ref={ref("upper")}>
            {armParts(true, "B")}

            {/* neck */}
            <path d="M75 66 L75 88 L87 88 L87 66 Z" fill={SKIN_DK} {...o} />

            {/* torso */}
            <path
              d={
                female
                  ? "M66 90 Q68 83 80 83 Q93 83 96 91 L94 124 Q92 142 96 164 L64 164 Q68 142 66 124 Z"
                  : "M63 90 Q66 83 80 83 Q95 83 98 91 L99 128 Q97 148 99 168 L61 168 Q63 148 62 128 Z"
              }
              fill={L.top}
              {...o}
            />
            <path
              d={female ? "M80 94 L82 164" : "M82 94 L83 168"}
              stroke={L.topDk}
              strokeWidth="1.3"
              fill="none"
            />
            {kind === "cook" && (
              <path d="M66 118 L94 118 L96 152 L64 152 Z" fill="#dfe5ee" {...o} />
            )}
            {/* belt */}
            <rect x={female ? 65 : 62} y="150" width={female ? 30 : 37} height="6.5" rx="2" fill="#2a2f3a" {...o} />
            <rect x="78" y="150.5" width="7" height="5.5" rx="1" fill="#e5c158" stroke={LINE} strokeWidth="1" />

            {kind === "cook" && (
              <>
                <circle cx="86" cy="100" r="1.8" fill="#64748b" />
                <circle cx="86" cy="110" r="1.8" fill="#64748b" />
                <circle cx="86" cy="120" r="1.8" fill="#64748b" />
              </>
            )}
            {kind === "electrician" && (
              <>
                <path d="M62 116 L99 116 L99 123 L62 123 Z" fill="#fde047" stroke={LINE} strokeWidth="1" />
                <path d="M62.5 130 L99 130 L99 137 L62.5 137 Z" fill="#fde047" stroke={LINE} strokeWidth="1" />
                <rect x="86" y="154" width="11" height="14" rx="2.5" fill="#6b4423" {...o} />
                <rect x="64" y="154" width="3.5" height="16" rx="1.5" fill="#94a3b8" stroke={LINE} strokeWidth="1" />
              </>
            )}
            {kind === "driver" && (
              <>
                <rect x="85" y="104" width="9" height="9" rx="1.5" fill="#1d4ed8" {...o} />
                <path d="M62.5 138 L98.5 138" stroke={L.trim} strokeWidth="2.6" />
                <path d="M72 84 L80 99 L88 84 Z" fill="#f8fafc" {...o} />
              </>
            )}
            {kind === "generic" && (
              <>
                <path d="M67 104 L77 104 L77 114 L67 114 Z" fill={L.topDk} stroke={LINE} strokeWidth="1" />
                <circle cx="80" cy="100" r="6" fill="none" stroke="#f8fafc" strokeWidth="1.6" strokeDasharray="22 6" />
              </>
            )}

            {/* collar + scarf */}
            <path d="M68 84 Q80 96 94 84 L92 79 Q80 88 70 79 Z" fill={L.trim} {...o} />
            <g ref={ref("scarf")}>
              <path d="M74 84 Q64 92 58 108 Q56 122 62 128 Q66 118 70 110 Q74 98 80 90 Z" fill={L.trim} {...o} />
              <g ref={ref("scarfTip")}>
                <path d="M60 118 Q54 128 56 140 Q62 134 66 124 Z" fill={L.trim} {...o} />
              </g>
            </g>

            {/* head */}
            <g ref={ref("head")}>
              {/* ear */}
              <ellipse cx="63" cy="50" rx="4" ry="5.2" fill={SKIN_DK} {...o} />
              {/* face (three-quarter view, looking right) */}
              <path
                d="M62 44 Q61 27 81 26 Q100 27 101 44 Q101 56 95 64 Q90 70.5 82 70.5 Q70 70.5 65 58 Q62 52 62 44 Z"
                fill={SKIN}
                {...o}
              />
              <path d="M66 60 Q70 66 78 68" stroke={SKIN_DK} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
              {/* blush */}
              <ellipse cx="78" cy="58" rx="4.5" ry="2.4" fill="#f9a4a4" opacity=".5" />
              <ellipse cx="96" cy="58" rx="3" ry="2.2" fill="#f9a4a4" opacity=".4" />

              <g ref={ref("eyes")}>
                {/* near eye */}
                <ellipse cx="80" cy="49" rx="6.4" ry="7.2" fill="#fff" stroke={LINE} strokeWidth="1" />
                <ellipse cx="82" cy="49.6" rx="4.5" ry="6" fill={L.eye} />
                <ellipse cx="82.4" cy="50.4" rx="2.4" ry="3.6" fill="#1a1020" />
                <circle cx="84" cy="46.6" r="1.9" fill="#fff" />
                <circle cx="80.6" cy="52.6" r="1" fill="#fff" opacity=".85" />
                <path d="M73 46.4 Q76 41.6 82 41.6 Q87.5 42 88 46" {...lash} />
                {/* far eye (foreshortened) */}
                <ellipse cx="95.5" cy="49" rx="4" ry="6.6" fill="#fff" stroke={LINE} strokeWidth="1" />
                <ellipse cx="96.7" cy="49.6" rx="2.9" ry="5.4" fill={L.eye} />
                <ellipse cx="97" cy="50.2" rx="1.6" ry="3.2" fill="#1a1020" />
                <circle cx="97.8" cy="46.8" r="1.4" fill="#fff" />
                <path d="M91.4 46.4 Q94 42.4 98.6 43 Q100.6 43.8 100.8 46.4" {...lash} />
                {female && (
                  <>
                    <path d="M73 46.6 L70.2 44.4" {...lash} strokeWidth={1.6} />
                    <path d="M100.6 45.6 L103 43.6" {...lash} strokeWidth={1.4} />
                  </>
                )}
              </g>
              {/* brows */}
              <path d="M73 39.4 Q79 36.6 87 38.4" stroke={L.hair} strokeWidth="2.1" fill="none" strokeLinecap="round" />
              <path d="M92 38.4 Q96 37 100 38.6" stroke={L.hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              {/* nose + mouth */}
              <path d="M101.2 54 Q103.4 56 101.4 57.4" stroke={LINE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
              <path ref={ref("mouthSmile")} d="M90 63 Q94.5 66.6 99.2 62.6" stroke={female ? "#be123c" : "#8a3b24"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path ref={ref("mouthOpen")} opacity="0" d="M89.6 62 Q94.5 69.5 99.6 61.6 Z" fill="#9f1239" stroke={LINE} strokeWidth="1.1" strokeLinejoin="round" />

              {/* fringe */}
              {female ? (
                <>
                  <path
                    d="M60 46 Q58 21 81 19 Q104 21 102 46 Q98 34 90 34 Q84 27 78 35 Q69 30 64 40 Z"
                    fill={L.hair}
                    {...o}
                  />
                  <path d="M62 44 Q58 60 64 78 Q70 62 68 46 Z" fill={L.hair} {...o} />
                  <path d="M72 26 Q82 22 92 27" stroke={L.hairHi} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
                </>
              ) : (
                <>
                  <path
                    d="M60 44 Q58 21 81 19 Q104 21 102 44 L99 33 L95 44 L89 31 L85 42 L77 30 L73 42 L66 33 Z"
                    fill={L.hair}
                    {...o}
                  />
                  <path d="M70 26 Q80 21 92 26" stroke={L.hairHi} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
                </>
              )}

              {/* headgear */}
              {kind === "cook" && (
                <g fill="#fff" {...o}>
                  <circle cx="70" cy="16" r="9" />
                  <circle cx="94" cy="16" r="9" />
                  <circle cx="82" cy="9" r="11" />
                  <rect x="64" y="18" width="38" height="12" rx="3" />
                  <path d="M64 25 L102 25" stroke="#cbd5e1" />
                </g>
              )}
              {kind === "driver" && (
                <>
                  <path d="M61 34 Q62 12 82 12 Q102 12 102 34 Z" fill="#1e293b" {...o} />
                  <path d="M98 31 Q116 31 118 38 L98 38 Z" fill="#0f172a" {...o} />
                  <circle cx="82" cy="23" r="3" fill={L.trim} stroke={LINE} strokeWidth="1" />
                </>
              )}
              {kind === "electrician" && (
                <>
                  <path d="M60 33 Q61 8 82 8 Q103 8 104 33 Z" fill="#facc15" {...o} />
                  <rect x="77" y="8" width="9" height="25" rx="4" fill="#eab308" {...o} />
                  <rect x="57" y="31" width="52" height="6" rx="3" fill="#eab308" {...o} />
                  <circle cx="82" cy="21" r="3.2" fill="#fff7c2" stroke={LINE} strokeWidth="1" />
                </>
              )}
              {kind === "generic" && (
                <>
                  <g ref={ref("band")}>
                    <path d="M63 35 Q48 40 40 58 L49 60 Q54 47 64 42 Z" fill="#1e3a8a" {...o} />
                  </g>
                  <path d="M61 32 Q81 24 102 32 L102 40 Q81 32 61 40 Z" fill="#1e3a8a" {...o} />
                  <rect x="73" y="30" width="19" height="10" rx="2" fill="#cbd5e1" {...o} />
                  <path d="M78 35 Q80 31.6 83 34 Q85.6 36.4 88 33.4" stroke="#475569" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                </>
              )}
            </g>

            {armParts(false, "A")}
          </g>
        </g>
      </g>
    </svg>
  );
}
