// src/types/Settings.ts

export type ThemeMode = "light" | "dark" | "system";
export type PrivacyMode = "public" | "private";

export interface UserSettings {
  theme: ThemeMode;
  privacyMode: PrivacyMode;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  emailNotifications: boolean;
  subjectNotificationPreferences: Record<string, boolean>;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "system",
  privacyMode: "public",
  notificationsEnabled: true,
  pushEnabled: true,
  emailNotifications: false,
  subjectNotificationPreferences: {}
};