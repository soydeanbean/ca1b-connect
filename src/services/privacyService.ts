// src/services/privacyService.ts

import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUserSettings } from "./settingsService";

export async function isProfilePublic(uid: string): Promise<boolean> {
  try {
    const settings = await getUserSettings(uid);
    return settings.privacyMode === "public";
  } catch {
    return true; // Default to public if settings can't be loaded
  }
}

export async function canViewProfile(
  viewerUid: string,
  targetUid: string
): Promise<boolean> {
  // Teachers and admins can always view
  try {
    const viewerRef = doc(db, "classCA1B_Profiles", viewerUid);
    const viewerSnap = await getDoc(viewerRef);
    const viewerData = viewerSnap.data();

    if (viewerData?.role === "teacher" || viewerData?.role === "admin") {
      return true;
    }

    // Self-view is always allowed
    if (viewerUid === targetUid) {
      return true;
    }
  } catch {
    // Fall through to privacy check
  }

  // Check target's privacy setting
  return isProfilePublic(targetUid);
}