// api/classroom/disconnect.ts
// Vercel Serverless Function — Revoke Google Classroom access
// No firebase-admin needed — uses Firestore REST API

import type { VercelRequest, VercelResponse } from "@vercel/node";

const FIREBASE_PROJECT = "ca1b-connect";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

async function firestoreGet(path: string): Promise<any> {
  const resp = await fetch(`${FIRESTORE_BASE}/${path}`);
  if (!resp.ok) return null;
  return resp.json();
}

async function firestoreDelete(path: string): Promise<void> {
  await fetch(`${FIRESTORE_BASE}/${path}`, { method: "DELETE" });
}

async function firestoreSet(path: string, data: any, merge = false): Promise<void> {
  const url = `${FIRESTORE_BASE}/${path}${merge ? "?merge=true" : ""}`;
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) fields[key] = { nullValue: null };
    else if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") fields[key] = { integerValue: String(value) };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
  }
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "User ID (uid) is required." });

    // Get token to revoke
    const tokenSnap = await firestoreGet(`userPreferences/${uid}/classroomTokens/oauth`);
    if (tokenSnap && tokenSnap.fields) {
      const accessToken = tokenSnap.fields.accessToken?.stringValue;
      if (accessToken) {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: accessToken })
        }).catch(() => {});
      }
      await firestoreDelete(`userPreferences/${uid}/classroomTokens/oauth`);
    }

    // Disable sync
    await firestoreSet(`userPreferences/${uid}`, {
      classroomSyncEnabled: false,
      lastClassroomSync: null,
      classroomSyncCount: 0
    }, true);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return res.status(500).json({ error: error.message || "Failed to disconnect." });
  }
}