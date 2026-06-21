// src/types/Settings.ts

export type ThemeMode = "light" | "dark" | "system";
export type ThemeColor = "default" | "pink" | "blue" | "dark-red";
export type PrivacyMode = "public" | "private";

export interface UserSettings {
  theme: ThemeMode;
  themeColor: ThemeColor;
  privacyMode: PrivacyMode;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  emailNotifications: boolean;
  subjectNotificationPreferences: Record<string, boolean>;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "system",
  themeColor: "default",
  privacyMode: "public",
  notificationsEnabled: true,
  pushEnabled: true,
  emailNotifications: false,
  subjectNotificationPreferences: {}
};

export const THEME_COLORS: { value: ThemeColor; label: string; gradient: string; emoji: string }[] = [
  { value: "default", label: "Orange", gradient: "linear-gradient(135deg, #ff8c00, #ffd000)", emoji: "🟠" },
  { value: "pink", label: "Pink", gradient: "linear-gradient(135deg, #ff2d78, #ff85b3)", emoji: "🌸" },
  { value: "blue", label: "Blue", gradient: "linear-gradient(135deg, #2563eb, #60a5fa)", emoji: "💙" },
  { value: "dark-red", label: "Dark Red", gradient: "linear-gradient(135deg, #991b1b, #dc2626)", emoji: "❤️" },
];
