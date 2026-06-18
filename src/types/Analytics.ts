// src/types/Analytics.ts

export interface ActivityTimelinePoint {
  date: string;
  count: number;
}

export interface AnnouncementTimelinePoint {
  date: string;
  count: number;
}

export interface SubjectWorkloadBreakdown {
  subjectCode: string;
  subjectName: string;
  activityCount: number;
  announcementCount: number;
  totalCount: number;
}

export interface PersonalProductivityStats {
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export interface AttendanceAnalytics {
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  attendancePercentage: number;
}

export interface AnalyticsData {
  activityTimeline: ActivityTimelinePoint[];
  announcementTimeline: AnnouncementTimelinePoint[];
  combinedTimeline: (ActivityTimelinePoint & { type: "activity" | "announcement" })[];
  subjectBreakdown: SubjectWorkloadBreakdown[];
  productivity: PersonalProductivityStats;
  attendance: AttendanceAnalytics;
}

export type TimelineView = "daily" | "weekly" | "monthly";