// src/services/attendanceService.ts

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "../lib/firebase";
import type {
  AttendanceDay,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  PersonalAttendanceOverview
} from "../types/Attendance";
import type { UserProfile } from "../types/Profile";

const ATTENDANCE_COLLECTION = "classCA1B_Attendance";
const PROFILE_COLLECTION = "classCA1B_Profiles";

export function getTodayDateId() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getAttendanceRef(date: string) {
  return doc(db, ATTENDANCE_COLLECTION, date);
}

export function canManageAttendance(profile: UserProfile | null) {
  return profile?.officerRole === "beadle" || profile?.role === "teacher";
}

export function buildAttendanceSummary(
  records: Record<string, AttendanceRecord>
): AttendanceSummary {
  const values = Object.values(records);

  return {
    total: values.length,
    present: values.filter((record) => record.status === "present").length,
    late: values.filter((record) => record.status === "late").length,
    absent: values.filter((record) => record.status === "absent").length,
    excused: values.filter((record) => record.status === "excused").length
  };
}

export async function getSavedAttendanceDates() {
  const attendanceQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    orderBy("date", "desc")
  );

  const snap = await getDocs(attendanceQuery);

  return snap.docs
    .map((attendanceDoc) => attendanceDoc.data().date as string)
    .filter(Boolean);
}

export async function getAttendanceDay(date: string) {
  const snap = await getDoc(getAttendanceRef(date));

  if (!snap.exists()) return null;

  return snap.data() as AttendanceDay;
}

export async function getAllAttendanceDays() {
  const attendanceQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    orderBy("date", "desc")
  );

  const snap = await getDocs(attendanceQuery);

  return snap.docs.map((attendanceDoc) => attendanceDoc.data() as AttendanceDay);
}

export async function getActiveClassStudents() {
  const studentsQuery = query(
    collection(db, PROFILE_COLLECTION),
    where("role", "==", "student"),
    where("status", "==", "active"),
    where("class", "==", "CA1B")
  );

  const snap = await getDocs(studentsQuery);

  return snap.docs
    .map((studentDoc) => studentDoc.data() as UserProfile)
    .sort((a, b) => {
      const numberA = Number(a.number || 9999);
      const numberB = Number(b.number || 9999);

      if (numberA !== numberB) return numberA - numberB;
      return a.name.localeCompare(b.name);
    });
}

export async function createAttendanceDay(date: string, creatorUid: string) {
  const existing = await getAttendanceDay(date);

  if (existing) return existing;

  const students = await getActiveClassStudents();

  const records = students.reduce<Record<string, AttendanceRecord>>(
    (result, student) => {
      result[student.uid] = {
        uid: student.uid,
        name: student.name,
        email: student.email,
        number: student.number,
        status: "absent",
        note: ""
      };

      return result;
    },
    {}
  );

  const attendanceDay: AttendanceDay = {
    id: date,
    date,
    records,
    summary: buildAttendanceSummary(records),
    createdAt: serverTimestamp(),
    createdBy: creatorUid,
    updatedAt: serverTimestamp(),
    updatedBy: creatorUid
  };

  await setDoc(getAttendanceRef(date), attendanceDay);

  return attendanceDay;
}

export async function updateAttendanceRecord(
  date: string,
  studentUid: string,
  data: {
    status: AttendanceStatus;
    note?: string;
    updatedBy: string;
  }
) {
  const attendance = await getAttendanceDay(date);

  if (!attendance) {
    throw new Error("Attendance day does not exist.");
  }

  const currentRecord = attendance.records[studentUid];

  if (!currentRecord) {
    throw new Error("Student record does not exist for this attendance day.");
  }

  const nextRecords: Record<string, AttendanceRecord> = {
    ...attendance.records,
    [studentUid]: {
      ...currentRecord,
      status: data.status,
      note: data.status === "excused" ? data.note || "" : "",
      updatedAt: serverTimestamp(),
      updatedBy: data.updatedBy
    }
  };

  await updateDoc(getAttendanceRef(date), {
    records: nextRecords,
    summary: buildAttendanceSummary(nextRecords),
    updatedAt: serverTimestamp(),
    updatedBy: data.updatedBy
  });
}

export async function deleteAttendanceDay(date: string) {
  await deleteDoc(getAttendanceRef(date));
}

export async function getStudentAttendanceOverview(
  uid: string
): Promise<PersonalAttendanceOverview> {
  const days = await getAllAttendanceDays();

  const entries = days
    .map((day) => {
      const record = day.records?.[uid];

      if (!record) return null;

      return {
        date: day.date,
        status: record.status,
        note: record.note || ""
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const present = entries.filter((entry) => entry.status === "present").length;
  const late = entries.filter((entry) => entry.status === "late").length;
  const absent = entries.filter((entry) => entry.status === "absent").length;
  const excused = entries.filter((entry) => entry.status === "excused").length;
  const countedAsAttended = present + late + excused;

  return {
    totalDays: entries.length,
    present,
    late,
    absent,
    excused,
    attendanceRate:
      entries.length === 0
        ? 0
        : Math.round((countedAsAttended / entries.length) * 100),
    entries
  };
}