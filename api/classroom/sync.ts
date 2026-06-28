// api/classroom/sync.ts
// Vercel Serverless Function — Sync Google Classroom data
// Uses the Google Classroom API directly with stored OAuth tokens
// No firebase-admin needed — reads tokens from Firestore via REST API

import type { VercelRequest, VercelResponse } from "@vercel/node";

const FIREBASE_PROJECT = "ca1b-connect";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

/**
 * Read a document from Firestore using REST API (no firebase-admin needed)
 */
async function firestoreGet(path: string): Promise<any> {
  const url = `${FIRESTORE_BASE}/${path}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data;
}

/**
 * Write a document to Firestore using REST API
 */
async function firestoreSet(path: string, data: any, merge = false): Promise<void> {
  const url = `${FIRESTORE_BASE}/${path}${merge ? "?merge=true" : ""}`;
  // Convert JS object to Firestore format
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") fields[key] = { integerValue: String(value) };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
    else if (value instanceof Date) fields[key] = { timestampValue: value.toISOString() };
    else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map(v => ({ stringValue: String(v) })) } };
    } else if (typeof value === "object") {
      fields[key] = { mapValue: { fields: flattenObject(value) } };
    }
  }
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
}

function flattenObject(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") result[key] = { stringValue: value };
    else if (typeof value === "number") result[key] = { integerValue: String(value) };
    else if (typeof value === "boolean") result[key] = { booleanValue: value };
  }
  return result;
}

/**
 * Refresh an expired Google OAuth token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiryDate: number } | null> {
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
  if (!resp.ok) return null;
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
    const docPath = `userPreferences/${userId}/classroomTokens/oauth`;
    const snap = await firestoreGet(docPath);
    if (!snap || !snap.fields) return null;

    const fields = snap.fields;
    const accessToken = fields.accessToken?.stringValue || "";
    const refreshToken = fields.refreshToken?.stringValue || "";
    const expiryDate = parseInt(fields.expiryDate?.integerValue || "0", 10);

    if (!accessToken) return null;

    // Check if still valid (5 min buffer)
    if (expiryDate > Date.now() + 300000) return accessToken;

    // Need to refresh
    if (!refreshToken) return null;
    const newTokens = await refreshAccessToken(refreshToken);
    if (!newTokens) return null;

    // Store updated tokens
    await firestoreSet(docPath, {
      ...newTokens,
      tokenType: "Bearer",
      updatedAt: new Date()
    });

    return newTokens.accessToken;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

async function fetchCourses(accessToken: string): Promise<any[]> {
  const resp = await fetch("https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) throw new Error(`Failed to fetch courses: ${resp.status}`);
  const data: any = await resp.json();
  return data.courses || [];
}

async function fetchCourseWork(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) throw new Error(`Failed to fetch coursework: ${resp.status}`);
  const data: any = await resp.json();
  return data.courseWork || [];
}

async function fetchAnnouncements(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements?announcementStates=PUBLISHED`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) throw new Error(`Failed to fetch announcements: ${resp.status}`);
  const data: any = await resp.json();
  return data.announcements || [];
}

