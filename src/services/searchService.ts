import { getActivities } from "./activityService";
import { getCalendarEvents } from "./eventService";
import { getClassProfiles } from "./profileService";

export type GlobalSearchResult = {
  id: string;
  label: string;
  description: string;
  category: "Activities" | "Attendance" | "Calendar" | "Students";
  path: string;
};

function includesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export async function searchGlobal(rawQuery: string): Promise<GlobalSearchResult[]> {
  const searchQuery = rawQuery.trim().toLowerCase();

  if (searchQuery.length < 2) return [];

  const [profiles, activities, events] = await Promise.all([
    getClassProfiles(),
    getActivities(),
    getCalendarEvents()
  ]);

  const studentResults = profiles
    .filter((profile) =>
      includesQuery(`${profile.name} ${profile.email} ${profile.number}`, searchQuery)
    )
    .flatMap<GlobalSearchResult>((profile) => [
      {
        id: `student-${profile.uid}`,
        label: profile.name,
        description: `${profile.email} • ${profile.number || "No ID number"}`,
        category: "Students",
        path: `/students?student=${encodeURIComponent(profile.uid)}`
      },
      {
        id: `attendance-${profile.uid}`,
        label: `${profile.name} in attendance`,
        description: "Open attendance records filtered to this student",
        category: "Attendance",
        path: `/attendance?search=${encodeURIComponent(profile.name)}`
      }
    ]);

  const activityResults = activities
    .filter((activity) =>
      includesQuery(
        `${activity.title} ${activity.type} ${activity.details} ${activity.items.join(" ")}`,
        searchQuery
      )
    )
    .map<GlobalSearchResult>((activity) => ({
      id: `activity-${activity.id}`,
      label: activity.title,
      description: `${activity.type} • due ${activity.deadline}`,
      category: "Activities",
      path: `/activities?activity=${encodeURIComponent(activity.id)}`
    }));

  const eventResults = events
    .filter((event) =>
      includesQuery(`${event.title} ${event.details} ${event.location}`, searchQuery)
    )
    .map<GlobalSearchResult>((event) => ({
      id: `event-${event.id}`,
      label: event.title,
      description: `${event.type} • ${event.date}${event.time ? ` at ${event.time}` : ""}`,
      category: "Calendar",
      path: `/calendar?event=${encodeURIComponent(event.id)}`
    }));

  return [...studentResults, ...activityResults, ...eventResults].slice(0, 8);
}
