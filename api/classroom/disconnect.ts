// api/classroom/disconnect.ts
// Vercel Serverless Function — Revoke Google Classroom access
import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || "ca1b-connect"
  });
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "User ID (uid) is required." });
    }

    // Get token to revoke
    const tokenSnap = await db
      .collection("userPreferences")
      .doc(uid)
      .collection("classroomTokens")
      .doc("oauth")
      .get();

    if (tokenSnap.exists) {
      const tokenData = tokenSnap.data() as { accessToken?: string } | undefined;
      if (tokenData?.accessToken) {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: tokenData.accessToken })
        }).catch(() => {});
      }
      await tokenSnap.ref.delete();
    }

    // Disable sync
    await db.collection("userPreferences").doc(uid).set({
      classroomSyncEnabled: false,
      lastClassroomSync: null,
      classroomSyncCount: 0
    }, { merge: true });

    // Remove mappings
    const mappingsSnap = await db
      .collection("userPreferences")
      .doc(uid)
      .collection("subjectClassroomMappings")
      .get();
    const batch = db.batch();
    mappingsSnap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => batch.delete(doc.ref));
    await batch.commit();

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return res.status(500).json({ error: error.message || "Failed to disconnect." });
  }
}