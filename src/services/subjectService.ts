// src/services/subjectService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { SUBJECTS } from "../data/ScheduleData";
import { getActiveClassStudents } from "./attendanceService";
import type {
  AttendanceSession,
  SessionAttendanceRecord,
  SessionAttendanceStatus,
  SubjectActivity,
  SubjectActivityFormValues,
  SubjectActivityCompletion
} from "../types/Subject";
import type { UserProfile } from "../types/Profile";

const SESSIONS_COLLECTION = "subject_attendance_sessions";
const ACTIVITIES_COLLECTION = "subject_activities";

// ─── Date Helpers ───

export function getTodayDateId() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// ─── Subject Info ───

export function getSubjectInfo(code: string) {
  return SUBJECTS.find(s => s.code === code) || null;
}

export function getAllSubjects() {
  return SUBJECTS;
}

// ─── Attendance Sessions ───

export function getSessionRef(sessionId: string) {
  return doc(db, SESSIONS_COLLECTION, sessionId);
}

export function getSessionId(subjectCode: string, date: string) {
  return `${subjectCode}_${date}`;
}

export async function getSession(subjectCode: string, date: string): Promise<AttendanceSession | null> {
  const sessionId = getSessionId(subjectCode, date);
  const snap = await getDoc(getSessionRef(sessionId));
  if (!snap.exists()) return null;
  return snap.data() as AttendanceSession;
}

export async function getSubjectSessions(subjectCode: string) {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("subjectCode", "==", subjectCode),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as AttendanceSession);
}

export async function getAllSessions() {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as AttendanceSession);
}

function buildSessionSummary(records: Record<string, SessionAttendanceRecord>) {
  const values = Object.values(records);
  return {
    total: values.length,
    present: values.filter(r => r.status === "present").length,
    late: values.filter(r => r.status === "late").length,
    absent: values.filter(r => r.status === "absent").length,
    excused: values.filter(r => r.status === "excused").length
  };
}

export async function createSession(subjectCode: string, creatorUid: string): Promise<AttendanceSession | null> {
  const date = getTodayDateId();
  return createSessionForDate(subjectCode, date, creatorUid);
}

export async function createSessionForDate(subjectCode: string, date: string, creatorUid: string): Promise<AttendanceSession | null> {
  const sessionId = getSessionId(subjectCode, date);

  const existing = await getSession(subjectCode, date);
  if (existing) return existing;

  const subjectInfo = getSubjectInfo(subjectCode);
  if (!subjectInfo) return null;

  const students = await getActiveClassStudents();
  const records = students.reduce<Record<string, SessionAttendanceRecord>>((acc, student) => {
    acc[student.uid] = {
      uid: student.uid,
      name: student.name,
      email: student.email,
      number: student.number,
      status: "present",
      note: ""
    };
    return acc;
  }, {});

  const session: AttendanceSession = {
    id: sessionId,
    subjectCode,
    date,
    status: "active",
    records,
    summary: buildSessionSummary(records),
    createdAt: serverTimestamp(),
    createdBy: creatorUid
  };

  await setDoc(getSessionRef(sessionId), session);
  return session;
}

export async function updateSessionRecord(
  subjectCode: string,
  date: string,
  studentUid: string,
  data: {
    status: SessionAttendanceStatus;
    note?: string;
    updatedBy: string;
    scannedAt?: unknown;
  }
) {
  const sessionId = getSessionId(subjectCode, date);
  const docRef = getSessionRef(sessionId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error("Session does not exist.");
    const session = snap.data() as AttendanceSession;
    const currentRecord = session.records[studentUid];
    if (!currentRecord) throw new Error("Student record not found.");

    const nextRecords = {
      ...session.records,
      [studentUid]: {
        ...currentRecord,
        status: data.status,
        note: data.status === "excused" ? data.note || currentRecord.note : "",
        updatedAt: new Date(),
        updatedBy: data.updatedBy,
        ...(data.scannedAt ? { scannedAt: data.scannedAt } : {})
      }
    };

    transaction.update(docRef, {
      records: nextRecords,
      summary: buildSessionSummary(nextRecords),
      status: "active"
    });
  });
}

export async function completeSession(subjectCode: string, date: string) {
  const sessionId = getSessionId(subjectCode, date);
  await updateDoc(getSessionRef(sessionId), { status: "completed" });
}

export async function deleteSession(subjectCode: string, date: string) {
  const sessionId = getSessionId(subjectCode, date);
  await deleteDoc(getSessionRef(sessionId));
}

// ─── QR Late Scan ───

