// src/context/NotificationContext.tsx

import { createContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { getUserProfile } from "../services/profileService";
import { getPersonalTasks } from "../services/personalTaskService";
import type { AppNotification } from "../types/Notification";
import type { Announcement } from "../types/Announcement";
import type { ClassActivity } from "../types/Activity";
import type { PersonalTask } from "../types/PersonalTask";
import type { SubjectActivity } from "../types/Subject";
import { SUBJECTS } from "../data/ScheduleData";

const ACTIVITY_COLLECTION = "classCA1B_Activities";
const SUBJECT_ACTIVITIES_COLLECTION = "subject_activities";
const READ_STATE_KEY = "ca1b_read_notifications";
const STORAGE_VERSION_KEY = "ca1b_notif_version";

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  majorNotifications: AppNotification[];
  minorNotifications: AppNotification[];
  /** Returns number of unread notifications related to a specific subject code */
  getSubjectUnreadCount: (subjectCode: string) => number;
}

export const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markAsRead: () => {},
  majorNotifications: [],
  minorNotifications: [],
  getSubjectUnreadCount: () => 0
});

function announcementToNotification(a: Announcement): AppNotification {
  return {
    id: `announcement-${a.id}`,
    type: "announcement",
    category: a.category || "major",
    title: a.title,
    message: a.content.length > 100 ? a.content.slice(0, 100) + "..." : a.content,
    link: `/announcements?id=${a.id}`,
    isRead: false,
    createdAt: a.createdAt
  };
}

function activityToNotification(a: ClassActivity): AppNotification {
  return {
    id: `activity-${a.id}`,
    type: "announcement",
    category: "major",
    title: `New Activity: ${a.title}`,
    message: `Deadline: ${a.deadline}`,
    link: `/subjects`,
    isRead: false,
    createdAt: a.createdAt
  };
}

function taskToNotification(t: PersonalTask): AppNotification | null {
  if (!t.completed && t.date) {
    const today = new Date();
    const dueDate = new Date(t.date + "T23:59:59");

    const isOverdue = dueDate < today;
    const isToday = dueDate.toDateString() === today.toDateString();

    if (isOverdue || isToday) {
      return {
        id: `task-${t.id}`,
        type: "task_reminder",
        category: "minor",
        title: isOverdue ? "Overdue Task" : "Task Due Today",
        message: `"${t.title}" is ${isOverdue ? "overdue" : "due today"}`,
        link: "/subjects",
        isRead: false,
        createdAt: Timestamp.fromDate(today)
      };
    }
  }
  return null;
}

function subjectActivityToNotification(sa: SubjectActivity, subjectLabel: string, subjectCode: string): AppNotification {
  return {
    id: `subject_activity-${sa.id}`,
    type: "subject_activity",
    category: "major",
    title: `${subjectLabel}${sa.title}`,
    message: sa.description
      ? sa.description.length > 100 ? sa.description.slice(0, 100) + "..." : sa.description
      : `Due: ${sa.dueDate}`,
    link: `/subjects?code=${subjectCode}`,
    isRead: false,
    createdAt: sa.createdAt
  };
}

// ─── Persistence helpers with versioning to avoid stale data ───
function loadReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(READ_STATE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {}
  return new Set();
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_STATE_KEY, JSON.stringify([...ids]));
    localStorage.setItem(STORAGE_VERSION_KEY, Date.now().toString());
  } catch {}
}

