// src/services/todoService.ts

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Todo, TodoStatus } from "../types/Todo";
import type { ClassActivity } from "../types/Activity";
import { getActivities } from "./activityService";
import { createPersonalNotification } from "./notificationService";

const TODO_COLLECTION = "classCA1B_Todos";

// ─── Generate a local date string in YYYY-MM-DD (Asia/Manila) ──

function getManilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// ─── Auto-detect overdue status ──

function computeStatus(item: {
  scheduledDate: string;
  status: TodoStatus;
}): TodoStatus {
  if (item.status === "done") return "done";
  if (item.scheduledDate < getManilaToday()) return "overdue";
  return "pending";
}

// ─── CRUD for manual todos ──

export async function createTodo(data: {
  uid: string;
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
}): Promise<Todo> {
  const ref = doc(collection(db, TODO_COLLECTION));

  const todo: Todo = {
    id: ref.id,
    uid: data.uid,
    title: data.title.trim(),
    description: data.description.trim(),
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime,
    source: "manual",
    sourceId: null,
    status: "pending",
    createdAt: serverTimestamp()
  };

  await setDoc(ref, todo);
  return todo;
}

export async function updateTodo(
  id: string,
  data: {
    title?: string;
    description?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    status?: TodoStatus;
  }
) {
  const ref = doc(db, TODO_COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteTodo(id: string) {
  await deleteDoc(doc(db, TODO_COLLECTION, id));
}

export async function toggleTodoStatus(id: string, currentStatus: TodoStatus) {
  const next = currentStatus === "done" ? "pending" : "done";
  await updateDoc(doc(db, TODO_COLLECTION, id), { status: next });
  return next;
}

// ─── Fetch source-of-truth: manual todos + assignment-derived todos ──

export async function getTodos(uid: string): Promise<Todo[]> {
  // 1. Manual todos
  const q = query(
    collection(db, TODO_COLLECTION),
    where("uid", "==", uid),
    orderBy("scheduledDate", "asc")
  );
  const snap = await getDocs(q);
  const manualTodos: Todo[] = snap.docs.map((d) => d.data() as Todo);

  // 2. Assignment-derived todos (sync)
  const activities = await getActivities();
  const assignmentTodos: Todo[] = activities
    .filter((a) => a.deadline) // has a deadline
    .map((a) => activityToTodo(a, uid))
    .filter((t): t is Todo => t !== null);

  // 3. Merge: manual todos replace assignment-derived ones with same sourceId
  const merged = new Map<string, Todo>();

  for (const t of assignmentTodos) {
    merged.set(t.id, t);
  }

  for (const t of manualTodos) {
    if (t.source === "assignment" && t.sourceId) {
      // Manual override of an assignment todo
      merged.set(`assignment_${t.sourceId}`, t);
    } else {
      merged.set(t.id, t);
    }
  }

  // 4. Sort by scheduledDate, then by title
  return Array.from(merged.values())
    .map((t) => ({
      ...t,
      status: computeStatus(t)
    }))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.title.localeCompare(b.title));
}

// ─── Transform a ClassActivity into a Todo (only if not completed) ──

function activityToTodo(activity: ClassActivity, uid: string): Todo | null {
  // Only include if student hasn't completed it
  if (activity.completedBy?.[uid]) return null;

  const id = `assignment_${activity.id}`;

  const typeLabel =
    activity.type === "assignment"
      ? "Assignment"
      : activity.type === "project"
        ? "Project"
        : "Activity";

  return {
    id,
    uid,
    title: `${typeLabel}: ${activity.title}`,
    description: activity.details,
    scheduledDate: activity.deadline,
    scheduledTime: "",
    source: "assignment",
    sourceId: activity.id,
    status: "pending",
    createdAt: null
  };
}

// ─── Send minor notifications for due/overdue items ──

export async function notifyOverdueTodos(uid: string, todos: Todo[]) {
  const today = getManilaToday();

  for (const todo of todos) {
    // Due today and not done
    if (todo.scheduledDate === today && todo.status === "pending") {
      await createPersonalNotification({
        type: "minor",
        category: "deadline",
        title: "Due today",
        message: todo.title,
        senderUid: null,
        targetUids: [uid],
        link: "/todos"
      }).catch(() => {});
    }

    // Overdue
    if (todo.status === "overdue") {
      await createPersonalNotification({
        type: "minor",
        category: "deadline",
        title: "Overdue",
        message: todo.title,
        senderUid: null,
        targetUids: [uid],
        link: "/todos"
      }).catch(() => {});
    }
  }
}

// ─── Get counts for dashboard ──

export function getTodoCounts(todos: Todo[]) {
  const pending = todos.filter((t) => t.status === "pending").length;
  const done = todos.filter((t) => t.status === "done").length;
  const overdue = todos.filter((t) => t.status === "overdue").length;
  return { total: todos.length, pending, done, overdue };
}