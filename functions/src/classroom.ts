// functions/src/classroom.ts
// Firebase Function handlers for Google Classroom OAuth & Sync
import { onRequest, onCall, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope?: string;
  tokenType?: string;
  updatedAt?: Timestamp;
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

  const data = await resp.json();
  if (!resp.ok) {
    console.error("Token refresh error:", data);
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiryDate: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope || ""
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

    // Check if token is still valid (with 5 min buffer)
    if (tokenData.expiryDate > Date.now() + 300000) {
      return tokenData.accessToken;
    }

    // Need to refresh
    if (!tokenData.refreshToken) {
      console.error("No refresh token available for user:", userId);
      return null;
    }

    const newTokens = await refreshAccessToken(tokenData.refreshToken);
    if (!newTokens) return null;

    // Store updated tokens
    await tokenSnap.ref.set({
      ...newTokens,
      updateType: "Bearer",
      updatedAt: Timestamp.now()
    });

    return newTokens.accessToken;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

/**
 * Fetch courses from Google Classroom
 */
async function fetchCourses(accessToken: string): Promise<any[]> {
  const resp = await fetch(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!resp.ok) throw new Error(`Failed to fetch courses: ${resp.status}`);
  const data = await resp.json();
  return data.courses || [];
}

/**
 * Fetch coursework (activities) for a course
 */
async function fetchCourseWork(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!resp.ok) throw new Error(`Failed to fetch coursework for ${courseId}: ${resp.status}`);
  const data = await resp.json();
  return data.courseWork || [];
}

/**
 * Fetch announcements for a course
 */
async function fetchAnnouncements(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/announcements?announcementStates=PUBLISHED`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!resp.ok) throw new Error(`Failed to fetch announcements for ${courseId}: ${resp.status}`);
  const data = await resp.json();
  return data.announcements || [];
}

/**
 * Fetch coursework materials (non-graded resources) for a course
 */
async function fetchCourseWorkMaterials(accessToken: string, courseId: string): Promise<any[]> {
  const resp = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials?courseWorkMaterialStates=PUBLISHED`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!resp.ok) throw new Error(`Failed to fetch materials for ${courseId}: ${resp.status}`);
  const data = await resp.json();
  return data.courseWorkMaterials || [];
}

/**
 * OAuth callback endpoint - receives auth code, exchanges for tokens, stores in Firestore
 * URL: /classroom-oauth-callback?code=...&state=...
 */
export const classroomOAuthCallback = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { code, state, error: oauthError } = req.query;

      if (oauthError) {
        return res.redirect("/settings?classroom=error&message=" + encodeURIComponent("Access denied."));
      }

      if (!code || typeof code !== "string") {
        return res.redirect("/settings?classroom=error&message=" + encodeURIComponent("No auth code received."));
      }

      // Decode state to get userId
      let userId = "";
      try {
        const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
        userId = stateData.userId || "";
      } catch {
        return res.redirect("/settings?classroom=error&message=" + encodeURIComponent("Invalid state."));
      }

      if (!userId) {
        return res.redirect("/settings?classroom=error&message=" + encodeURIComponent("User not identified."));
      }

      const CLIENT_ID = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
      const CLIENT_SECRET = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
      const REDIRECT_URI = process.env.GOOGLE_CLASSROOM_REDIRECT_URI;

      if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        return res.redirect("/settings?classroom=error&message=" + encodeURIComponent("OAuth not configured."));
      }

      // Exchange code for tokens
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code"
        })
      });

      const tokenData = await tokenResp.json();
      if (!tokenResp.ok) {
        console.error("Token exchange error:", tokenData);
        return res.redirect("/settings?classroom=error&message=" + encodeURIComponent("Token exchange failed."));
      }

      // Store tokens in Firestore
      await db
        .collection("userPreferences")
        .doc(userId)
        .collection("classroomTokens")
        .doc("oauth")
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || "",
          scope: tokenData.scope || "",
          tokenType: tokenData.token_type || "Bearer",
          expiryDate: Date.now() + (tokenData.expires_in || 3600) * 1000,
          updatedAt: Timestamp.now()
        });

      // Enable sync in settings
      await db.collection("userPreferences").doc(userId).set({
        classroomSyncEnabled: true,
        lastClassroomSync: null,
        classroomSyncCount: 0
      }, { merge: true });

      return res.redirect("/settings?classroom=success");
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      return res.redirect("/settings?classroom=error&message=" + encodeURIComponent(error.message));
    }
  }
);

interface SyncResult {
  success: boolean;
  activitiesCreated: number;
  announcementsCreated: number;
  materialsCreated: number;
  activitiesSkipped: number;
  announcementsSkipped: number;
  errors: string[];
  summary: string;
}

