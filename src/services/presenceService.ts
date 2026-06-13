// src/services/presenceService.ts

import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";

const PRESENCE_COLLECTION = "classCA1B_Presence";
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// ─── Start tracking presence for a user ────────────

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startPresence(uid: string) {
  const ref = doc(db, PRESENCE_COLLECTION, uid);

  // Mark as online immediately
  setDoc(ref, {
    uid,
    online: true,
    lastSeen: serverTimestamp()
  }).catch(() => {});

  // Set up onDisconnect (Firebase auto-switches to offline when client disconnects)
  // Firestore doesn't have native onDisconnect like Realtime DB, so we rely on heartbeats
  // and detect stale entries on the client side

  // Heartbeat: update lastSeen every 30 seconds
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    setDoc(ref, {
      uid,
      online: true,
      lastSeen: serverTimestamp()
    }).catch(() => {});
  }, HEARTBEAT_INTERVAL);

  // Mark offline on page unload
  const handleUnload = () => {
    setDoc(ref, {
      uid,
      online: false,
      lastSeen: serverTimestamp()
    }).catch(() => {});
  };

  window.addEventListener("beforeunload", handleUnload);

  // Return cleanup function
  return () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    window.removeEventListener("beforeunload", handleUnload);

    // Mark offline
    setDoc(ref, {
      uid,
      online: false,
      lastSeen: serverTimestamp()
    }).catch(() => {});
  };
}

// ─── Subscribe to presence of all students ─────────

export function subscribeToAllPresence(
  uids: string[],
  callback: (presence: Map<string, boolean>) => void
) {
  if (uids.length === 0) {
    callback(new Map());
    return () => {};
  }

  const q = query(
    collection(db, PRESENCE_COLLECTION),
    where("uid", "in", uids)
  );

  return onSnapshot(q, (snapshot) => {
    const presenceMap = new Map<string, boolean>();

    snapshot.docs.forEach((d) => {
      const data = d.data();
      presenceMap.set(data.uid, data.online === true);
    });

    // Any user not in presence map is offline
    for (const uid of uids) {
      if (!presenceMap.has(uid)) {
        presenceMap.set(uid, false);
      }
    }

    callback(presenceMap);
  });
}
