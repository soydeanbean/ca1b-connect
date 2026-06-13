// src/context/NotificationContext.tsx

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserNotification } from "../types/Notification";
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from "../services/notificationService";

type NotificationContextType = {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotif: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
  uid
}: {
  children: React.ReactNode;
  uid: string | null;
}) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubNotifications = subscribeToNotifications(uid, (list) => {
      setNotifications(list);
      setLoading(false);
    });

    const unsubUnread = subscribeToUnreadCount(uid, (count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubNotifications();
      unsubUnread();
    };
  }, [uid]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!uid) return;
      await markNotificationAsRead(uid, notificationId);
    },
    [uid]
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    await markAllNotificationsAsRead(uid);
  }, [uid]);

  const deleteNotif = useCallback(
    async (notificationId: string) => {
      if (!uid) return;
      await deleteNotification(uid, notificationId);
    },
    [uid]
  );

  const clearAll = useCallback(async () => {
    if (!uid) return;
    await clearAllNotifications(uid);
  }, [uid]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllRead,
        deleteNotif,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}