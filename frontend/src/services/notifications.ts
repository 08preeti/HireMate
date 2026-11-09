import api from "./api";
import type { NotificationFilter, NotificationsResponse } from "@/types";

export const getNotifications = (filter: NotificationFilter = "all", page = 1, limit = 15): Promise<NotificationsResponse> =>
  api.get<NotificationsResponse>(`/api/notifications?filter=${filter}&page=${page}&limit=${limit}`, true);

export const getUnreadCount = (): Promise<{ unreadCount: number }> =>
  api.get<{ unreadCount: number }>("/api/notifications/unread-count", true);

export const markNotificationRead = (id: string): Promise<unknown> =>
  api.patch(`/api/notifications/${id}/read`, {}, true);

export const markAllNotificationsRead = (): Promise<unknown> => api.patch("/api/notifications/read-all", {}, true);

export const deleteNotification = (id: string): Promise<unknown> => api.delete(`/api/notifications/${id}`, true);

export const getNotificationPreferences = (): Promise<{ jobMatches: boolean }> => api.get("/api/notifications/preferences", true);

export const setNotificationPreferences = (jobMatches: boolean): Promise<{ jobMatches: boolean }> => api.patch("/api/notifications/preferences", { jobMatches }, true);
