// api/classroom/sync.ts
// Vercel Serverless Function — Sync Google Classroom data
// Runs entirely on Vercel, no Firebase Functions needed
import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || "ca1b-connect"
  });
}

const db = admin.firestore();

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

/**
 * Refresh an expired Google OAuth token
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  const CLIENT_ID = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET || !refreshToken) return null;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const data: any = await resp.json();
  if (!resp.ok) {
    console.error("Token refresh error:", data);
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiryDate: Date.now() + (data.expires_in || 3600) * 1000
  };
}

/**
 * Get a valid access token from Firestore for a user
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const tokenSnap = await db
      .collection("userPreferences")
      .doc(userId)
      .collection("classroomTokens")
      .doc("oauth")
      .get();

    if (!tokenSnap.exists) return null;

    const tokenData = tokenSnap.data() as GoogleTokens | undefined;
    if (!tokenData) return null;

    if (tokenData.expiryDate > Date.now() + 300000) {
      return tokenData.accessToken;
    }

    if (!tokenData.refreshToken) {
      console.error("No refresh token available for user:", userId);
      return null;
    }

    const newTokens = await refreshAccessToken(tokenData.refreshToken);
    if (!newTokens) return null;

    await tokenSnap.ref.set({
      ...newTokens,
      tokenType: "Bearer",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return newTokens.accessToken;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

async function fetchCourses(accessToken: string): Promise<any[]> {
  const resp = await fetch(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) throw new Error(`Failed to fetch courses: ${resp.status}`);
  const data: any = await resp.json();
  return data.courses || [];
}

async function fetchCourseWork(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) throw new Error(`Failed to fetch coursework: ${resp.status}`);
  const data: any = await resp.json();
  return data.courseWork || [];
}

async function fetchAnnouncements(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/announcements?announcementStates=PUBLISHED`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) throw new Error(`Failed to fetch announcements: ${resp.status}`);
  const data: any = await resp.json();
  return data.announcements || [];
}

async function fetchCourseWorkMaterials(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials?courseWorkMaterialStates=PUBLISHED`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) throw new Error(`Failed to fetch materials: ${resp.status}`);
  const data: any = await resp.json();
  return data.courseWorkMaterials || [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "User ID (uid) is required." });
    }

    const accessToken = await getValidAccessToken(uid);
    if (!accessToken) {
      return res.status(401).json({
        error: "Google Classroom not connected. Please go to Settings and connect first."
      });
    }

    // Fetch courses
    const courses = await fetchCourses(accessToken);
    if (courses.length === 0) {
      return res.json({
        success: true,
        activitiesCreated: 0,
        announcementsCreated: 0,
        materialsCreated: 0,
        activitiesSkipped: 0,
        announcementsSkipped: 0,
        errors: [],
        summary: "No active courses found in Google Classroom."
      });
    }

    // Get subject names from class data for auto-mapping
    const classDataSnap = await db.collection("classCA1B").doc("data").get();
    const schedule: { subject: string }[] = classDataSnap.exists
      ? (classDataSnap.data()?.schedule || [])
      : [];
    const subjectNames = [...new Set(schedule.map((s: any) => s.subject))];

    // Get existing mappings
    const mappingsSnap = await db
      .collection("userPreferences")
      .doc(uid)
      .collection("subjectClassroomMappings")
      .get();
    const mappings: { subjectCode: string; classroomCourseId: string }[] = [];
    mappingsSnap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const d = doc.data();
      mappings.push({ subjectCode: d.subjectCode || "", classroomCourseId: d.classroomCourseId || "" });
    });

    // Auto-create mappings if none exist
    if (mappings.length === 0) {
      for (const course of courses) {
        const match = subjectNames.find((name: string) =>
          name.toLowerCase().includes(course.name.toLowerCase()) ||
          course.name.toLowerCase().includes(name.toLowerCase())
        );
        if (match) {
          const subjectCode = match.substring(0, 4).toUpperCase();
          await db
            .collection("userPreferences")
            .doc(uid)
            .collection("subjectClassroomMappings")
            .doc(course.id)
            .set({
              subjectCode,
              classroomCourseId: course.id,
              courseName: course.name,
              lastSyncedAt: new Date().toISOString()
            });
          mappings.push({ subjectCode, classroomCourseId: course.id });
        }
      }
    }

    let activitiesCreated = 0;
    let announcementsCreated = 0;
    let materialsCreated = 0;
    let activitiesSkipped = 0;
    let announcementsSkipped = 0;
    const errors: string[] = [];

    for (const mapping of mappings) {
      const { subjectCode, classroomCourseId } = mapping;

      // Sync CourseWork (Activities)
      try {
        const courseWork = await fetchCourseWork(accessToken, classroomCourseId);
        for (const item of courseWork) {
          const existingQuery = await db
            .collection("subject_activities")
            .where("classroomItemId", "==", item.id)
            .where("classroomCourseId", "==", classroomCourseId)
            .limit(1)
            .get();

          if (!existingQuery.empty) { activitiesSkipped++; continue; }

          let dueDate = "", dueTime = "";
          if (item.dueDate) {
            const { year, month, day } = item.dueDate;
            dueDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            if (item.dueTime) {
              const { hours, minutes } = item.dueTime;
              dueTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
            }
          }

          const links: { url: string; label: string }[] = [];
          if (item.materials) {
            for (const material of item.materials) {
              if (material.link) links.push({ url: material.link.url, label: material.link.title || material.link.url });
              if (material.driveFile?.driveFile) links.push({ url: material.driveFile.driveFile.alternateLink, label: material.driveFile.driveFile.title });
              if (material.youtubeVideo) links.push({ url: material.youtubeVideo.alternateLink, label: material.youtubeVideo.title });
              if (material.form) links.push({ url: material.form.formUrl, label: material.form.title });
            }
          }

          const activityRef = db.collection("subject_activities").doc();
          await activityRef.set({
            id: activityRef.id,
            subjectCode,
            title: item.title || "Untitled",
            description: item.description || "",
            type: item.workType === "ASSIGNMENT" ? "assignment" : "activity",
            dueDate, dueTime,
            links: links.length > 0 ? links : [],
            completedBy: {},
            createdAt: new Date(item.creationTime || new Date().toISOString()),
            createdBy: "classroom_sync",
            updatedAt: new Date(item.updateTime || new Date().toISOString()),
            updatedBy: "classroom_sync",
            classroomItemId: item.id,
            classroomCourseId,
            classroomLink: item.alternateLink || ""
          });

          activitiesCreated++;
        }
      } catch (error: any) {
        errors.push(`Failed to sync coursework for ${subjectCode}: ${error.message}`);
      }

      // Sync Announcements
      try {
        const announcements = await fetchAnnouncements(accessToken, classroomCourseId);
        for (const item of announcements) {
          const announcementId = `gc_${classroomCourseId}_${item.id}`;
          const existingSnap = await db.collection("subjectAnnouncements").doc(announcementId).get();
          if (existingSnap.exists) { announcementsSkipped++; continue; }

          const content = item.text || "";
          const links: { name: string; url: string; type: string; size: number }[] = [];
          if (item.materials) {
            for (const material of item.materials) {
              if (material.link) links.push({ name: material.link.title || "Link", url: material.link.url, type: "link", size: 0 });
              if (material.driveFile?.driveFile) links.push({ name: material.driveFile.driveFile.title, url: material.driveFile.driveFile.alternateLink, type: "drive", size: 0 });
              if (material.youtubeVideo) links.push({ name: material.youtubeVideo.title, url: material.youtubeVideo.alternateLink, type: "video", size: 0 });
            }
          }

          await db.collection("subjectAnnouncements").doc(announcementId).set({
            id: announcementId, subjectCode,
            title: content.substring(0, 100) || "Announcement",
            content, pinned: false, attachments: links,
            createdBy: "classroom_sync", creatorName: "Google Classroom", creatorRole: "teacher",
            classroomItemId: item.id, classroomCourseId,
            classroomLink: item.alternateLink || "",
            createdAt: new Date(item.creationTime || new Date().toISOString()),
            updatedAt: new Date(item.updateTime || new Date().toISOString())
          });

          announcementsCreated++;
        }
      } catch (error: any) {
        errors.push(`Failed to sync announcements for ${subjectCode}: ${error.message}`);
      }

      // Sync CourseWork Materials
      try {
        const materials = await fetchCourseWorkMaterials(accessToken, classroomCourseId);
        for (const item of materials) {
          const existingQuery = await db
            .collection("subject_activities")
            .where("classroomItemId", "==", item.id)
            .where("classroomCourseId", "==", classroomCourseId)
            .limit(1)
            .get();

          if (!existingQuery.empty) { activitiesSkipped++; continue; }

          const links: { url: string; label: string }[] = [];
          if (item.materials) {
            for (const material of item.materials) {
              if (material.link) links.push({ url: material.link.url, label: material.link.title || material.link.url });
              if (material.driveFile?.driveFile) links.push({ url: material.driveFile.driveFile.alternateLink, label: material.driveFile.driveFile.title });
              if (material.youtubeVideo) links.push({ url: material.youtubeVideo.alternateLink, label: material.youtubeVideo.title });
              if (material.form) links.push({ url: material.form.formUrl, label: material.form.title });
            }
          }

          const activityRef = db.collection("subject_activities").doc();
          await activityRef.set({
            id: activityRef.id, subjectCode,
            title: item.title || "Untitled Resource",
            description: item.description || "",
            type: "activity", dueDate: "", dueTime: "",
            links: links.length > 0 ? links : [],
            completedBy: {},
            createdAt: new Date(item.creationTime || new Date().toISOString()),
            createdBy: "classroom_sync",
            updatedAt: new Date(item.updateTime || new Date().toISOString()),
            updatedBy: "classroom_sync",
            classroomItemId: item.id, classroomCourseId,
            classroomLink: item.alternateLink || ""
          });

          materialsCreated++;
        }
      } catch (error: any) {
        errors.push(`Failed to sync courseWorkMaterials for ${subjectCode}: ${error.message}`);
      }
    }

    // Update last sync timestamp
    await db.collection("userPreferences").doc(uid).set({
      lastClassroomSync: new Date().toISOString(),
      classroomSyncCount: activitiesCreated + announcementsCreated + materialsCreated
    }, { merge: true });

    const totalCreated = activitiesCreated + announcementsCreated + materialsCreated;
    const totalSkipped = activitiesSkipped + announcementsSkipped;
    const summary = totalCreated > 0
      ? `Synced ${totalCreated} item${totalCreated === 1 ? "" : "s"} from Google Classroom${totalSkipped > 0 ? ` (${totalSkipped} duplicates skipped)` : ""}`
      : `No new items to sync. ${totalSkipped} existing item${totalSkipped !== 1 ? "s" : ""} found (up to date).`;

    return res.json({
      success: true,
      activitiesCreated, announcementsCreated, materialsCreated,
      activitiesSkipped, announcementsSkipped,
      errors, summary
    });
  } catch (error: any) {
    console.error("Classroom sync error:", error);
    return res.status(500).json({ error: error.message || "Failed to sync Google Classroom data." });
  }
}