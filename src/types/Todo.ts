// src/types/Todo.ts

export type TodoStatus = "pending" | "done" | "overdue";

export type TodoSource = "manual" | "assignment";

export type Todo = {
  id: string;
  uid: string;
  title: string;
  description: string;
  scheduledDate: string;   // "YYYY-MM-DD"
  scheduledTime: string;   // "HH:MM" or ""
  source: TodoSource;
  /** If source === "assignment", the activity id */
  sourceId: string | null;
  status: TodoStatus;
  createdAt: unknown;
};