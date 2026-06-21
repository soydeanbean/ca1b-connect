// src/pages/settings/Settings.tsx

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  getUserSettings,
  saveUserSettings,
  applyTheme,
  applyThemeColor
} from "../../services/settingsService";
import { isAppInstalled, canInstallPWA, installPWA } from "../../services/pwaService";
import {
  isNotificationSupported,
  hasNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences
} from "../../services/fcmService";
import type { UserSettings, ThemeMode, ThemeColor, PrivacyMode } from "../../types/Settings";
import { THEME_COLORS } from "../../types/Settings";
import type { NotificationPreference } from "../../types/PushSubscription";
import "./Settings.css";

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [pwaAvailable, setPwaAvailable] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const s = await getUserSettings(user.uid);
        setSettings(s);
        applyTheme(s.theme);
        applyThemeColor(s.themeColor || "default");

        const prefs = await getNotificationPreferences(user.uid);
        setNotifPrefs(prefs);

        setPwaInstalled(isAppInstalled());
        setPwaAvailable(canInstallPWA());
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleThemeChange = useCallback(async (theme: ThemeMode) => {
    if (!user || !settings) return;
    setSaving(true);
    setMessage("");
    try {
      await saveUserSettings(user.uid, { theme });
      setSettings(prev => prev ? { ...prev, theme } : prev);
      applyTheme(theme);
      setMessage("Theme updated");
    } catch (e) {
      setMessage("Failed to update theme");
    } finally {
      setSaving(false);
    }
  }, [user, settings]);

  const handleThemeColorChange = useCallback(async (themeColor: ThemeColor) => {
    if (!user || !settings) return;
    setSaving(true);
    setMessage("");
    try {
      await saveUserSettings(user.uid, { themeColor });
      setSettings(prev => prev ? { ...prev, themeColor } : prev);
      applyThemeColor(themeColor);
      setMessage(`Theme color changed to ${THEME_COLORS.find(t => t.value === themeColor)?.label}`);
    } catch (e) {
      setMessage("Failed to update theme color");
    } finally {
      setSaving(false);
    }
  }, [user, settings]);

  const handlePrivacyChange = useCallback(async (privacyMode: PrivacyMode) => {
    if (!user || !settings) return;
    setSaving(true);
    setMessage("");
    try {
      await saveUserSettings(user.uid, { privacyMode });
      setSettings(prev => prev ? { ...prev, privacyMode } : prev);
      setMessage(`Profile set to ${privacyMode}`);
    } catch (e) {
      setMessage("Failed to update privacy");
    } finally {
      setSaving(false);
    }
  }, [user, settings]);

  const handleInstallPWA = useCallback(async () => {
    const installed = await installPWA();
    if (installed) {
      setPwaInstalled(true);
      setPwaAvailable(false);
      setMessage("App installed successfully!");
    } else {
      setMessage("Installation cancelled");
    }
  }, []);

  const handleNotifPrefChange = useCallback(async (key: keyof NotificationPreference, value: boolean) => {
    if (!user || !notifPrefs) return;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await saveNotificationPreferences(user.uid, { [key]: value });
  }, [user, notifPrefs]);

  const handleRequestNotifPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setMessage("Notifications enabled");
    } else {
      setMessage("Notification permission denied");
    }
  }, []);

  if (loading) {
    return <div className="settings-page"><div className="loading-state">Loading settings...</div></div>;
  }

  if (!settings) {
    return <div className="settings-page"><div className="loading-state">Could not load settings.</div></div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">CA1B Connect</span>
          <h1>Settings</h1>
          <p>Customize your experience, privacy, and app preferences.</p>
        </div>
      </div>

      {message && <div className="settings-message">{message}</div>}

      <div className="settings-sections">
        {/* Appearance */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>🎨 Appearance</h2>
            <p>Choose your preferred theme mode.</p>
          </div>
          <div className="theme-options">
            {(["light", "dark", "system"] as ThemeMode[]).map(mode => (
              <button
                key={mode}
                className={`theme-btn ${settings.theme === mode ? "active" : ""}`}
                onClick={() => handleThemeChange(mode)}
                disabled={saving}
              >
                <span className="theme-icon">
                  {mode === "light" ? "☀️" : mode === "dark" ? "🌙" : "💻"}
                </span>
                <span className="theme-label">
                  {mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System"}
                </span>
              </button>
            ))}
          </div>

          <div className="theme-color-section">
            <p className="theme-color-label">Accent Color</p>
            <div className="theme-color-options">
              {THEME_COLORS.map(tc => (
                <button
                  key={tc.value}
                  className={`theme-color-btn ${settings.themeColor === tc.value ? "active" : ""}`}
                  onClick={() => handleThemeColorChange(tc.value)}
                  disabled={saving}
                  title={tc.label}
                >
                  <span
                    className="theme-color-swatch"
                    style={{ background: tc.gradient }}
                  />
                  <span className="theme-color-name">{tc.emoji} {tc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Install App */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>📱 Install App</h2>
            <p>Install CA1B Connect as a standalone application.</p>
          </div>
          <div className="install-section">
            {pwaInstalled ? (
              <div className="install-status installed">
                ✅ CA1B Connect is installed on your device
              </div>
            ) : pwaAvailable ? (
              <button className="install-btn" onClick={handleInstallPWA}>
                📲 Install CA1B Connect
              </button>
            ) : (
              <div className="install-status unavailable">
                Open this page in Chrome or Edge to install as an app. Your browser must support Progressive Web Apps.
              </div>
            )}
          </div>
        </section>

        {/* Privacy */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>🔒 Privacy</h2>
            <p>Control who can view your profile information.</p>
          </div>
          <div className="privacy-options">
            {(["public", "private"] as PrivacyMode[]).map(mode => (
              <button
                key={mode}
                className={`privacy-btn ${settings.privacyMode === mode ? "active" : ""}`}
                onClick={() => handlePrivacyChange(mode)}
                disabled={saving}
              >
                <span className="privacy-icon">
                  {mode === "public" ? "🌐" : "🔒"}
                </span>
                <div className="privacy-info">
                  <span className="privacy-label">
                    {mode === "public" ? "Public" : "Private"}
                  </span>
                  <span className="privacy-desc">
                    {mode === "public"
                      ? "Other students can view your profile"
                      : "Only teachers and officers can view your profile"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>🔔 Notifications</h2>
            <p>Manage your notification preferences.</p>
          </div>
          <div className="notif-permission">
            {isNotificationSupported() ? (
              hasNotificationPermission() ? (
                <span className="notif-status enabled">✅ Push notifications are enabled</span>
              ) : (
                <button className="notif-enable-btn" onClick={handleRequestNotifPermission}>
                  🔔 Enable Push Notifications
                </button>
              )
            ) : (
              <span className="notif-status unavailable">Push notifications not supported on this browser</span>
            )}
          </div>
          {notifPrefs && (
            <div className="notif-preferences">
              {([
                { key: "newAnnouncements" as const, label: "New Announcements" },
                { key: "newActivities" as const, label: "New Activities" },
                { key: "activityUpdates" as const, label: "Activity Updates" },
                { key: "upcomingDeadlines" as const, label: "Upcoming Deadlines" },
                { key: "attendanceSessions" as const, label: "Attendance Sessions" },
                { key: "importantUpdates" as const, label: "Important Updates" }
              ]).map(({ key, label }) => (
                <label key={key} className="notif-pref-item">
                  <input
                    type="checkbox"
                    checked={notifPrefs[key]}
                    onChange={e => handleNotifPrefChange(key, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}