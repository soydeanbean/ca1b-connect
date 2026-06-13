// src/pages/settings/Settings.tsx

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./Settings.css";

export default function Settings() {
  const { user } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => document.body.classList.contains("dark")
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Persist dark mode to body
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    // Load saved preferences from localStorage
    const stored = localStorage.getItem("ca1b_settings");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        setNotificationsEnabled(prefs.notificationsEnabled ?? true);
        setDarkMode(prefs.darkMode ?? false);
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(
      "ca1b_settings",
      JSON.stringify({
        notificationsEnabled,
        darkMode
      })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div>
          <span className="settings-eyebrow">Preferences</span>
          <h1>Settings</h1>
          <p>Customise your CA1B Connect experience.</p>
        </div>
      </section>

      <section className="settings-card">
        <h2>Account</h2>
        <div className="settings-row">
          <span>Email</span>
          <strong>{user?.email || "—"}</strong>
        </div>
      </section>

      <section className="settings-card">
        <h2>Display</h2>

        <label className="settings-toggle">
          <span>Dark mode</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          <span className="toggle-track" />
        </label>
      </section>

      <section className="settings-card">
        <h2>Notifications</h2>

        <label className="settings-toggle">
          <span>Show notifications</span>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
          />
          <span className="toggle-track" />
        </label>

        <p className="settings-hint">
          When disabled, the notification bell will be hidden from the navbar.
        </p>
      </section>

      <div className="settings-actions">
        <button type="button" className="settings-save-btn" onClick={handleSave}>
          {saved ? "Saved ✓" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}