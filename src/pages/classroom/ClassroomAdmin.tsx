// src/pages/classroom/ClassroomAdmin.tsx
// Dedicated page for officers (president, vp, beadle, secretary, pio) to manage Google Classroom sync

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getUserProfile } from "../../services/profileService";
import { getUserSettings } from "../../services/settingsService";
import {
  getClassroomAuthUrl,
  syncClassroomData,
  disconnectClassroom,
  formatLastSync,
  isClassroomConnected
} from "../../services/classroomService";
import { getDocs, collection, orderBy, query, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import "./ClassroomAdmin.css";

interface SyncLogEntry {
  id: string;
  userId?: string;
  syncedAt?: { toDate?: () => Date } | string;
  result?: {
    activitiesCreated?: number;
    announcementsCreated?: number;
    materialsCreated?: number;
    activitiesSkipped?: number;
    announcementsSkipped?: number;
    errors?: string[];
    summary?: string;
  };
  status?: string;
}

export default function ClassroomAdmin() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [autoSyncActive, setAutoSyncActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState<SyncLogEntry | null>(null);

  // Fetch profile, settings, and sync logs
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        const s = await getUserSettings(user.uid);
        setSettings(s);

        // Load sync logs
        await loadSyncLogs();

        // Set last sync result
        if (isClassroomConnected(s)) {
          setMessage("Google Classroom is connected and ready to sync.");
          setMessageType("info");
        }
      } catch (e) {
        console.error("Failed to load classroom admin data:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // Load sync logs from Firestore
  const loadSyncLogs = async () => {
    setLogsLoading(true);
    try {
      const q = query(
        collection(db, "classroomSyncLog"),
        orderBy("syncedAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const logs: SyncLogEntry[] = [];
      snap.forEach(doc => {
        const data = doc.data() as SyncLogEntry;
        logs.push({ ...data, id: doc.id });
      });
      setSyncLogs(logs);
      if (logs.length > 0) {
        setLastSyncResult(logs[0]);
      }
    } catch (e) {
      console.error("Failed to load sync logs:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  // Format Firestore timestamp
  const formatTimestamp = (ts: any): string => {
    if (!ts) return "Unknown";
    if (typeof ts === "string") return formatLastSync(ts);
    if (ts.toDate) return formatLastSync(ts.toDate().toISOString());
    return "Unknown";
  };

  // Auto-sync every 15 minutes
  useEffect(() => {
    if (!autoSyncActive || !user || !isClassroomConnected(settings)) return;

    const interval = setInterval(async () => {
      if (!user) return;
      try {
        await syncClassroomData(user.uid);
        await loadSyncLogs();
        const s = await getUserSettings(user.uid);
        setSettings(s);
      } catch (e) {
        console.error("Auto-sync failed:", e);
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [autoSyncActive, user, settings]);

  // Countdown for display
  useEffect(() => {
    if (!autoSyncActive) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    // Start at 15 min
    setTimeLeft(900);
    return () => clearInterval(interval);
  }, [autoSyncActive]);

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // Check if user is authorized
  const isAuthorized = profile &&
    (profile.role === "admin" || profile.role === "teacher" ||
     ["president", "vp", "beadle", "secretary", "pio"].includes(profile.officerRole));

  const handleConnect = async () => {
    if (!user) return;
    try {
      const authUrl = await getClassroomAuthUrl(user.uid);
      window.location.href = authUrl;
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
      setMessageType("error");
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncClassroomData(user.uid);
      setMessage(`✅ ${result.summary}`);
      setMessageType("success");
      const s = await getUserSettings(user.uid);
      setSettings(s);
      await loadSyncLogs();
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
      setMessageType("error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if (!confirm("Disconnect from Google Classroom? Synced data will remain. Future auto-syncs will stop.")) return;
    setSyncing(true);
    try {
      await disconnectClassroom(user.uid);
      setMessage("Google Classroom disconnected.");
      setMessageType("info");
      const s = await getUserSettings(user.uid);
      setSettings(s);
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
      setMessageType("error");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="classroom-admin-page"><div className="loading-state">Loading...</div></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="classroom-admin-page">
        <div className="page-header">
          <span className="page-eyebrow">CA1B Connect</span>
          <h1>Classroom Sync</h1>
          <p>Only officers can access this page.</p>
        </div>
        <div className="ca-unauthorized">
          <span className="ca-unauthorized-icon">🚫</span>
          <h2>Access Denied</h2>
          <p>This page is only accessible to the President, Vice President, Secretary, PIO, Beadle, and teachers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="classroom-admin-page">
      <div className="page-header">
        <span className="page-eyebrow">CA1B Connect</span>
        <h1>📚 Google Classroom Sync</h1>
        <p>Sync activities, announcements, and materials from Google Classroom. Auto-syncs every 15 minutes.</p>
      </div>

      {message && (
        <div className={`ca-message ${messageType}`}>
          <span>{message}</span>
          <button className="ca-message-close" onClick={() => setMessage("")}>✕</button>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="ca-card ca-status-card">
        <div className={`ca-status-indicator ${isClassroomConnected(settings) ? "connected" : "disconnected"}`}>
          <div className="ca-status-dot" />
          <span>{isClassroomConnected(settings) ? "Connected" : "Not Connected"}</span>
        </div>

        <div className="ca-status-details">
          {isClassroomConnected(settings) ? (
            <>
              <div className="ca-detail-row">
                <span>Last Sync</span>
                <strong>{formatLastSync(settings.lastClassroomSync || null)}</strong>
              </div>
              <div className="ca-detail-row">
                <span>Items Synced</span>
                <strong>{settings.classroomSyncCount || 0}</strong>
              </div>
              {autoSyncActive && (
                <div className="ca-detail-row">
                  <span>Next Auto-Sync</span>
                  <strong>{formatTimeLeft(timeLeft)}</strong>
                </div>
              )}
            </>
          ) : (
            <p className="ca-status-help">Connect to Google Classroom to start syncing activities and announcements.</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="ca-card ca-actions-card">
        <h3>Actions</h3>
        <div className="ca-actions-grid">
          {isClassroomConnected(settings) ? (
            <>
              <button className="ca-btn ca-btn-primary" onClick={handleSync} disabled={syncing}>
                {syncing ? "⏳ Syncing..." : "🔄 Sync Now"}
              </button>
              <button
                className={`ca-btn ${autoSyncActive ? "ca-btn-warning" : "ca-btn-secondary"}`}
                onClick={() => setAutoSyncActive(!autoSyncActive)}
              >
                {autoSyncActive ? "⏹ Stop Auto-Sync" : "▶️ Start Auto-Sync (15min)"}
              </button>
              <button className="ca-btn ca-btn-danger" onClick={handleDisconnect} disabled={syncing}>
                🔌 Disconnect
              </button>
            </>
          ) : (
            <button className="ca-btn ca-btn-google" onClick={handleConnect}>
              🔗 Connect Google Classroom
            </button>
          )}
        </div>
      </div>

      {/* Last Sync Result */}
      {lastSyncResult && lastSyncResult.result && (
        <div className="ca-card ca-result-card">
          <h3>Last Sync Result</h3>
          <div className="ca-result-grid">
            <div className="ca-result-item">
              <span className="ca-result-number" style={{ color: "#10b981" }}>{lastSyncResult.result.activitiesCreated || 0}</span>
              <span>Activities Created</span>
            </div>
            <div className="ca-result-item">
              <span className="ca-result-number" style={{ color: "#3b82f6" }}>{lastSyncResult.result.announcementsCreated || 0}</span>
              <span>Announcements Created</span>
            </div>
            <div className="ca-result-item">
              <span className="ca-result-number" style={{ color: "#8b5cf6" }}>{lastSyncResult.result.materialsCreated || 0}</span>
              <span>Materials Created</span>
            </div>
            <div className="ca-result-item">
              <span className="ca-result-number" style={{ color: "#f59e0b" }}>{lastSyncResult.result.activitiesSkipped || 0}</span>
              <span>Duplicates Skipped</span>
            </div>
          </div>
          {lastSyncResult.result.errors && lastSyncResult.result.errors.length > 0 && (
            <div className="ca-errors">
              <h4>Errors:</h4>
              <ul>
                {lastSyncResult.result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="ca-result-summary">{lastSyncResult.result.summary}</p>
          <p className="ca-result-time">Synced at: {formatTimestamp(lastSyncResult.syncedAt)}</p>
        </div>
      )}

      {/* Sync Logs */}
      <div className="ca-card ca-logs-card">
        <div className="ca-logs-header">
          <h3>📋 Sync History</h3>
          <button className="ca-btn ca-btn-small" onClick={loadSyncLogs} disabled={logsLoading}>
            {logsLoading ? "Loading..." : "🔄 Refresh"}
          </button>
        </div>
        {logsLoading ? (
          <p className="ca-logs-loading">Loading logs...</p>
        ) : syncLogs.length === 0 ? (
          <p className="ca-logs-empty">No sync logs yet. Click "Sync Now" to start.</p>
        ) : (
          <div className="ca-logs-table-wrapper">
            <table className="ca-logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Activities</th>
                  <th>Announcements</th>
                  <th>Skipped</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log, i) => (
                  <tr key={log.id || i}>
                    <td className="ca-log-time">{formatTimestamp(log.syncedAt)}</td>
                    <td>
                      <span className={`ca-log-status ${log.status || "success"}`}>
                        {log.status || "success"}
                      </span>
                    </td>
                    <td>{log.result?.activitiesCreated || 0}</td>
                    <td>{log.result?.announcementsCreated || 0}</td>
                    <td>{(log.result?.activitiesSkipped || 0) + (log.result?.announcementsSkipped || 0)}</td>
                    <td className="ca-log-summary">{log.result?.summary || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}