// src/services/analyticsService.ts

import { SUBJECTS } from "../data/ScheduleData";
import type {
  AnalyticsData,
  ActivityTimelinePoint,
  SubjectWorkloadBreakdown,
  PersonalProductivityStats,
  AttendanceAnalytics,
  TimelineView
} from "../types/Analytics";
import { getSubjectActivities, getStudentSubjectActivityStats } from "./subjectService";
import { getAllSubjectAnnouncements } from "./subjectAnnouncementService";
import { getAllSessions } from "./subjectService";

function getDateRange(view: TimelineView): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];

  const start = new Date(now);
  if (view === "daily") {
    start.setDate(start.getDate() - 30);
  } else if (view === "weekly") {
    start.setDate(start.getDate() - 90);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }

  return { start: start.toISOString().split("T")[0], end };
}

function buildTimeline(
  dates: string[],
  view: TimelineView
): ActivityTimelinePoint[] {
  const countMap: Record<string, number> = {};
  dates.forEach((date) => {
    if (!date) return;
    const key = view === "daily" ? date : getWeekKey(date);
    countMap[key] = (countMap[key] || 0) + 1;
  });

  return Object.entries(countMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const startOfWeek = new Date(date);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  return startOfWeek.toISOString().split("T")[0];
}

export async function getAnalyticsData(
  uid: string,
  view: TimelineView = "daily"
): Promise<AnalyticsData> {
  const { start, end } = getDateRange(view);

  // Get all subject activities
  const activitiesPromises = SUBJECTS.filter(s => s.code !== "ASSEMBLY" && s.code !== "EXAMEN")
    .map(s => getSubjectActivities(s.code));
  const activitiesResults = await Promise.all(activitiesPromises);
  const allActivities = activitiesResults.flat();

  // Get all subject announcements
  const allAnnouncements = await getAllSubjectAnnouncements();

  // Filter by date range
  const filteredActivities = allActivities.filter(a => a.dueDate >= start && a.dueDate <= end);
  const filteredAnnouncements = allAnnouncements.filter(a => {
    const created = (a.createdAt as any)?.toDate?.()?.toISOString().split("T")[0];
    return created && created >= start && created <= end;
  });

  // Activity timeline
  const activityDates = filteredActivities.map(a => a.dueDate);
  const activityTimeline = buildTimeline(activityDates, view);

  // Announcement timeline
  const announcementDates = filteredAnnouncements.map(a => {
    const ts = (a.createdAt as any)?.toDate?.();
    return ts ? ts.toISOString().split("T")[0] : "";
  }).filter(Boolean);
  const announcementTimeline = buildTimeline(announcementDates, view);

  // Combined timeline
  const combinedMap: Record<string, { activity: number; announcement: number }> = {};
  activityDates.forEach(date => {
    if (!combinedMap[date]) combinedMap[date] = { activity: 0, announcement: 0 };
    combinedMap[date].activity++;
  });
  announcementDates.forEach(date => {
    if (!combinedMap[date]) combinedMap[date] = { activity: 0, announcement: 0 };
    combinedMap[date].announcement++;
  });
  const combinedTimeline = Object.entries(combinedMap)
    .map(([date, counts]) => [
      { date, count: counts.activity, type: "activity" as const },
      { date, count: counts.announcement, type: "announcement" as const }
    ])
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date));

  // Subject breakdown
  const subjectBreakdown: SubjectWorkloadBreakdown[] = SUBJECTS
    .filter(s => s.code !== "ASSEMBLY" && s.code !== "EXAMEN")
    .map(subject => {
      const subjectActs = allActivities.filter(a => a.subjectCode === subject.code);
      const subjectAnncs = allAnnouncements.filter(a => a.subjectCode === subject.code);
      return {
        subjectCode: subject.code,
        subjectName: subject.name,
        activityCount: subjectActs.length,
        announcementCount: subjectAnncs.length,
        totalCount: subjectActs.length + subjectAnncs.length
      };
    });

  // Personal productivity
  const stats = await getStudentSubjectActivityStats(uid);
  let totalCompleted = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let totalAll = 0;

  Object.values(stats).forEach(s => {
    totalCompleted += s.completed;
    totalPending += s.total - s.completed;
    totalOverdue += s.overdue;
    totalAll += s.total;
  });

  const productivity: PersonalProductivityStats = {
    completed: totalCompleted,
    pending: totalPending,
    overdue: totalOverdue,
    completionRate: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0
  };

  // Attendance analytics
  const sessions = await getAllSessions();
  let present = 0;
  let late = 0;
  let excused = 0;
  let absent = 0;

  sessions.forEach(session => {
    const record = session.records[uid];
    if (record) {
      switch (record.status) {
        case "present": present++; break;
        case "late": late++; break;
        case "excused": excused++; break;
        case "absent": absent++; break;
      }
    }
  });

  const total = present + late + excused + absent;
  const attendance: AttendanceAnalytics = {
    present,
    late,
    excused,
    absent,
    total,
    attendancePercentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0
  };

  return {
    activityTimeline,
    announcementTimeline,
    combinedTimeline,
    subjectBreakdown,
    productivity,
    attendance
  };
}