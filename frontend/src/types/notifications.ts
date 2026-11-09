export type NotificationType =
  | "job_match"
  | "application_submitted"
  | "application_accepted"
  | "application_declined"
  | "application_completed"
  | "new_application"
  | "worker_on_the_way"
  | "worker_arrived"
  | "worker_completed"
  | "offer_confirmed"
  | "offer_rejected"
  | "application_withdrawn"
  | "application_cancelled"
  | "job_closed"
  | "job_updated"
  | "job_filled"
  | "completion_requested"
  | "completion_approved"
  | "completion_rejected"
  | "review_received";

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  job?: string;
  application?: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationFilter = "all" | "unread" | "read";

export interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
