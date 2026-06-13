// src/services/chatService.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { ChatMessage, ChatThread } from "../types/Chat";
import type { UserProfile } from "../types/Profile";

const THREAD_COLLECTION = "classCA1B_ChatThreads";
const MESSAGE_COLLECTION = "classCA1B_ChatMessages";
const MAX_MESSAGES = 100;

// ─── Thread helpers ────────────────────────────────

function getPrivateThreadId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

function getThreadRef(threadId: string) {
  return doc(db, THREAD_COLLECTION, threadId);
}

function getMessageRef(messageId: string) {
  return doc(db, MESSAGE_COLLECTION, messageId);
}

function getMessagesQuery(threadId: string) {
  return query(
    collection(db, MESSAGE_COLLECTION),
    where("threadId", "==", threadId),
    orderBy("createdAt", "desc"),
    limit(MAX_MESSAGES)
  );
}

// ─── Create or get group thread (singleton) ────────

const GROUP_THREAD_ID = "classCA1B_GroupChat";

export async function ensureGroupThread() {
  const ref = getThreadRef(GROUP_THREAD_ID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const thread: ChatThread = {
      id: GROUP_THREAD_ID,
      type: "group",
      participantUid: null,
      participantName: "General Chat",
      participantPhotoURL: "",
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastSenderName: "",
      messageCount: 0
    };
    await setDoc(ref, thread);
  }

  return GROUP_THREAD_ID;
}

// ─── Create or get private thread ──────────────────

export async function ensurePrivateThread(
  currentUid: string,
  other: UserProfile
) {
  const threadId = getPrivateThreadId(currentUid, other.uid);
  const ref = getThreadRef(threadId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const thread: ChatThread = {
      id: threadId,
      type: "private",
      participantUid: other.uid,
      participantName: other.name,
      participantPhotoURL: other.photoURL,
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastSenderName: "",
      messageCount: 0
    };
    await setDoc(ref, thread);
  }

  return threadId;
}

// ─── Send a message ────────────────────────────────

export async function sendMessage(
  threadId: string,
  sender: UserProfile,
  text: string
) {
  if (!text.trim()) return;

  const msgRef = doc(collection(db, MESSAGE_COLLECTION));

  const message: ChatMessage = {
    id: msgRef.id,
    threadId,
    senderUid: sender.uid,
    senderName: sender.name,
    senderPhotoURL: sender.photoURL,
    text: text.trim(),
    pinned: false,
    createdAt: serverTimestamp()
  };

  const batch = writeBatch(db);

  // Write message
  batch.set(msgRef, message);

  // Update thread metadata
  batch.update(getThreadRef(threadId), {
    lastMessage: text.trim().slice(0, 120),
    lastMessageAt: serverTimestamp(),
    lastSenderName: sender.name,
    messageCount: increment(1)
  });

  await batch.commit();

  // FIFO prune: delete oldest messages if over limit
  await pruneMessages(threadId);

  return message;
}

// ─── FIFO prune: keep only newest MAX_MESSAGES ─────

async function pruneMessages(threadId: string) {
  const countSnap = await getDoc(getThreadRef(threadId));
  const count = countSnap.data()?.messageCount as number | undefined;

  if (!count || count <= MAX_MESSAGES) return;

  // Get excess messages (oldest)
  const excess = count - MAX_MESSAGES;

  const q = query(
    collection(db, MESSAGE_COLLECTION),
    where("threadId", "==", threadId),
    orderBy("createdAt", "asc"),
    limit(excess)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Pin / unpin a message ─────────────────────────

export async function togglePinMessage(messageId: string, currentPinned: boolean) {
  await updateDoc(getMessageRef(messageId), {
    pinned: !currentPinned
  });
}

// ─── Delete a message (only own messages for privacy) ──

export async function deleteMessage(messageId: string) {
  await deleteDoc(getMessageRef(messageId));
}

// ─── Real-time subscriptions ───────────────────────

export function subscribeToThreads(
  callback: (threads: ChatThread[]) => void
) {
  // Group chat always shown; private chats where participant matches
  const q = query(
    collection(db, THREAD_COLLECTION),
    where("type", "==", "group")
  );

  return onSnapshot(q, (snapshot) => {
    const threads = snapshot.docs.map((d) => d.data() as ChatThread);
    callback(threads);
  });
}

export function subscribeToMessages(
  threadId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const q = getMessagesQuery(threadId);

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((d) => d.data() as ChatMessage)
      .reverse(); // oldest first for display
    callback(messages);
  });
}

export function subscribeToPinnedMessages(
  threadId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const q = query(
    collection(db, MESSAGE_COLLECTION),
    where("threadId", "==", threadId),
    where("pinned", "==", true),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => d.data() as ChatMessage);
    callback(messages);
  });
}