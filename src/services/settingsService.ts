// src/services/settingsService.ts

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { UserSettings, ThemeMode, PrivacyMode } from "../types/Settings";
import { DEFAULT_USER_SETTINGS } from "../types/Settings";

const COLLECTION = "userPreferences";

const STORAGE_KEY_THEME = "ca1b_theme_mode";
const STORAGE_KEY_PRIVACY = "ca1b_privacy_mode";

export async function getUserSettings(uid: string): Promise<UserSettings> {
  try {
    const ref = doc(db, COLLECTION, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserSettings;
    }
  } catch (error) {
    console.error("Failed to load user settings:", error);
  }
  return { ...DEFAULT_USER_SETTINGS };
}

export async function saveUserSettings(
  uid: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    await updateDoc(ref, {
      ...settings,
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, {
      ...DEFAULT_USER_SETTINGS,
      ...settings,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // Persist to localStorage for quick access
  if (settings.theme) {
    localStorage.setItem(STORAGE_KEY_THEME, settings.theme);
  }
  if (settings.privacyMode) {
    localStorage.setItem(STORAGE_KEY_PRIVACY, settings.privacyMode);
  }
}

export function getLocalTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

export function getLocalPrivacyMode(): PrivacyMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRIVACY);
    if (stored === "public" || stored === "private") {
      return stored;
    }
  } catch {}
  return "public";
}

export function getEffectiveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(theme: ThemeMode): void {
  const effective = getEffectiveTheme(theme);
  if (effective === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  document.documentElement.setAttribute("data-theme", effective);
}