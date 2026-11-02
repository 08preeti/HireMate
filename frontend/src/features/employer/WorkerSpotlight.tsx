"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WorkerCharacter, {
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

const SPEED = 260; // px per second
const walkMs = (dist: number) =>
  Math.min(2600, Math.max(700, (Math.abs(dist) / SPEED) * 1000));
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/**
 * Tap a worker card → the worker's cartoon walks in from the left edge, reaches the card,
 * the card opens bigger and the worker waves beside it. Tap outside → card closes and the
 * worker walks back out to the left. With "reduce motion" the card simply opens.
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
  const [facing, setFacing] = useState<"right" | "left">("right");
  const [pos, setPos] = useState({ x: -CHAR_W - 12, y: 0, ms: 0 });
  const [origin, setOrigin] = useState({ x: 200, y: 180 });
  const [peek, setPeek] = useState(false); // narrow screens: character peeks over the panel
  const panelRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const rowY = clamp(anchor.top + anchor.height - CHAR_H, 4, vh() - CHAR_H - 4);

  // Lock page scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Where the character stands next to the opened panel.
  const panelSpot = () => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 380;
    const h = el?.offsetHeight ?? 360;
    const left = (vw() - w) / 2;
    const top = (vh() - h) / 2;
    if (left >= CHAR_W * 0.8) {
      return { x: left - CHAR_W * 0.78, y: top + h - CHAR_H, peek: false };
    }
    return { x: left + w - CHAR_W - 14, y: top - CHAR_H * 0.8, peek: true };
  };

  const openPanel = () => {
    setPhase("open");
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (el) {
        const left = (vw() - el.offsetWidth) / 2;
        const top = (vh() - el.offsetHeight) / 2;
        setOrigin({
          x: anchor.left + anchor.width / 2 - left,
          y: anchor.top + anchor.height / 2 - top,
        });
      }
      requestAnimationFrame(() => setShown(true));
    });
  };

  // Mount: walk in, then open.
  useEffect(() => {
    if (reduce) {
      openPanel();
      return;
    }
    const targetX = clamp(anchor.left - CHAR_W * 0.55, 4, vw() - CHAR_W - 4);
    const dist = targetX + CHAR_W;
    const ms = walkMs(dist);
    setPos({ x: -CHAR_W - 12, y: rowY, ms: 0 });
    setWalking(true);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPos({ x: targetX, y: rowY, ms })),
    );
    later(() => {
      setWalking(false); // arrived at the card
      openPanel();
      later(() => {
        // step beside the opened panel, then wave
        const s = panelSpot();
        setPeek(s.peek);
        const move = walkMs(s.x - targetX) / 2;
        setWalking(true);
        setPos({ x: s.x, y: s.y, ms: move });
        later(() => setWalking(false), move);
      }, 260);
    }, ms + 80);
    return () => {
      cancelAnimationFrame(raf);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (phase === "closing") return;
    setPhase("closing");
    setShown(false);
    if (reduce) {
      later(onClose, 180);
      return;
    }
    later(() => {
      setFacing("left");
      setWalking(true);
      const ms = walkMs(pos.x + CHAR_W + 12);
      setPos((p) => ({ x: -CHAR_W - 16, y: p.y, ms }));
      later(onClose, ms + 60);
    }, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <div
        onClick={close}
        className="fixed inset-0 z-[70] bg-slate-900/35 transition-opacity duration-200"
        style={{ opacity: phase === "closing" ? 0 : 1 }}
        aria-hidden="true"
      />

      {phase !== "walking" && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center p-4 pointer-events-none">
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
      )}

      {!reduce && (
        <div
          className="fixed left-0 top-0 pointer-events-none"
          style={{
            zIndex: peek && !walking ? 71 : 73, // when peeking, the panel covers the lower body
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: pos.ms ? `transform ${pos.ms}ms linear` : "none",
          }}
        >
          <WorkerCharacter
            kind={kind}
            gender={gender}
            walking={walking}
            waving={phase === "open" && !walking}
            facing={facing}
          />
        </div>
      )}
    </>
  );
}