/**
 * Sync Google Classroom data for a user - Callable function
 * Maps Google Classroom courses to the user's subjects and syncs activities/announcements
 */
export const syncGoogleClassroom = onCall(
  { cors: true },
  async (request: CallableRequest): Promise<SyncResult> => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new Error("Authentication required.");
    }

    try {
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        throw new Error("Google Classroom not connected. Please re-authenticate.");
      }

      // Fetch courses from Google Classroom
      const courses = await fetchCourses(accessToken);
      if (courses.length === 0) {
        return {
          success: true,
          activitiesCreated: 0,
          announcementsCreated: 0,
          activitiesSkipped: 0,
          announcementsSkipped: 0,
          materialsCreated: 0,
          errors: [],
          summary: "No active courses found in Google Classroom."
        };
      }

      // Get user's subject mappings from Firestore
      const subjectsSnap = await db.collection("userPreferences").doc(userId).collection("subjectClassroomMappings").get();
      const mappings: { subjectCode: string; classroomCourseId: string }[] = [];
      subjectsSnap.forEach(doc => {
        const data = doc.data();
        mappings.push({
          subjectCode: data.subjectCode || "",
          classroomCourseId: data.classroomCourseId || ""
        });
      });

      // If no mappings exist, try to auto-map by matching course names to subject names
      const classDataSnap = await db.collection("classCA1B").doc("data").get();
      const schedule: { subject: string }[] = classDataSnap.exists
        ? (classDataSnap.data()?.schedule || [])
        : [];

      const subjectNames = [...new Set(schedule.map((s: any) => s.subject))];

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
              .doc(userId)
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

      const syncLogRef = db.collection("classroomSyncLog");

      for (const mapping of mappings) {
        const { subjectCode, classroomCourseId } = mapping;

        // Sync CourseWork (Activities)
        try {
          const courseWork = await fetchCourseWork(accessToken, classroomCourseId);
          for (const item of courseWork) {
            // Check duplicates
            const existingQuery = await db
              .collection("subject_activities")
              .where("classroomItemId", "==", item.id)
              .where("classroomCourseId", "==", classroomCourseId)
              .limit(1)
              .get();

            if (!existingQuery.empty) {
              activitiesSkipped++;
              continue;
            }

            let dueDate = "";
            let dueTime = "";
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
                if (material.link) {
                  links.push({ url: material.link.url, label: material.link.title || material.link.url });
                }
                if (material.driveFile?.driveFile) {
                  links.push({
                    url: material.driveFile.driveFile.alternateLink,
                    label: material.driveFile.driveFile.title
                  });
                }
                if (material.youtubeVideo) {
                  links.push({
                    url: material.youtubeVideo.alternateLink,
                    label: material.youtubeVideo.title
                  });
                }
                if (material.form) {
                  links.push({
                    url: material.form.formUrl,
                    label: material.form.title
                  });
                }
              }
            }

            const activityRef = db.collection("subject_activities").doc();
            await activityRef.set({
              id: activityRef.id,
              subjectCode,
              title: item.title || "Untitled",
              description: item.description || "",
              type: item.workType === "ASSIGNMENT" ? "assignment" : "activity",
              dueDate,
              dueTime,
              links: links.length > 0 ? links : [],
              completedBy: {},
              createdAt: Timestamp.fromDate(new Date(item.creationTime || new Date().toISOString())),
              createdBy: "classroom_sync",
              updatedAt: Timestamp.fromDate(new Date(item.updateTime || new Date().toISOString())),
              updatedBy: "classroom_sync",
              classroomItemId: item.id,
              classroomCourseId,
              classroomLink: item.alternateLink || ""
            });

            await syncLogRef.add({
              userId,
              classroomItemId: item.id,
              classroomCourseId,
              type: "activity",
              title: item.title,
              syncedAt: Timestamp.now()
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

            if (existingSnap.exists) {
              announcementsSkipped++;
              continue;
            }

            const content = item.text || "";
            const links: { name: string; url: string; type: string; size: number }[] = [];

            if (item.materials) {
              for (const material of item.materials) {
                if (material.link) {
                  links.push({
                    name: material.link.title || "Link",
                    url: material.link.url,
                    type: "link",
                    size: 0
                  });
                }
                if (material.driveFile?.driveFile) {
                  links.push({
                    name: material.driveFile.driveFile.title,
                    url: material.driveFile.driveFile.alternateLink,
                    type: "drive",
                    size: 0
                  });
                }
                if (material.youtubeVideo) {
                  links.push({
                    name: material.youtubeVideo.title,
                    url: material.youtubeVideo.alternateLink,
                    type: "video",
                    size: 0
                  });
                }
              }
            }

            await db.collection("subjectAnnouncements").doc(announcementId).set({
              id: announcementId,
              subjectCode,
              title: content.substring(0, 100) || "Announcement",
              content,
              pinned: false,
              attachments: links,
              createdBy: "classroom_sync",
              creatorName: "Google Classroom",
              creatorRole: "teacher",
              classroomItemId: item.id,
              classroomCourseId,
              classroomLink: item.alternateLink || "",
              createdAt: Timestamp.fromDate(new Date(item.creationTime || new Date().toISOString())),
              updatedAt: Timestamp.fromDate(new Date(item.updateTime || new Date().toISOString()))
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

            if (!existingQuery.empty) {
              activitiesSkipped++;
              continue;
            }

            const links: { url: string; label: string }[] = [];
            if (item.materials) {
              for (const material of item.materials) {
                if (material.link) {
                  links.push({ url: material.link.url, label: material.link.title || material.link.url });
                }
                if (material.driveFile?.driveFile) {
                  links.push({
                    url: material.driveFile.driveFile.alternateLink,
                    label: material.driveFile.driveFile.title
                  });
                }
                if (material.youtubeVideo) {
                  links.push({ url: material.youtubeVideo.alternateLink, label: material.youtubeVideo.title });
                }
                if (material.form) {
                  links.push({ url: material.form.formUrl, label: material.form.title });
                }
              }
            }

            const activityRef = db.collection("subject_activities").doc();
            await activityRef.set({
              id: activityRef.id,
              subjectCode,
              title: item.title || "Untitled Resource",
              description: item.description || "",
              type: "activity",
              dueDate: "",
              dueTime: "",
              links: links.length > 0 ? links : [],
              completedBy: {},
              createdAt: Timestamp.fromDate(new Date(item.creationTime || new Date().toISOString())),
              createdBy: "classroom_sync",
              updatedAt: Timestamp.fromDate(new Date(item.updateTime || new Date().toISOString())),
              updatedBy: "classroom_sync",
              classroomItemId: item.id,
              classroomCourseId,
              classroomLink: item.alternateLink || ""
            });

            materialsCreated++;
          }
        } catch (error: any) {
          errors.push(`Failed to sync courseWorkMaterials for ${subjectCode}: ${error.message}`);
        }
      }

      // Update last sync timestamp
      await db.collection("userPreferences").doc(userId).set({
        lastClassroomSync: new Date().toISOString(),
        classroomSyncCount: activitiesCreated + announcementsCreated + materialsCreated
      }, { merge: true });

      const totalCreated = activitiesCreated + announcementsCreated + materialsCreated;
      const totalSkipped = activitiesSkipped + announcementsSkipped;
      const summary = totalCreated > 0
        ? `Synced ${totalCreated} item${totalCreated === 1 ? "" : "s"} from Google Classroom${totalSkipped > 0 ? ` (${totalSkipped} duplicates skipped)` : ""}`
        : `No new items to sync. ${totalSkipped} existing item${totalSkipped !== 1 ? "s" : ""} found (up to date).`;

      return {
        success: true,
        activitiesCreated,
        announcementsCreated,
        materialsCreated,
        activitiesSkipped,
        announcementsSkipped,
        errors,
        summary
      };
    } catch (error: any) {
      console.error("Classroom sync error:", error);
      throw new Error(error.message || "Failed to sync Google Classroom data.");
    }
  }
);

/**
 * Revoke Google Classroom access for a user
 */
export const revokeGoogleClassroomAccess = onCall(
  { cors: true },
  async (request: CallableRequest) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new Error("Authentication required.");
    }

    try {
      const tokenSnap = await db
        .collection("userPreferences")
        .doc(userId)
        .collection("classroomTokens")
        .doc("oauth")
        .get();

      if (tokenSnap.exists) {
        const tokenData = tokenSnap.data() as GoogleTokens | undefined;
        if (tokenData?.accessToken) {
          await fetch("https://oauth2.googleapis.com/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: tokenData.accessToken })
          }).catch(e => console.error("Token revoke failed:", e));
        }

        await tokenSnap.ref.delete();
      }

      await db.collection("userPreferences").doc(userId).set({
        classroomSyncEnabled: false,
        lastClassroomSync: null,
        classroomSyncCount: 0
      }, { merge: true });

      const mappingsSnap = await db
        .collection("userPreferences")
        .doc(userId)
        .collection("subjectClassroomMappings")
        .get();
      const batch = db.batch();
      mappingsSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("Revoke error:", error);
      throw new Error(error.message || "Failed to revoke access.");
    }
  }
);