// src/types/Notification.ts

export type NotificationType = "major" | "minor";

export type NotificationCategory =
  | "event"
  | "assignment"
  | "announcement"
  | "activity"
  | "todo_reminder"
  | "deadline"
  | "attendance"
  | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  /** The UID of who triggered this (null for system) */
  senderUid: string | null;
  /** If this notification targets everyone */
  global: boolean;
  /** If global=false, this is the list of targeted UIDs */
  targetUids: string[];
  /** Link to navigate to when clicked */
  link?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  createdAt: unknown;
};

export type UserNotification = {
  id: string;
  notificationId: string;
  uid: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt: unknown | null;
  createdAt: unknown;
};