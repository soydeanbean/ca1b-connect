// src/types/Notification.ts

export type NotificationCategory = "major" | "minor";

export type NotificationType = "announcement" | "global_activity" | "task_reminder";

export type AppNotification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: unknown;
};