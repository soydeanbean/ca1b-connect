import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../lib/firebase";
import type { ClassCalendarEvent, EventFormValues } from "../types/Event";

const EVENT_COLLECTION = "classCA1B_Events";

function getEventRef(id: string) {
  return doc(db, EVENT_COLLECTION, id);
}

export async function getCalendarEvents() {
  const eventsQuery = query(collection(db, EVENT_COLLECTION), orderBy("date", "asc"));
  const snap = await getDocs(eventsQuery);

  return snap.docs.map((eventDoc) => eventDoc.data() as ClassCalendarEvent);
}

export async function createCalendarEvent(values: EventFormValues, creatorUid: string) {
  const eventRef = doc(collection(db, EVENT_COLLECTION));

  const event: ClassCalendarEvent = {
    id: eventRef.id,
    title: values.title.trim(),
    type: values.type,
    date: values.date,
    time: values.time,
    location: values.location.trim(),
    details: values.details.trim(),
    createdAt: serverTimestamp(),
    createdBy: creatorUid,
    updatedAt: serverTimestamp(),
    updatedBy: creatorUid
  };

  await setDoc(eventRef, event);
  return event;
}

export async function updateCalendarEvent(
  event: ClassCalendarEvent,
  values: EventFormValues,
  editorUid: string
) {
  const nextEvent: ClassCalendarEvent = {
    ...event,
    title: values.title.trim(),
    type: values.type,
    date: values.date,
    time: values.time,
    location: values.location.trim(),
    details: values.details.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: editorUid
  };

  await setDoc(getEventRef(event.id), nextEvent);
  return nextEvent;
}

export async function deleteCalendarEvent(id: string) {
  await deleteDoc(getEventRef(id));
}
