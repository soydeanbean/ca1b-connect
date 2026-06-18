// src/services/fcmService.ts

import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PushSubscriptionData, NotificationPreference } from "../types/PushSubscription";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types/PushSubscription";

const COLLECTION = "pushSubscriptions";
const PREF_COLLECTION = "notificationPreferences";

// Check if the browser supports notifications
export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

// Check if notification permission is granted
export function hasNotificationPermission(): boolean {
  return Notification.permission === "granted";
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return false;
  }
}

// Get FCM token (simplified - in production use @firebase/messaging)
export async function getFCMToken(): Promise<string | null> {
  try {
    // In a full implementation, this would use Firebase Messaging
    // For now, we generate a device token from service worker registration
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return JSON.stringify(subscription);
    }

    // Request push subscription
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
    if (!publicKey) return null;

    const keyBuffer = urlBase64ToUint8Array(publicKey);
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBuffer as unknown as string
    });

    return JSON.stringify(newSubscription);
  } catch (error) {
    console.error("Failed to get FCM token:", error);
    return null;
  }
}

// Save push subscription to Firestore
export async function savePushSubscription(
  userId: string,
  token: string
): Promise<void> {
  const ref = doc(db, COLLECTION, userId);

  const subscription: PushSubscriptionData = {
    id: userId,
    userId,
    token,
    platform: "web",
    topics: [],
    enabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, {
      token,
      enabled: true,
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, subscription);
  }
}

// Remove push subscription
export async function removePushSubscription(userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  await updateDoc(ref, { enabled: false, updatedAt: serverTimestamp() });
}

// Get notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreference> {
  try {
    const ref = doc(db, PREF_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as NotificationPreference;
    }
  } catch (error) {
    console.error("Failed to load notification preferences:", error);
  }
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

// Save notification preferences
export async function saveNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreference>
): Promise<void> {
  const ref = doc(db, PREF_COLLECTION, userId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, {
      ...preferences,
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...preferences,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

// Subscribe to a topic
export async function subscribeToTopic(
  userId: string,
  topic: string
): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as PushSubscriptionData;
  const topics = data.topics || [];
  if (!topics.includes(topic)) {
    await updateDoc(ref, {
      topics: [...topics, topic],
      updatedAt: serverTimestamp()
    });
  }
}

// Unsubscribe from a topic
export async function unsubscribeFromTopic(
  userId: string,
  topic: string
): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as PushSubscriptionData;
  const topics = (data.topics || []).filter(t => t !== topic);
  await updateDoc(ref, {
    topics,
    updatedAt: serverTimestamp()
  });
}

// Helper: Convert base64 string to Uint8Array for VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}