// src/components/notifications/NotificationList.tsx

import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

type Props = {
  onClose: () => void;
};

export default function NotificationList({ onClose }: Props) {
  const { notifications, loading, markAsRead, markAllRead, deleteNotif, clearAll } =
    useNotifications();
  const navigate = useNavigate();

  const handleClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.read) {
      await markAsRead(notif.notificationId);
    }

    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "event":
        return "📅";
      case "assignment":
        return "📝";
      case "announcement":
        return "📢";
      case "activity":
        return "🏃";
      case "todo_reminder":
        return "✅";
      case "deadline":
        return "⏰";
      case "attendance":
        return "📍";
      default:
        return "🔔";
    }
  };

  return (
    <div className="notification-list-container">
      <div className="notification-list-header">
        <h4>Notifications</h4>
        <div className="notification-header-actions">
          {notifications.some((n) => !n.read) && (
            <button className="notif-action-btn" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="notif-action-btn" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="notification-list-scroll">
        {loading ? (
          <div className="notification-list-empty">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-list-empty">No notifications yet</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${notif.read ? "read" : "unread"}`}
              onClick={() => handleClick(notif)}
            >
              <span className="notification-item-icon">
                {getCategoryIcon(notif.category)}
              </span>

              <div className="notification-item-content">
                <div className="notification-item-title">{notif.title}</div>
                <div className="notification-item-message">{notif.message}</div>
              </div>

              <button
                className="notification-item-dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotif(notif.notificationId);
                }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}