// ─── Check if a notification is related to a specific subject ───
function getNotificationSubjectCode(n: AppNotification): string | null {
  // subject_activity notifications have the subject code in the link
  if (n.type === "subject_activity") {
    const match = n.link.match(/code=([A-Z0-9]+)/);
    if (match) return match[1];
  }
  // Check if title contains a subject code pattern
  const codeMatch = n.title.match(/\[([A-Z0-9]+)\]/);
  if (codeMatch) return codeMatch[1];

  return null;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const [version, setVersion] = useState(0);

  // Persist read state whenever it changes
  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  // Listen for announcements
  useEffect(() => {
    if (!user) return;

    const announcementsQuery = query(
      collection(db, "classCA1B_Announcements"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(announcementsQuery, (snap) => {
      const announcementNotifs: AppNotification[] = [];
      snap.docs.forEach((doc) => {
        const a = doc.data() as Announcement;
        announcementNotifs.push(announcementToNotification(a));
      });
      setNotifications((prev) => {
        const filtered = prev.filter((n) => !n.type.startsWith("announcement"));
        return [...announcementNotifs, ...filtered];
      });
      // Bump version to trigger re-render on all consumers
      setVersion(v => v + 1);
    });

    return unsub;
  }, [user]);

  // Listen for global activities
  useEffect(() => {
    if (!user) return;

    const activitiesQuery = query(
      collection(db, ACTIVITY_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(activitiesQuery, (snap) => {
      const activityNotifs: AppNotification[] = [];
      snap.docs.forEach((doc) => {
        const a = doc.data() as ClassActivity;
        activityNotifs.push(activityToNotification(a));
      });
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.type !== "announcement" || !n.link.startsWith("/activities"));
        return [...activityNotifs, ...filtered];
      });
    });

    return unsub;
  }, [user]);

  // Listen for subject-specific activities (from subject_activities collection)
  useEffect(() => {
    if (!user) return;

    const subjectActivitiesQuery = query(
      collection(db, SUBJECT_ACTIVITIES_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(subjectActivitiesQuery, (snap) => {
      const subjectActivityNotifs: AppNotification[] = [];
      snap.docs.forEach((doc) => {
        const sa = doc.data() as SubjectActivity;
        const subjectInfo = SUBJECTS.find(s => s.code === sa.subjectCode);
        const subjectLabel = subjectInfo ? `[${subjectInfo.code}] ` : "";
        subjectActivityNotifs.push(subjectActivityToNotification(sa, subjectLabel, sa.subjectCode));
      });
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.type !== "subject_activity");
        return [...subjectActivityNotifs, ...filtered];
      });
    });

    return unsub;
  }, [user]);

  // Check personal tasks for reminders
  useEffect(() => {
    if (!user) return;

    const checkTasks = async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile || !profile.email.endsWith("@gbox.adnu.edu.ph")) return;

        const tasks = await getPersonalTasks(user.uid);
        const taskNotifs: AppNotification[] = [];
        tasks.forEach((t) => {
          const n = taskToNotification(t);
          if (n) taskNotifs.push(n);
        });

        setNotifications((prev) => {
          const filtered = prev.filter((n) => n.type !== "task_reminder");
          return [...filtered, ...taskNotifs];
        });
      } catch (error) {
        console.error("Failed to check personal tasks:", error);
      }
    };

    checkTasks();
    const interval = setInterval(checkTasks, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    saveReadIds(allIds);
    setVersion(v => v + 1);
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const notificationsWithReadStatus = useMemo(() => 
    notifications.map((n) => ({
      ...n,
      isRead: readIds.has(n.id)
    })),
    [notifications, readIds, version]
  );

  // Calculate unread count based on persisted read state
  const unreadCount = useMemo(
    () => notificationsWithReadStatus.filter((n) => !n.isRead).length,
    [notificationsWithReadStatus]
  );

  const majorNotifications = useMemo(
    () => notificationsWithReadStatus.filter((n) => n.category === "major"),
    [notificationsWithReadStatus]
  );

  const minorNotifications = useMemo(
    () => notificationsWithReadStatus.filter((n) => n.category === "minor"),
    [notificationsWithReadStatus]
  );

  const getSubjectUnreadCount = useCallback(
    (subjectCode: string): number => {
      return notificationsWithReadStatus.filter((n) => {
        if (n.isRead) return false;
        const notifSubjectCode = getNotificationSubjectCode(n);
        return notifSubjectCode === subjectCode;
      }).length;
    },
    [notificationsWithReadStatus]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications: notificationsWithReadStatus,
        unreadCount,
        markAllRead,
        markAsRead,
        majorNotifications,
        minorNotifications,
        getSubjectUnreadCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}