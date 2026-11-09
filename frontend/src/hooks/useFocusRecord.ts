"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FOCUS_RECORD_EVENT } from "@/lib/notificationEvents";

const HIGHLIGHT = ["ring-2", "ring-blue-500", "ring-offset-2"];

/** When the URL ends in #app-<id> (from a notification), scrolls to that card and highlights it briefly. */
export function useFocusRecord(): void {
  const pathname = usePathname();
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | undefined;
    let fade: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      clearInterval(poll);
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!/^app-[a-f0-9]{24}$/i.test(id)) return;
      let tries = 0;
      poll = setInterval(() => {
        const el = document.getElementById(id);
        if (el) {
          clearInterval(poll);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add(...HIGHLIGHT);
          fade = setTimeout(() => el.classList.remove(...HIGHLIGHT), 3500);
        } else if (++tries > 25) clearInterval(poll);
      }, 200);
    };
    run();
    window.addEventListener(FOCUS_RECORD_EVENT, run);
    window.addEventListener("hashchange", run);
    return () => {
      clearInterval(poll);
      clearTimeout(fade);
      window.removeEventListener(FOCUS_RECORD_EVENT, run);
      window.removeEventListener("hashchange", run);
    };
  }, [pathname]);
}
