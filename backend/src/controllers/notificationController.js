import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from "../services/notificationService.js";
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
