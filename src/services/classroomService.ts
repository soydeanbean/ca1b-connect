// src/services/classroomService.ts
// Client-side service for Google Classroom integration
// Calls Vercel API routes for OAuth & sync (no Firebase Functions needed)

import type { ClassroomSyncResult } from "../types/Classroom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Get the Google OAuth URL to start the Classroom connection flow
 */
export async function getClassroomAuthUrl(uid: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/api/classroom/oauth-init?uid=${encodeURIComponent(uid)}`,
    { method: "GET" }
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to get auth URL");
  }
  const data = await response.json();
  return data.authUrl;
}

/**
 * Check if user has Google Classroom connected and syncing is enabled
 */
export function isClassroomConnected(settings: { classroomSyncEnabled?: boolean }): boolean {
  return settings.classroomSyncEnabled === true;
}

/**
 * Trigger a sync of Google Classroom data for the current user
 * Calls the Vercel API route /api/classroom/sync
 */
export async function syncClassroomData(uid: string): Promise<ClassroomSyncResult> {
  try {
    const response = await fetch(`${API_BASE}/api/classroom/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Sync failed (${response.status})`);
    }

    const result = await response.json();
    return result as ClassroomSyncResult;
  } catch (error: any) {
    console.error("Classroom sync failed:", error);
    throw new Error(error.message || "Failed to sync Google Classroom data.");
  }
}

/**
 * Revoke Google Classroom access for a user — clears tokens from Firestore
 * via the Vercel API
 */
export async function disconnectClassroom(uid: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/classroom/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to disconnect");
    }
  } catch (error: any) {
    console.error("Classroom disconnect failed:", error);
    throw new Error(error.message || "Failed to disconnect Google Classroom.");
  }
}

/**
 * Get the sync status for display in settings
 */
export function getClassroomSyncStatus(settings: {
  classroomSyncEnabled?: boolean;
  lastClassroomSync?: string;
  classroomSyncCount?: number;
}): {
  connected: boolean;
  lastSync: string | null;
  syncedItems: number;
} {
  return {
    connected: settings.classroomSyncEnabled === true,
    lastSync: settings.lastClassroomSync || null,
    syncedItems: settings.classroomSyncCount || 0
  };
}

/**
 * Format a sync timestamp for display
 */
export function formatLastSync(timestamp: string | null): string {
  if (!timestamp) return "Never";
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "Unknown";
  }
}