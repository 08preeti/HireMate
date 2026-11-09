import { API_URL } from "@/config/env";
import { getToken } from "@/lib/session";
import { parseSse } from "@/lib/sse";
import type { AppNotification } from "@/types";

interface Handlers {
  onOpen: () => void;
  onClose: () => void;
  onNotification: (n: AppNotification) => void;
}

/**
 * One authenticated stream of this user's own notifications (the server decides who the user is from the
 * token). Reconnects with backoff; polling in the bell keeps working whenever the stream is down.
 */
export function openNotificationStream({ onOpen, onClose, onNotification }: Handlers): () => void {
  let stopped = false;
  let attempt = 0;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connect = async () => {
    const token = getToken();
    if (!token || stopped) return;
    controller = new AbortController();
    try {
      const res = await fetch(`${API_URL}/api/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        stopped = true;
        return;
      }
      if (!res.ok || !res.body) throw new Error(`stream status ${res.status}`);
      attempt = 0;
      onOpen();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer);
        buffer = parsed.rest;
        for (const message of parsed.messages) {
          if (message.event !== "notification") continue;
          try {
            onNotification(JSON.parse(message.data) as AppNotification);
          } catch {
            continue;
          }
        }
      }
    } catch {
      // network error or aborted: fall through to the reconnect below
    }
    onClose();
    if (!stopped) {
      attempt += 1;
      timer = setTimeout(() => void connect(), Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5)));
    }
  };

  void connect();
  return () => {
    stopped = true;
    controller?.abort();
    clearTimeout(timer);
  };
}
