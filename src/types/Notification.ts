// src/types/Notification.ts

export type NotificationCategory = "major" | "minor";

export type NotificationType = "announcement" | "global_activity" | "task_reminder" | "subject_activity" | "subject_announcement" | "attendance" | "deadline";

export type AppNotification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: unknown;
  subjectCode?: string;
  subjectName?: string;
  deepLink?: string;
};