export async function recordLateScan(subjectCode: string, date: string, studentUid: string) {
  const sessionId = getSessionId(subjectCode, date);
  const docRef = getSessionRef(sessionId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error("Session not found.");
    const session = snap.data() as AttendanceSession;
    const record = session.records[studentUid];
    if (!record) throw new Error("Student not in session.");

    const nextRecords = {
      ...session.records,
      [studentUid]: {
        ...record,
        status: "late" as SessionAttendanceStatus,
        scannedAt: serverTimestamp(),
        updatedAt: new Date(),
        updatedBy: "qr_scan"
      }
    };

    transaction.update(docRef, {
      records: nextRecords,
      summary: buildSessionSummary(nextRecords)
    });
  });
}

// ─── Student Overview ───

export async function getStudentAttendancePerSubject(uid: string) {
  const sessions = await getAllSessions();
  const subjectMap: Record<string, { present: number; late: number; absent: number; excused: number; total: number }> = {};

  for (const session of sessions) {
    const record = session.records[uid];
    if (!record) continue;
    if (!subjectMap[session.subjectCode]) {
      subjectMap[session.subjectCode] = { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
    }
    subjectMap[session.subjectCode][record.status]++;
    subjectMap[session.subjectCode].total++;
  }

  return subjectMap;
}

// ─── Subject Activities ───

function getActivityRef(id: string) {
  return doc(db, ACTIVITIES_COLLECTION, id);
}

export async function getSubjectActivities(subjectCode: string) {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where("subjectCode", "==", subjectCode),
    orderBy("dueDate", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as SubjectActivity);
}

export async function createSubjectActivity(
  values: SubjectActivityFormValues,
  subjectCode: string,
  creator: UserProfile
) {
  const activityRef = doc(collection(db, ACTIVITIES_COLLECTION));
  const activity: SubjectActivity = {
    id: activityRef.id,
    subjectCode,
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    dueDate: values.dueDate,
    dueTime: values.dueTime,
    completedBy: {},
    createdAt: serverTimestamp(),
    createdBy: creator.uid,
    updatedAt: serverTimestamp(),
    updatedBy: creator.uid
  };

  // Store links array (filter out empty entries)
  if (values.links && values.links.length > 0) {
    const validLinks = values.links.filter(l => l.url.trim());
    if (validLinks.length > 0) {
      activity.links = validLinks;
    }
  }

  await setDoc(activityRef, activity);
  return activity;
}

export async function updateSubjectActivity(
  activity: SubjectActivity,
  values: SubjectActivityFormValues,
  editorUid: string
) {
  const nextActivity: SubjectActivity = {
    ...activity,
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    dueDate: values.dueDate,
    dueTime: values.dueTime,
    updatedAt: serverTimestamp(),
    updatedBy: editorUid
  };

  // Update links array
  if (values.links && values.links.length > 0) {
    const validLinks = values.links.filter(l => l.url.trim());
    if (validLinks.length > 0) {
      nextActivity.links = validLinks;
    } else {
      delete nextActivity.links;
    }
  } else {
    delete nextActivity.links;
  }

  await setDoc(getActivityRef(activity.id), nextActivity);
  return nextActivity;
}

/** Check if an activity with the given classroomItemId already exists (dedup) */
export async function getActivityByClassroomItemId(classroomItemId: string): Promise<SubjectActivity | null> {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where("classroomItemId", "==", classroomItemId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as SubjectActivity;
}

export async function deleteSubjectActivity(id: string) {
  await deleteDoc(getActivityRef(id));
}

export async function toggleSubjectActivityCompletion(
  activity: SubjectActivity,
  profile: UserProfile
) {
  const completedBy: Record<string, SubjectActivityCompletion> = {
    ...(activity.completedBy || {})
  };

  if (completedBy[profile.uid]) {
    delete completedBy[profile.uid];
  } else {
    completedBy[profile.uid] = {
      uid: profile.uid,
      name: profile.name,
      email: profile.email,
      completedAt: serverTimestamp()
    };
  }

  await updateDoc(getActivityRef(activity.id), {
    completedBy,
    updatedAt: serverTimestamp(),
    updatedBy: profile.uid
  });
}

export function getActivityDeadlineLabel(dueDate: string) {
  const today = new Date();
  const due = new Date(`${dueDate}T23:59:59`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export async function getStudentSubjectActivityStats(uid: string) {
  const allSubjects = getAllSubjects();
  const result: Record<string, { total: number; completed: number; missing: number; overdue: number }> = {};

  for (const subject of allSubjects) {
    const activities = await getSubjectActivities(subject.code);
    const today = getTodayDateId();
    const completed = activities.filter(a => a.completedBy?.[uid]);
    const missing = activities.filter(a => a.dueDate < today && !a.completedBy?.[uid]);

    result[subject.code] = {
      total: activities.length,
      completed: completed.length,
      missing: missing.length,
      overdue: missing.length
    };
  }

  return result;
}