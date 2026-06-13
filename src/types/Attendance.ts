// src/types/Attendance.ts

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type AttendanceRecord = {
  uid: string;
  name: string;
  email: string;
  number: string;
  status: AttendanceStatus;
  note: string;
  updatedAt?: unknown;
  updatedBy?: string;
};

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

export type AttendanceDay = {
  id: string;
  date: string;
  records: Record<string, AttendanceRecord>;
  summary: AttendanceSummary;
  createdAt: unknown;
  createdBy: string;
  updatedAt: unknown;
  updatedBy: string;
};

export type PersonalAttendanceEntry = {
  date: string;
  status: AttendanceStatus;
  note: string;
};

export type PersonalAttendanceOverview = {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendanceRate: number;
  entries: PersonalAttendanceEntry[];
};