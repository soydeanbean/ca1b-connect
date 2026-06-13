import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "../lib/firebase";
import type {
  ActivityCompletion,
  ActivityFile,
  ActivityFormValues,
  ActivityStats,
  ClassActivity
} from "../types/Activity";
import type { UserProfile } from "../types/Profile";
import { createGlobalNotification } from "./notificationService";

const ACTIVITY_COLLECTION = "classCA1B_Activities";

function getTodayId() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function parseItems(itemsText: string) {
  return itemsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getActivityRef(id: string) {
  return doc(db, ACTIVITY_COLLECTION, id);
}

async function uploadActivityFile(activityId: string, file: File): Promise<ActivityFile> {
  const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
  const fileRef = ref(storage, `${ACTIVITY_COLLECTION}/${activityId}/${safeName}`);

  await uploadBytes(fileRef, file);

  return {
    name: file.name,
    url: await getDownloadURL(fileRef)
  };
}

export async function getActivities() {
  const activitiesQuery = query(
    collection(db, ACTIVITY_COLLECTION),
    orderBy("deadline", "asc")
  );
  const snap = await getDocs(activitiesQuery);

  return snap.docs.map((activityDoc) => activityDoc.data() as ClassActivity);
}

export function splitActivitiesForStudent(activities: ClassActivity[], uid: string) {
  const today = getTodayId();

  const active = activities.filter((activity) => {
    const finished = Boolean(activity.completedBy?.[uid]);
    return activity.deadline >= today && !finished;
  });

  const history = activities
    .filter((activity) => activity.deadline < today || Boolean(activity.completedBy?.[uid]))
    .sort((a, b) => b.deadline.localeCompare(a.deadline));

  return { active, history };
}

export function getActivityStats(activities: ClassActivity[], uid: string): ActivityStats {
  const today = getTodayId();
  const completed = activities.filter((activity) => activity.completedBy?.[uid]);

  return {
    total: activities.length,
    completed: completed.length,
    pending: activities.filter(
      (activity) => activity.deadline >= today && !activity.completedBy?.[uid]
    ).length,
    overdue: activities.filter(
      (activity) => activity.deadline < today && !activity.completedBy?.[uid]
    ).length,
    assignmentsCompleted: completed.filter((activity) => activity.type === "assignment").length,
    projectsCompleted: completed.filter((activity) => activity.type === "project").length,
    activitiesCompleted: completed.filter((activity) => activity.type === "activity").length
  };
}

export async function createActivity(
  values: ActivityFormValues,
  file: File | null,
  creator: UserProfile
) {
  const activityRef = doc(collection(db, ACTIVITY_COLLECTION));
  const attachment = file ? await uploadActivityFile(activityRef.id, file) : undefined;

  const activity: ClassActivity = {
    id: activityRef.id,
    title: values.title.trim(),
    type: values.type,
    details: values.details.trim(),
    deadline: values.deadline,
    items: parseItems(values.itemsText),
    completedBy: {},
    createdAt: serverTimestamp(),
    createdBy: creator.uid,
    updatedAt: serverTimestamp(),
    updatedBy: creator.uid
  };

  if (attachment) {
    activity.file = attachment;
  }

  await setDoc(activityRef, activity);

  // 🔔 Notify all students about the new activity
  try {
    await createGlobalNotification({
      type: "major",
      category: "assignment",
      title: `New ${values.type}: ${values.title}`,
      message: `${values.type === "assignment" ? "Assignment" : values.type === "project" ? "Project" : "Activity"} "${values.title}" has been posted. Deadline: ${values.deadline}`,
      senderUid: creator.uid,
      link: "/activities"
    });
  } catch (err) {
    console.error("Failed to send activity notification:", err);
  }

  return activity;
}

export async function updateActivity(
  activity: ClassActivity,
  values: ActivityFormValues,
  file: File | null,
  editorUid: string
) {
  const attachment = file ? await uploadActivityFile(activity.id, file) : activity.file;

  const nextActivity: ClassActivity = {
    ...activity,
    title: values.title.trim(),
    type: values.type,
    details: values.details.trim(),
    deadline: values.deadline,
    items: parseItems(values.itemsText),
    updatedAt: serverTimestamp(),
    updatedBy: editorUid
  };

  if (attachment) {
    nextActivity.file = attachment;
  }

  await setDoc(getActivityRef(activity.id), nextActivity);
  return nextActivity;
}

export async function deleteActivity(id: string) {
  await deleteDoc(getActivityRef(id));
}

export async function toggleActivityCompletion(
  activity: ClassActivity,
  profile: UserProfile
) {
  const completedBy: Record<string, ActivityCompletion> = {
    ...(activity.completedBy || {})
  };

  if (completedBy[profile.uid]) {
    delete completedBy[profile.uid];
  } else {
    completedBy[profile.uid] = {
      uid: profile.uid,
      name: profile.name,
      email: profile.email,
      completedAt: serverTimestamp()
    };
  }

  await updateDoc(getActivityRef(activity.id), {
    completedBy,
    updatedAt: serverTimestamp(),
    updatedBy: profile.uid
  });
}
