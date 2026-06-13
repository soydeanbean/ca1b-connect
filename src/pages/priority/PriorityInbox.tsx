// src/pages/priority/PriorityInbox.tsx

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  getPriorityInbox,
  getPriorityCounts,
  type PriorityItem
} from "../../services/priorityService";
import "./PriorityInbox.css";

type GroupKey = "dueToday" | "overdue" | "upcoming";

const GROUP_LABELS: Record<GroupKey, string> = {
  dueToday: "Due Today",
  overdue: "Overdue",
  upcoming: "Upcoming"
};

const GROUP_ICONS: Record<GroupKey, string> = {
  dueToday: "⏰",
  overdue: "🔥",
  upcoming: "📅"
};

function formatDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function getSourceIcon(source: "activity" | "todo") {
  return source === "activity" ? "📝" : "✅";
}

export default function PriorityInbox() {
  const { user } = useAuth();

  const [groups, setGroups] = useState<{
    dueToday: PriorityItem[];
    overdue: PriorityItem[];
    upcoming: PriorityItem[];
  }>({ dueToday: [], overdue: [], upcoming: [] });

  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<GroupKey, boolean>>({
    dueToday: false,
    overdue: false,
    upcoming: false
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getPriorityInbox(user.uid);
      setGroups(result);
    } catch (err) {
      console.error("Failed to load priority inbox:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = getPriorityCounts(groups);
  const totalItems = groups.dueToday.length + groups.overdue.length + groups.upcoming.length;

  const toggleCollapse = (key: GroupKey) => {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  };

  if (loading) {
    return <div className="priority-page">Loading priority inbox...</div>;
  }

  const renderGroup = (key: GroupKey) => {
    const items = groups[key];
    if (items.length === 0) return null;

    return (
      <section key={key} className="priority-group">
        <button
          type="button"
          className="priority-group-header"
          onClick={() => toggleCollapse(key)}
        >
          <span className="priority-group-icon">{GROUP_ICONS[key]}</span>
          <span className="priority-group-label">{GROUP_LABELS[key]}</span>
          <span className="priority-group-count">{items.length}</span>
          <span className={`priority-chevron ${collapsed[key] ? "collapsed" : ""}`}>
            ▼
          </span>
        </button>

        {!collapsed[key] && (
          <div className="priority-items">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                className={`priority-item ${item.source} ${item.status}`}
              >
                <div className="priority-item-icon">
                  {getSourceIcon(item.source)}
                </div>

                <div className="priority-item-content">
                  <div className="priority-item-title">{item.title}</div>
                  {item.description && (
                    <div className="priority-item-desc">{item.description}</div>
                  )}
                  <div className="priority-item-meta">
                    <span>{formatDate(item.date)}</span>
                    <span className="priority-source-badge">
                      {item.source === "activity" ? "Activity" : "To-Do"}
                    </span>
                  </div>
                </div>

                <div className={`priority-status-dot ${item.status}`} />
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="priority-page">
      <section className="priority-hero">
        <div>
          <span className="priority-eyebrow">Priority Inbox</span>
          <h1>Priority Inbox</h1>
          <p>Your most urgent tasks from activities and to-dos, organised by deadline.</p>
        </div>
      </section>

      <section className="priority-stats">
        <div className="stat-due">
          <span>Due Today</span>
          <strong>{counts.dueToday}</strong>
        </div>
        <div className="stat-over">
          <span>Overdue</span>
          <strong>{counts.overdue}</strong>
        </div>
        <div className="stat-up">
          <span>Upcoming</span>
          <strong>{counts.upcoming}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{counts.total}</strong>
        </div>
      </section>

      {totalItems === 0 ? (
        <div className="priority-empty">
          <p>Nothing urgent right now.</p>
          <p>All tasks are either completed or well ahead of their deadlines.</p>
        </div>
      ) : (
        <>
          {renderGroup("dueToday")}
          {renderGroup("overdue")}
          {renderGroup("upcoming")}
        </>
      )}
    </div>
  );
}