async function fetchCourseWorkMaterials(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials?courseWorkMaterialStates=PUBLISHED`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
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
    if (!uid) return res.status(400).json({ error: "User ID (uid) is required." });

    const accessToken = await getValidAccessToken(uid);
    if (!accessToken) {
      return res.status(401).json({ error: "Google Classroom not connected. Please go to Settings and connect first." });
    }

    const courses = await fetchCourses(accessToken);
    if (courses.length === 0) {
      return res.json({ success: true, activitiesCreated: 0, announcementsCreated: 0, materialsCreated: 0, activitiesSkipped: 0, announcementsSkipped: 0, errors: [], summary: "No active courses found in Google Classroom." });
    }

    // Subject name to code mapping
    const subjectCodeMap: Record<string, string> = {
      "Homeroom Guidance Program I": "HRGP001",
      "Effective Communication": "CORS001",
      "Mabisang Komunikasyon": "CORS002",
      "Life and Career Skills": "CORS003",
      "Pag-aaral ng Kasaysayan at Lipunang Pilipino": "CORS004",
      "General Mathematics": "CORS005",
      "General Science": "CORS006",
      "Computer Systems Servicing": "CTES004",
      "Introduction to Christian Faith": "FLPS001",
      "Introduction to Christian Faith: Foundations in a Plural and AI-Driven World": "FLPS001",
      "SHS Reading Program I": "SRPS001"
    };
    const subjectNames = Object.keys(subjectCodeMap);

    // Auto-map courses to subjects
    const mappings: { subjectCode: string; classroomCourseId: string }[] = [];
    for (const course of courses) {
      const match = subjectNames.find((name: string) =>
        name.toLowerCase().includes(course.name.toLowerCase()) ||
        course.name.toLowerCase().includes(name.toLowerCase())
      );
      if (match) {
        mappings.push({ subjectCode: subjectCodeMap[match], classroomCourseId: course.id });
      }
    }

    let activitiesCreated = 0, announcementsCreated = 0, materialsCreated = 0;
    let activitiesSkipped = 0, announcementsSkipped = 0;
    const errors: string[] = [];

    for (const mapping of mappings) {
      const { subjectCode, classroomCourseId } = mapping;

      // Sync CourseWork (Activities)
      try {
        const courseWork = await fetchCourseWork(accessToken, classroomCourseId);
        for (const item of courseWork) {
          // Check duplicates via REST
          const existingQuery = await firestoreGet(`subject_activities?filter=classroomItemId%3D%22${item.id}%22%20AND%20classroomCourseId%3D%22${classroomCourseId}%22`);
          if (existingQuery && existingQuery.documents && existingQuery.documents.length > 0) {
            activitiesSkipped++;
            continue;
          }

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

          const activityId = `gc_${classroomCourseId}_${item.id}`;
          await firestoreSet(`subject_activities/${activityId}`, {
            id: activityId, subjectCode,
            title: item.title || "Untitled",
            description: item.description || "",
            type: item.workType === "ASSIGNMENT" ? "assignment" : "activity",
            dueDate, dueTime,
            links: links.length > 0 ? links : [],
            completedBy: {},
            createdAt: item.creationTime || new Date().toISOString(),
            createdBy: "classroom_sync",
            updatedAt: item.updateTime || new Date().toISOString(),
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
          const existingSnap = await firestoreGet(`subjectAnnouncements/${announcementId}`);
          if (existingSnap && existingSnap.fields) { announcementsSkipped++; continue; }

          const content = item.text || "";
          const links: { name: string; url: string; type: string; size: number }[] = [];
          if (item.materials) {
            for (const material of item.materials) {
              if (material.link) links.push({ name: material.link.title || "Link", url: material.link.url, type: "link", size: 0 });
              if (material.driveFile?.driveFile) links.push({ name: material.driveFile.driveFile.title, url: material.driveFile.driveFile.alternateLink, type: "drive", size: 0 });
              if (material.youtubeVideo) links.push({ name: material.youtubeVideo.title, url: material.youtubeVideo.alternateLink, type: "video", size: 0 });
            }
          }

          await firestoreSet(`subjectAnnouncements/${announcementId}`, {
            id: announcementId, subjectCode,
            title: content.substring(0, 100) || "Announcement",
            content, pinned: false, attachments: links,
            createdBy: "classroom_sync", creatorName: "Google Classroom", creatorRole: "teacher",
            classroomItemId: item.id, classroomCourseId,
            classroomLink: item.alternateLink || "",
            createdAt: item.creationTime || new Date().toISOString(),
            updatedAt: item.updateTime || new Date().toISOString()
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
          const materialId = `gc_mat_${classroomCourseId}_${item.id}`;
          const existingQuery = await firestoreGet(`subject_activities/${materialId}`);
          if (existingQuery && existingQuery.fields) { activitiesSkipped++; continue; }

          const links: { url: string; label: string }[] = [];
          if (item.materials) {
            for (const material of item.materials) {
              if (material.link) links.push({ url: material.link.url, label: material.link.title || material.link.url });
              if (material.driveFile?.driveFile) links.push({ url: material.driveFile.driveFile.alternateLink, label: material.driveFile.driveFile.title });
              if (material.youtubeVideo) links.push({ url: material.youtubeVideo.alternateLink, label: material.youtubeVideo.title });
              if (material.form) links.push({ url: material.form.formUrl, label: material.form.title });
            }
          }

          await firestoreSet(`subject_activities/${materialId}`, {
            id: materialId, subjectCode,
            title: item.title || "Untitled Resource",
            description: item.description || "",
            type: "activity", dueDate: "", dueTime: "",
            links: links.length > 0 ? links : [],
            completedBy: {},
            createdAt: item.creationTime || new Date().toISOString(),
            createdBy: "classroom_sync",
            updatedAt: item.updateTime || new Date().toISOString(),
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
    await firestoreSet(`userPreferences/${uid}`, {
      lastClassroomSync: new Date().toISOString(),
      classroomSyncCount: activitiesCreated + announcementsCreated + materialsCreated
    }, true);

    const totalCreated = activitiesCreated + announcementsCreated + materialsCreated;
    const totalSkipped = activitiesSkipped + announcementsSkipped;
    const summary = totalCreated > 0
      ? `Synced ${totalCreated} item${totalCreated === 1 ? "" : "s"} from Google Classroom${totalSkipped > 0 ? ` (${totalSkipped} duplicates skipped)` : ""}`
      : `No new items to sync. ${totalSkipped} existing item${totalSkipped !== 1 ? "s" : ""} found (up to date).`;

    return res.json({ success: true, activitiesCreated, announcementsCreated, materialsCreated, activitiesSkipped, announcementsSkipped, errors, summary });
  } catch (error: any) {
    console.error("Classroom sync error:", error);
    return res.status(500).json({ error: error.message || "Failed to sync Google Classroom data." });
  }
}