// src/services/priorityService.ts

import { getTodos } from "./todoService";
import { getActivities } from "./activityService";

export type PriorityItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  source: "activity" | "todo";
  sourceId: string;
  status: "done" | "overdue" | "pending";
  link: string;
};

export type PriorityGroup = {
  label: string;
  items: PriorityItem[];
};

function getManilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/**
 * Fetch and merge uncompleted activities + todos into priority groups.
 */
export async function getPriorityInbox(uid: string): Promise<{
  dueToday: PriorityItem[];
  overdue: PriorityItem[];
  upcoming: PriorityItem[];
}> {
  const today = getManilaToday();

  const [todos, activities] = await Promise.all([
    getTodos(uid),
    getActivities()
  ]);

  // 1. Convert uncompleted activities into PriorityItems
  const activityItems: PriorityItem[] = activities
    .filter((a) => a.deadline && !a.completedBy?.[uid])
    .map((a) => ({
      id: `activity_${a.id}`,
      title: a.title,
      description: `${activityTypeLabel(a.type)} • ${a.details ? a.details.slice(0, 120) : ""}`,
      date: a.deadline,
      source: "activity" as const,
      sourceId: a.id,
      status: a.deadline < today ? "overdue" : "pending",
      link: `/activities?activity=${a.id}`
    }));

  // 2. Convert todos into PriorityItems
  const todoItems: PriorityItem[] = todos
    .filter((t) => t.status !== "done")
    .map((t) => ({
      id: `todo_${t.id}`,
      title: t.title,
      description: t.description,
      date: t.scheduledDate,
      source: "todo" as const,
      sourceId: t.sourceId || t.id,
      status: t.status,
      link: "/todos"
    }));

  // 3. Merge and categorize
  const allItems = [...activityItems, ...todoItems];

  const dueToday: PriorityItem[] = [];
  const overdue: PriorityItem[] = [];
  const upcoming: PriorityItem[] = [];

  for (const item of allItems) {
    if (item.status === "overdue" || item.date < today) {
      overdue.push(item);
    } else if (item.date === today) {
      dueToday.push(item);
    } else if (item.date > today) {
      upcoming.push(item);
    }
  }

  // Sort each group by date ascending
  const sortByDate = (a: PriorityItem, b: PriorityItem) =>
    a.date.localeCompare(b.date) || a.title.localeCompare(b.title);

  dueToday.sort(sortByDate);
  overdue.sort(sortByDate);
  upcoming.sort(sortByDate);

  return { dueToday, overdue, upcoming };
}

function activityTypeLabel(type: string): string {
  switch (type) {
    case "assignment":
      return "Assignment";
    case "project":
      return "Project";
    case "activity":
      return "Class Activity";
    default:
      return type;
  }
}

export function getPriorityCounts(groups: {
  dueToday: PriorityItem[];
  overdue: PriorityItem[];
  upcoming: PriorityItem[];
}) {
  return {
    dueToday: groups.dueToday.length,
    overdue: groups.overdue.length,
    upcoming: groups.upcoming.length,
    total: groups.dueToday.length + groups.overdue.length + groups.upcoming.length
  };
}