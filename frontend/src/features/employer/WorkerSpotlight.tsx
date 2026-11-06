"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WorkerCharacter, {
  CHAR_FRONT,
  CHAR_GROUND,
  CHAR_H,
  CHAR_W,
  type CharGender,
  type CharKind,
} from "@/components/ui/WorkerCharacter";

export interface Anchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Phase = "walking" | "open" | "closing";

const CRUISE = 150; // px/s – relaxed walking pace
const RAMP_UP = 0.7; // s to reach cruise speed
const RAMP_DOWN = 0.9; // s to ease to a stop
const GAP = 14; // px between the character's front and the popup edge
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/**
 * Tap a worker card → the worker walks in from the left edge, stops right beside the popup,
 * the card opens and the worker waves. Close → the worker turns around and walks back out
 * the way they came. The walk is measured from the real popup rect, so every character
 * covers exactly the same distance. With "reduce motion" the card simply opens.
 */
export default function WorkerSpotlight({
  anchor,
  kind,
  gender,
  onClose,
  children,
}: {
  anchor: Anchor;
  kind: CharKind;
  gender: CharGender;
  onClose: () => void;
  children: ReactNode;
}) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [phase, setPhase] = useState<Phase>(reduce ? "open" : "walking");
  const [shown, setShown] = useState(false); // panel scale/opacity
  const [walking, setWalking] = useState(false);
  const [landed, setLanded] = useState(false); // arrival ring
  const [facing, setFacing] = useState<"right" | "left">("right");
  const [scale, setScale] = useState(0.9);
  const [origin, setOrigin] = useState({ x: 200, y: 180 });

  const panelRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(0); // live ground speed (px/s) → drives the stride
  const xRef = useRef(0); // current character x
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Lock page scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /** Start, stop and ground position, all derived from the popup's real rectangle. */
  const geometry = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = panelRef.current;
    const w = el?.offsetWidth ?? Math.min(400, vw - 32);
    const h = el?.offsetHeight ?? 360;
    const pl = (vw - w) / 2; // popup is centred in the viewport
    const pt = (vh - h) / 2;
    const pr = pl + w;
    const pb = pt + h;

    let s = clamp((vh * 0.36) / CHAR_H, 0.5, 1);
    // Is there room to stand beside the popup (not overlapping it)?
    const fitsBeside = pl - GAP - CHAR_FRONT * s + 40 * s >= 4;

    let x: number;
    let y: number;
    if (fitsBeside) {
      x = pl - GAP - CHAR_FRONT * s;
      y = clamp(pb - 2 - CHAR_GROUND * s, 4, vh - CHAR_H * s - 4);
    } else {
      // narrow screens: stand on the popup's top edge instead
      s = clamp((pt - 8) / CHAR_GROUND, 0.42, s);
      x = Math.min(pr - CHAR_FRONT * s - 12, vw - CHAR_FRONT * s - 4);
      y = pt - 4 - CHAR_GROUND * s;
    }
    const startX = -CHAR_W * s - 24; // fully off-screen on the left
    return { s, x, y, startX };
  };

  const place = (x: number, y: number) => {
    xRef.current = x;
    const n = charRef.current;
    if (n) n.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  };

  /** Trapezoid speed profile: ease in, cruise, ease out; stops exactly on `to`. */
  const walk = (from: number, to: number, y: number, done: () => void) => {
    const dist = Math.abs(to - from);
    const dir = to >= from ? 1 : -1;
    const du = (CRUISE * RAMP_UP) / 2;
    const dd = (CRUISE * RAMP_DOWN) / 2;
    let V = CRUISE;
    let tu = RAMP_UP;
    let td = RAMP_DOWN;
    let tc = 0;
    if (dist >= du + dd) {
      tc = (dist - du - dd) / V;
    } else {
      // very short hop: scale the profile down, keep the same shape
      const k = dist / (du + dd);
      V = CRUISE * Math.sqrt(k);
      tu = RAMP_UP * Math.sqrt(k);
      td = RAMP_DOWN * Math.sqrt(k);
    }
    const total = tu + tc + td;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(total, (now - t0) / 1000);
      let s: number;
      let v: number;
      if (t < tu) {
        s = (V * t * t) / (2 * tu);
        v = (V * t) / tu;
      } else if (t < tu + tc) {
        s = (V * tu) / 2 + V * (t - tu);
        v = V;
      } else {
        const r = t - tu - tc;
        s = (V * tu) / 2 + V * tc + V * r - (V * r * r) / (2 * td);
        v = V * (1 - r / td);
      }
      speedRef.current = t >= total ? 0 : v;
      place(from + dir * (t >= total ? dist : s), y);
      if (t >= total) {
        done();
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const openPanel = () => {
    setPhase("open");
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (el) {
        const left = (window.innerWidth - el.offsetWidth) / 2;
        const top = (window.innerHeight - el.offsetHeight) / 2;
        setOrigin({
          x: anchor.left + anchor.width / 2 - left,
          y: anchor.top + anchor.height / 2 - top,
        });
      }
      requestAnimationFrame(() => setShown(true));
    });
  };

  // Mount: walk in from the left edge to the popup, then open it.
  useEffect(() => {
    if (reduce) {
      openPanel();
      return;
    }
    const g = geometry();
    setScale(g.s);
    place(g.startX, g.y);
    later(() => {
      setWalking(true);
      walk(g.startX, g.x, g.y, () => {
        setWalking(false); // arrived at the popup spot
        setLanded(true);
        later(openPanel, 220);
      });
    }, 150);
    return () => {
      cancelAnimationFrame(raf.current);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (phase === "closing") return;
    setPhase("closing");
    setShown(false);
    setLanded(false);
    if (reduce) {
      later(onClose, 180);
      return;
    }
    later(() => {
      setFacing("left"); // turn around…
      later(() => {
        const g = geometry();
        setWalking(true); // …and walk back to where they came from
        walk(xRef.current, g.startX, g.y, () => {
          setWalking(false);
          later(onClose, 60);
        });
      }, 480);
    }, 240);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the character beside the popup if the window is resized while it is open.
  useEffect(() => {
    if (reduce) return;
    const onResize = () => {
      if (phaseRef.current !== "open") return;
      const g = geometry();
      setScale(g.s);
      place(g.x, g.y);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        onClick={close}
        className="fixed inset-0 z-[70] bg-slate-900/35 transition-opacity duration-200"
        style={{ opacity: phase === "closing" ? 0 : 1 }}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-[72] flex items-center justify-center p-4 pointer-events-none"
        style={{ visibility: phase === "walking" ? "hidden" : "visible" }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.35)] transition-[transform,opacity] duration-300 ease-out"
          style={{
            transformOrigin: `${origin.x}px ${origin.y}px`,
            transform: shown ? "scale(1)" : "scale(.55)",
            opacity: shown ? 1 : 0,
          }}
        >
          {children}
        </div>
      </div>

      {!reduce && (
        <div
          ref={charRef}
          className="fixed left-0 top-0 z-[73] pointer-events-none will-change-transform"
          style={{ transform: "translate3d(-9999px, 0, 0)" }}
        >
          <WorkerCharacter
            kind={kind}
            gender={gender}
            walking={walking}
            waving={phase === "open" && !walking}
            facing={facing}
            scale={scale}
            speedRef={speedRef}
          />
          {landed && (
            <span
              className="hm-ring"
              style={{
                left: 80 * scale,
                top: (CHAR_GROUND - 1) * scale,
                width: 110 * scale,
                height: 26 * scale,
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
