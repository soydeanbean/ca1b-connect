// src/types/Subject.ts

export interface Subject {
  code: string;
  name: string;
  room: string;
  backgroundImage: string;
  createdAt: unknown;
  color?: string;
  icon?: string;
}

export interface SubjectSchedule {
  subjectCode: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface AttendanceSession {
  id: string;
  subjectCode: string;
  date: string;
  status: "active" | "completed";
  records: Record<string, SessionAttendanceRecord>;
  summary: SessionAttendanceSummary;
  createdAt: unknown;
  createdBy: string;
}

export type SessionAttendanceStatus = "present" | "late" | "absent" | "excused";

export interface SessionAttendanceRecord {
  uid: string;
  name: string;
  email: string;
  number: string;
  status: SessionAttendanceStatus;
  note: string;
  scannedAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface SessionAttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export interface SubjectActivity {
  id: string;
  subjectCode: string;
  title: string;
  description: string;
  type: "assignment" | "project" | "activity" | "quiz";
  dueDate: string;
  dueTime: string;
  link?: string;
  completedBy: Record<string, SubjectActivityCompletion>;
  createdAt: unknown;
  createdBy: string;
  updatedAt: unknown;
  updatedBy: string;
}

export interface SubjectActivityCompletion {
  uid: string;
  name: string;
  email: string;
  completedAt: unknown;
}

export interface SubjectStats {
  totalActivities: number;
  completedActivities: number;
  averageAttendance: number;
  totalStudents: number;
}

export interface SubjectActivityFormValues {
  title: string;
  description: string;
  type: "assignment" | "project" | "activity" | "quiz";
  dueDate: string;
  dueTime: string;
  link: string;
}