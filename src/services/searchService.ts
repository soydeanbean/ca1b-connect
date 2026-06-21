import { getActivities } from "./activityService";
import { getCalendarEvents } from "./eventService";
import { getClassProfiles } from "./profileService";
import { getAllSubjectAnnouncements } from "./subjectAnnouncementService";
import { getAllSubjects, getSubjectActivities } from "./subjectService";

export type GlobalSearchResult = {
  id: string;
  label: string;
  description: string;
  category: "Activities" | "Announcements" | "Attendance" | "Calendar" | "Students";
  path: string;
};

function includesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export async function searchGlobal(rawQuery: string): Promise<GlobalSearchResult[]> {
  const searchQuery = rawQuery.trim().toLowerCase();

  if (searchQuery.length < 2) return [];

  const [profiles, activities, events, subjectAnnouncements, subjects] = await Promise.all([
    getClassProfiles(),
    getActivities(),
    getCalendarEvents(),
    getAllSubjectAnnouncements(),
    Promise.resolve(getAllSubjects())
  ]);

  // Load subject activities
  const subjectCodes = subjects.map(s => s.code).filter(c => c !== "ASSEMBLY" && c !== "EXAMEN");
  const subjectActivityPromises = subjectCodes.map(code => getSubjectActivities(code));
  const subjectActivityArrays = await Promise.all(subjectActivityPromises);
  const allSubjectActivities = subjectActivityArrays.flat();

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

  // Subject announcements
  const subjectAnnouncementResults = subjectAnnouncements
    .filter((a) =>
      includesQuery(`${a.title} ${a.content} ${a.subjectCode} ${a.creatorName}`, searchQuery)
    )
    .map<GlobalSearchResult>((a) => ({
      id: `subject-announcement-${a.id}`,
      label: a.title,
      description: `[${a.subjectCode}] ${a.content.slice(0, 100)}`,
      category: "Announcements",
      path: `/subject-announcements`
    }));

  // Subject activities
  const subjectActivityResults = allSubjectActivities
    .filter((a) =>
      includesQuery(`${a.title} ${a.description} ${a.subjectCode}`, searchQuery)
    )
    .map<GlobalSearchResult>((a) => ({
      id: `subject-activity-${a.id}`,
      label: a.title,
      description: `[${a.subjectCode}] ${a.type} • due ${a.dueDate}`,
      category: "Activities",
      path: `/subject-activities`
    }));

  return [...studentResults, ...activityResults, ...subjectActivityResults, ...subjectAnnouncementResults, ...eventResults].slice(0, 12);
}
