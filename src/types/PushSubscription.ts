// src/types/PushSubscription.ts

export interface PushSubscriptionData {
  id: string;
  userId: string;
  token: string;
  platform: "web" | "android" | "ios";
  topics: string[];
  enabled: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface NotificationPreference {
  newAnnouncements: boolean;
  newActivities: boolean;
  activityUpdates: boolean;
  upcomingDeadlines: boolean;
  attendanceSessions: boolean;
  importantUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference = {
  newAnnouncements: true,
  newActivities: true,
  activityUpdates: true,
  upcomingDeadlines: true,
  attendanceSessions: true,
  importantUpdates: true
};