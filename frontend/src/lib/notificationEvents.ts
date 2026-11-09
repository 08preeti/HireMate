/** A notification arrived live (detail: the notification). */
export const NOTIFICATION_EVENT = "hiremate:notification";
/** Something changed a notification (read / deleted); the bell should refetch its count. */
export const NOTIFICATIONS_CHANGED = "hiremate:notifications-changed";
/** The URL hash names a record: scroll to it. */
export const FOCUS_RECORD_EVENT = "hiremate:focus-record";

export const announceNotificationsChanged = (): void => {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
};
