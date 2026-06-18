// src/services/subjectAnnouncementService.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  SubjectAnnouncement,
  SubjectAnnouncementFormValues
} from "../types/SubjectAnnouncement";
import type { UserProfile } from "../types/Profile";

const COLLECTION = "subjectAnnouncements";

function getRef(id: string) {
  return doc(db, COLLECTION, id);
}

export async function getSubjectAnnouncements(subjectCode: string): Promise<SubjectAnnouncement[]> {
  const q = query(
    collection(db, COLLECTION),
    where("subjectCode", "==", subjectCode),
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as SubjectAnnouncement);
}

export async function getAllSubjectAnnouncements(): Promise<SubjectAnnouncement[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as SubjectAnnouncement);
}

export async function getSubjectAnnouncement(id: string): Promise<SubjectAnnouncement | null> {
  const snap = await getDoc(getRef(id));
  if (!snap.exists()) return null;
  return snap.data() as SubjectAnnouncement;
}

export async function createSubjectAnnouncement(
  values: SubjectAnnouncementFormValues,
  subjectCode: string,
  creator: UserProfile
): Promise<SubjectAnnouncement> {
  const ref = doc(collection(db, COLLECTION));
  const announcement: SubjectAnnouncement = {
    id: ref.id,
    subjectCode,
    title: values.title.trim(),
    content: values.content.trim(),
    pinned: values.pinned,
    attachments: [],
    createdBy: creator.uid,
    creatorName: creator.name,
    creatorRole: creator.officerRole || creator.role,
    creatorPhotoURL: creator.photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (values.dueDate) {
    announcement.dueDate = values.dueDate;
  }

  await setDoc(ref, announcement);
  return announcement;
}

export async function updateSubjectAnnouncement(
  id: string,
  values: SubjectAnnouncementFormValues,
  editorUid: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    title: values.title.trim(),
    content: values.content.trim(),
    pinned: values.pinned,
    updatedAt: serverTimestamp(),
    updatedBy: editorUid
  };

  if (values.dueDate) {
    updateData.dueDate = values.dueDate;
  } else {
    updateData.dueDate = null;
  }

  await updateDoc(getRef(id), updateData);
}

export async function deleteSubjectAnnouncement(id: string): Promise<void> {
  await deleteDoc(getRef(id));
}

export async function togglePinSubjectAnnouncement(
  id: string,
  currentPinned: boolean
): Promise<void> {
  await updateDoc(getRef(id), {
    pinned: !currentPinned,
    updatedAt: serverTimestamp()
  });
}

export async function addAttachment(
  announcementId: string,
  attachment: { name: string; url: string; type: string; size: number }
): Promise<void> {
  const ref = getRef(announcementId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Announcement not found");
  const data = snap.data() as SubjectAnnouncement;
  const attachments = [...(data.attachments || []), attachment];
  await updateDoc(ref, { attachments, updatedAt: serverTimestamp() });
}

export async function removeAttachment(
  announcementId: string,
  attachmentUrl: string
): Promise<void> {
  const ref = getRef(announcementId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Announcement not found");
  const data = snap.data() as SubjectAnnouncement;
  const attachments = (data.attachments || []).filter(a => a.url !== attachmentUrl);
  await updateDoc(ref, { attachments, updatedAt: serverTimestamp() });
}