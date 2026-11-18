"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/** Keeps the screen on while navigating (a sleeping screen makes the browser pause GPS). Silently does nothing where unsupported. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const api = (navigator as WakeLockNavigator).wakeLock;
    if (!active || !api) return;
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await api.request("screen");
        if (cancelled) void next.release().catch(() => {});
        else lock = next;
      } catch {
        // Denied or low battery: navigation still works.
      }
    };
    // The browser drops the lock whenever the tab is hidden, so ask again when it is visible.
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
