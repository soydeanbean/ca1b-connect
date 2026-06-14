// src/services/personalTaskService.ts

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PersonalTask, PersonalTaskFormValues } from "../types/PersonalTask";
import type { UserProfile } from "../types/Profile";

const TASK_COLLECTION = "classCA1B_UserTasks";

function getTaskRef(id: string) {
  return doc(db, TASK_COLLECTION, id);
}

export async function getPersonalTasks(uid: string) {
  const tasksQuery = query(
    collection(db, TASK_COLLECTION),
    where("uid", "==", uid)
  );
  const snap = await getDocs(tasksQuery);
  const tasks = snap.docs.map((doc) => doc.data() as PersonalTask);
  return tasks.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createPersonalTask(
  values: PersonalTaskFormValues,
  profile: UserProfile
) {
  const taskRef = doc(collection(db, TASK_COLLECTION));
  const task: PersonalTask = {
    id: taskRef.id,
    uid: profile.uid,
    title: values.title.trim(),
    description: values.description.trim(),
    date: values.date,
    time: values.time,
    deadline: values.deadline || undefined,
    completed: false,
    createdBy: profile.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(taskRef, task);
  return task;
}

export async function updatePersonalTask(
  task: PersonalTask,
  values: PersonalTaskFormValues,
  uid: string
) {
  if (task.uid !== uid) throw new Error("Not authorized to edit this task");

  const nextTask: PersonalTask = {
    ...task,
    title: values.title.trim(),
    description: values.description.trim(),
    date: values.date,
    time: values.time,
    deadline: values.deadline || undefined,
    updatedAt: serverTimestamp()
  };

  await setDoc(getTaskRef(task.id), nextTask);
  return nextTask;
}

export async function deletePersonalTask(taskId: string) {
  const taskRef = getTaskRef(taskId);
  await deleteDoc(taskRef);
}

export async function togglePersonalTaskCompletion(task: PersonalTask, uid: string) {
  if (task.uid !== uid) throw new Error("Not authorized");

  await updateDoc(getTaskRef(task.id), {
    completed: !task.completed,
    updatedAt: serverTimestamp()
  });
}