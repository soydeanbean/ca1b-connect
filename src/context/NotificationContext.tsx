// src/context/NotificationContext.tsx

import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { getUserProfile } from "../services/profileService";
import { getPersonalTasks } from "../services/personalTaskService";
import type { AppNotification } from "../types/Notification";
import type { Announcement } from "../types/Announcement";
import type { ClassActivity } from "../types/Activity";
import type { PersonalTask } from "../types/PersonalTask";

const ACTIVITY_COLLECTION = "classCA1B_Activities";

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  majorNotifications: AppNotification[];
  minorNotifications: AppNotification[];
}

export const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  majorNotifications: [],
  minorNotifications: []
});

function announcementToNotification(a: Announcement): AppNotification {
  return {
    id: `announcement-${a.id}`,
    type: "announcement",
    category: "major",
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
    link: `/activities?activity=${a.id}`,
    isRead: false,
    createdAt: a.createdAt
  };
}

function taskToNotification(t: PersonalTask): AppNotification | null {
  if (!t.completed && t.date) {
    const today = new Date();
    const dueDate = new Date(t.date + "T23:59:59");

    // Only show notifications for overdue or same-day tasks
    const isOverdue = dueDate < today;
    const isToday = dueDate.toDateString() === today.toDateString();

    if (isOverdue || isToday) {
      return {
        id: `task-${t.id}`,
        type: "task_reminder",
        category: "minor",
        title: isOverdue ? "Overdue Task" : "Task Due Today",
        message: `"${t.title}" is ${isOverdue ? "overdue" : "due today"}`,
        link: "/activities",
        isRead: false,
        createdAt: Timestamp.fromDate(today)
      };
    }
  }
  return null;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

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
    const interval = setInterval(checkTasks, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  }, [notifications]);

  const notificationsWithReadStatus = notifications.map((n) => ({
    ...n,
    isRead: readIds.has(n.id)
  }));

  const unreadCount = notificationsWithReadStatus.filter((n) => !n.isRead).length;

  const majorNotifications = notificationsWithReadStatus.filter((n) => n.category === "major");
  const minorNotifications = notificationsWithReadStatus.filter((n) => n.category === "minor");

  return (
    <NotificationContext.Provider
      value={{
        notifications: notificationsWithReadStatus,
        unreadCount,
        markAllRead,
        majorNotifications,
        minorNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}