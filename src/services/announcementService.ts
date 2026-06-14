// src/services/announcementService.ts

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Announcement, AnnouncementFormValues } from "../types/Announcement";
import type { UserProfile } from "../types/Profile";

const ANNOUNCEMENT_COLLECTION = "classCA1B_Announcements";

export function getAnnouncementRef(id: string) {
  return doc(db, ANNOUNCEMENT_COLLECTION, id);
}

export function subscribeToAnnouncements(
  callback: (announcements: Announcement[]) => void
): Unsubscribe {
  const announcementsQuery = query(
    collection(db, ANNOUNCEMENT_COLLECTION),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(announcementsQuery, (snap) => {
    const announcements = snap.docs.map((doc) => doc.data() as Announcement);
    callback(announcements);
  });
}

export async function getAnnouncements() {
  const announcementsQuery = query(
    collection(db, ANNOUNCEMENT_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(announcementsQuery);
  return snap.docs.map((doc) => doc.data() as Announcement);
}

export async function createAnnouncement(
  values: AnnouncementFormValues,
  creator: UserProfile
) {
  const announcementRef = doc(collection(db, ANNOUNCEMENT_COLLECTION));
  const announcement: Announcement = {
    id: announcementRef.id,
    title: values.title.trim(),
    content: values.content.trim(),
    category: values.category,
    createdBy: creator.uid,
    creatorName: creator.name,
    creatorRole: creator.officerRole || creator.role,
    creatorPhotoURL: creator.photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(announcementRef, announcement);
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(getAnnouncementRef(id));
}