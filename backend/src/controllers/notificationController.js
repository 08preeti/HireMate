import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  setPreferences,
} from "../services/notificationService.js";
import { formatEvent, hubKey, subscribe } from "../services/notificationHub.js";
import { sendError } from "../utils/httpError.js";

export async function list(req, res) {
  try {
    res.json(await listNotifications(req.auth, req.query));
  } catch (err) {
    sendError(res, err, "Failed to load notifications");
  }
}

export async function unreadCount(req, res) {
  try {
    res.json(await getUnreadCount(req.auth));
  } catch (err) {
    sendError(res, err, "Failed to load unread count");
  }
}

export async function read(req, res) {
  try {
    res.json(await markRead(req.auth, req.params.id));
  } catch (err) {
    sendError(res, err, "Failed to update notification");
  }
}

export async function readAll(req, res) {
  try {
    res.json(await markAllRead(req.auth));
  } catch (err) {
    sendError(res, err, "Failed to update notifications");
  }
}

export async function remove(req, res) {
  try {
    res.json(await deleteNotification(req.auth, req.params.id));
  } catch (err) {
    sendError(res, err, "Failed to delete notification");
  }
}

const HEARTBEAT_MS = 25_000;
const STREAM_MAX_MS = 30 * 60_000;

// One long-lived response per tab. The recipient comes from the verified token only, never from the request.
export function stream(req, res) {
  const key = hubKey(req.auth.role, req.auth.id);
  req.socket.setTimeout(0);
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write("retry: 5000\n\n");

  const unsubscribe = subscribe(key, {
    send: (event, data, id) => res.write(formatEvent({ event, data, id })),
    close: () => res.end(),
  });
  res.write(formatEvent({ event: "ready", data: {} }));

  const ping = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
  const expire = setTimeout(() => res.end(), STREAM_MAX_MS);
  req.on("close", () => {
    clearInterval(ping);
    clearTimeout(expire);
    unsubscribe();
  });
}

export async function preferences(req, res) {
  try {
    res.json(await getPreferences(req.auth));
  } catch (err) {
    sendError(res, err, "Failed to load preferences");
  }
}

export async function updatePreferences(req, res) {
  try {
    res.json(await setPreferences(req.auth, req.body));
  } catch (err) {
    sendError(res, err, "Failed to save preferences");
  }
}
