// src/services/settingsService.ts

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { UserSettings, ThemeMode, ThemeColor, PrivacyMode } from "../types/Settings";
import { DEFAULT_USER_SETTINGS } from "../types/Settings";

const COLLECTION = "userPreferences";

const STORAGE_KEY_THEME = "ca1b_theme_mode";
const STORAGE_KEY_THEME_COLOR = "ca1b_theme_color";
const STORAGE_KEY_PRIVACY = "ca1b_privacy_mode";

/**
 * Theme color CSS variable map - applied to :root
 */
const THEME_COLOR_VARS: Record<ThemeColor, Record<string, string>> = {
  default: {
    "--primary": "#ff8c00",
    "--accent": "#ffd000",
    "--gradient-1": "#ff8c00",
    "--gradient-2": "#ffd000",
    "--glow": "rgba(255, 140, 0, 0.2)",
  },
  pink: {
    "--primary": "#ff2d78",
    "--accent": "#ff85b3",
    "--gradient-1": "#ff2d78",
    "--gradient-2": "#ff85b3",
    "--glow": "rgba(255, 45, 120, 0.2)",
  },
  blue: {
    "--primary": "#2563eb",
    "--accent": "#60a5fa",
    "--gradient-1": "#2563eb",
    "--gradient-2": "#60a5fa",
    "--glow": "rgba(37, 99, 235, 0.2)",
  },
  "dark-red": {
    "--primary": "#b91c1c",
    "--accent": "#ef4444",
    "--gradient-1": "#991b1b",
    "--gradient-2": "#dc2626",
    "--glow": "rgba(185, 28, 28, 0.2)",
  }
};

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

export function getLocalThemeColor(): ThemeColor {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME_COLOR);
    if (stored === "default" || stored === "pink" || stored === "blue" || stored === "dark-red") {
      return stored;
    }
  } catch {}
  return "default";
}

export function applyThemeColor(color: ThemeColor): void {
  const vars = THEME_COLOR_VARS[color];
  const root = document.documentElement;
  
  // Apply each CSS variable
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Also set gradient background for hero sections
  root.style.setProperty("--hero-gradient", `linear-gradient(135deg, ${vars["--gradient-1"]}, ${vars["--gradient-2"]})`);

  // Update shadow colors
  root.style.setProperty("--shadow", `0 18px 45px ${vars["--glow"]}`);

  // Persist
  localStorage.setItem(STORAGE_KEY_THEME_COLOR, color);
}
