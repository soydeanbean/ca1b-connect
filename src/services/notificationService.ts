// src/services/notificationService.ts

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Notification, UserNotification } from "../types/Notification";
import { getClassProfiles } from "./profileService";

const NOTIFICATION_COLLECTION = "classCA1B_Notifications";
const USER_NOTIFICATION_COLLECTION = "classCA1B_UserNotifications";

// ─── Helper refs ────────────────────────────────────────────

function getUserNotificationRef(uid: string, id: string) {
  return doc(db, USER_NOTIFICATION_COLLECTION, `${uid}_${id}`);
}

// ─── Create a global (major) notification (sent to ALL students) ──

export async function createGlobalNotification(data: {
  type: "major";
  category: Notification["category"];
  title: string;
  message: string;
  senderUid: string | null;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const notifRef = doc(collection(db, NOTIFICATION_COLLECTION));
  const profiles = await getClassProfiles();

  const notification: Notification = {
    id: notifRef.id,
    type: data.type,
    category: data.category,
    title: data.title,
    message: data.message,
    senderUid: data.senderUid,
    global: true,
    targetUids: profiles.map((p) => p.uid),
    link: data.link,
    metadata: data.metadata,
    createdAt: serverTimestamp()
  };

  // Write the master notification
  await setDoc(notifRef, notification);

  // Fan-out: create a UserNotification for each student
  const batch = writeBatch(db);

  for (const profile of profiles) {
    const userNotifRef = getUserNotificationRef(profile.uid, notifRef.id);
    const userNotif: UserNotification = {
      id: `${profile.uid}_${notifRef.id}`,
      notificationId: notifRef.id,
      uid: profile.uid,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      link: data.link,
      read: false,
      readAt: null,
      createdAt: serverTimestamp()
    };
    batch.set(userNotifRef, userNotif);
  }

  await batch.commit();

  return notification;
}

// ─── Create a personal (minor) notification (targeted) ──

export async function createPersonalNotification(data: {
  type: "minor";
  category: Notification["category"];
  title: string;
  message: string;
  senderUid: string | null;
  targetUids: string[];
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const notifRef = doc(collection(db, NOTIFICATION_COLLECTION));

  const notification: Notification = {
    id: notifRef.id,
    type: data.type,
    category: data.category,
    title: data.title,
    message: data.message,
    senderUid: data.senderUid,
    global: false,
    targetUids: data.targetUids,
    link: data.link,
    metadata: data.metadata,
    createdAt: serverTimestamp()
  };

  await setDoc(notifRef, notification);

  const batch = writeBatch(db);

  for (const uid of data.targetUids) {
    const userNotifRef = getUserNotificationRef(uid, notifRef.id);
    const userNotif: UserNotification = {
      id: `${uid}_${notifRef.id}`,
      notificationId: notifRef.id,
      uid,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      link: data.link,
      read: false,
      readAt: null,
      createdAt: serverTimestamp()
    };
    batch.set(userNotifRef, userNotif);
  }

  await batch.commit();

  return notification;
}

// ─── Mark a single notification as read ──

export async function markNotificationAsRead(uid: string, notificationId: string) {
  const ref = getUserNotificationRef(uid, notificationId);
  await updateDoc(ref, {
    read: true,
    readAt: serverTimestamp()
  });
}

// ─── Mark all notifications as read ──

export async function markAllNotificationsAsRead(uid: string) {
  const q = query(
    collection(db, USER_NOTIFICATION_COLLECTION),
    where("uid", "==", uid),
    where("read", "==", false)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      read: true,
      readAt: serverTimestamp()
    });
  });

  await batch.commit();
}

// ─── Delete a single notification ──

export async function deleteNotification(uid: string, notificationId: string) {
  const ref = getUserNotificationRef(uid, notificationId);
  await deleteDoc(ref);
}

// ─── Clear all notifications for a user ──

export async function clearAllNotifications(uid: string) {
  const q = query(
    collection(db, USER_NOTIFICATION_COLLECTION),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
}

// ─── Listen to real-time notification updates ──

export function subscribeToNotifications(
  uid: string,
  callback: (notifications: UserNotification[]) => void,
  maxCount = 50
) {
  const q = query(
    collection(db, USER_NOTIFICATION_COLLECTION),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(
      (docSnap) => docSnap.data() as UserNotification
    );
    callback(notifications);
  });
}

// ─── Get unread count ──

export function subscribeToUnreadCount(
  uid: string,
  callback: (count: number) => void
) {
  const q = query(
    collection(db, USER_NOTIFICATION_COLLECTION),
    where("uid", "==", uid),
    where("read", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}