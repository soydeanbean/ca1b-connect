import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import {
  createActivity,
  deleteActivity,
  getActivities,
  getActivityStats,
  splitActivitiesForStudent,
  toggleActivityCompletion,
  updateActivity
} from "../../services/activityService";
import { canManageActivities } from "../../services/permissionService";
import { getUserProfile } from "../../services/profileService";
import type {
  ActivityFormValues,
  ActivityKind,
  ClassActivity
} from "../../types/Activity";
import type { UserProfile } from "../../types/Profile";

import "./Activities.css";

const EMPTY_FORM: ActivityFormValues = {
  title: "",
  type: "assignment",
  details: "",
  deadline: "",
  itemsText: ""
};

const ACTIVITY_TYPES: ActivityKind[] = ["assignment", "project", "activity"];

function formatDate(date: string) {
  if (!date) return "No deadline";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatType(type: ActivityKind) {
  return type[0].toUpperCase() + type.slice(1);
}

function getDeadlineLabel(deadline: string) {
  const today = new Date();
  const due = new Date(`${deadline}T23:59:59`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

async function fetchActivityPageState(uid: string, highlightedId: string | null) {
  const [loadedProfile, loadedActivities] = await Promise.all([
    getUserProfile(uid),
    getActivities()
  ]);

  const highlighted = loadedActivities.find((activity) => activity.id === highlightedId);

  return {
    loadedProfile,
    loadedActivities,
    selected: highlighted || loadedActivities[0] || null
  };
}

export default function Activities() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ClassActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ClassActivity | null>(null);
  const [form, setForm] = useState<ActivityFormValues>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canEdit = canManageActivities(profile);

  const stats = useMemo(
    () => getActivityStats(activities, profile?.uid || ""),
    [activities, profile]
  );

  const { active, history } = useMemo(
    () => splitActivitiesForStudent(activities, profile?.uid || ""),
    [activities, profile]
  );

  const highlightedId = searchParams.get("activity");

  const loadActivities = async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");

    try {
      const { loadedProfile, loadedActivities, selected } =
        await fetchActivityPageState(user.uid, highlightedId);

      setProfile(loadedProfile);
      setActivities(loadedActivities);
      setSelectedActivity(selected);
    } catch (error) {
      console.error("Activities load failed:", error);
      setMessage("Activities could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeActivities = async () => {
      if (!user) return;

      setLoading(true);
      setMessage("");

      try {
        const { loadedProfile, loadedActivities, selected } =
          await fetchActivityPageState(user.uid, highlightedId);

        setProfile(loadedProfile);
        setActivities(loadedActivities);
        setSelectedActivity(selected);
      } catch (error) {
        console.error("Activities load failed:", error);
        setMessage("Activities could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    initializeActivities();
  }, [user, highlightedId]);

  const handleSelect = (activity: ClassActivity) => {
    setSelectedActivity(activity);
    setEditing(false);
    setFile(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (activity: ClassActivity) => {
    setSelectedActivity(activity);
    setEditing(true);
    setFile(null);
    setForm({
      title: activity.title,
      type: activity.type,
      details: activity.details,
      deadline: activity.deadline,
      itemsText: activity.items.join("\n")
    });
  };

  const handleNew = () => {
    setEditing(true);
    setSelectedActivity(null);
    setFile(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!profile || !form.title.trim() || !form.deadline) {
      setMessage("Title and deadline are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (selectedActivity) {
        await updateActivity(selectedActivity, form, file, profile.uid);
      } else {
        await createActivity(form, file, profile);
      }

      setEditing(false);
      setFile(null);
      await loadActivities();
      setMessage("Activity saved.");
    } catch (error) {
      console.error("Activity save failed:", error);
      setMessage("Activity could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity: ClassActivity) => {
    const confirmed = window.confirm(`Remove "${activity.title}"?`);

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      await deleteActivity(activity.id);
      setSelectedActivity(null);
      await loadActivities();
      setMessage("Activity removed.");
    } catch (error) {
      console.error("Activity delete failed:", error);
      setMessage("Activity could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDone = async (activity: ClassActivity) => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      await toggleActivityCompletion(activity, profile);
      await loadActivities();
    } catch (error) {
      console.error("Activity completion failed:", error);
      setMessage("Completion status could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const renderActivityCard = (activity: ClassActivity) => {
    const completed = Boolean(profile && activity.completedBy?.[profile.uid]);
    const selected = selectedActivity?.id === activity.id;

    return (
      <article
        key={activity.id}
        className={`activity-card ${selected ? "selected" : ""} ${completed ? "done" : ""}`}
        onClick={() => handleSelect(activity)}
      >
        <div className="activity-card-top">
          <span className={`activity-type ${activity.type}`}>{formatType(activity.type)}</span>
          <span className="activity-deadline">{getDeadlineLabel(activity.deadline)}</span>
        </div>

        <h3>{activity.title}</h3>
        <p>{activity.details || "No extra details yet."}</p>

        <div className="activity-meta">
          <span>Due {formatDate(activity.deadline)}</span>
          <span>{Object.keys(activity.completedBy || {}).length} done</span>
        </div>
      </article>
    );
  };

  if (loading) {
    return <div className="activities-page">Loading activities...</div>;
  }

  return (
    <div className="activities-page">
      <section className="activities-hero">
        <div>
          <p className="activities-kicker">Assignments • Projects • Activities</p>
          <h1>Activities</h1>
          <p>Track deadlines, files, details, requirements, and your personal progress.</p>
        </div>

        {canEdit && (
          <button type="button" onClick={handleNew}>
            Add Activity
          </button>
        )}
      </section>

      {message && <div className="activities-message">{message}</div>}

      <section className="activity-stats">
        <div>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Finished</span>
          <strong>{stats.completed}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </div>
        <div>
          <span>Overdue</span>
          <strong>{stats.overdue}</strong>
        </div>
      </section>

      <div className="activities-layout">
        <section className="activities-list-panel">
          <div className="activities-section-title">
            <h2>Upcoming</h2>
            <span>Listed by deadline date</span>
          </div>

          <div className="activities-list">
            {active.length ? active.map(renderActivityCard) : (
              <div className="activities-empty">No upcoming activities.</div>
            )}
          </div>

          <div className="activities-section-title history-title">
            <h2>History</h2>
            <span>Finished or overdue work</span>
          </div>

          <div className="activities-list history-list">
            {history.length ? history.map(renderActivityCard) : (
              <div className="activities-empty">No activity history yet.</div>
            )}
          </div>
        </section>

        <aside className="activity-detail-panel">
          {editing ? (
            <div className="activity-form">
              <h2>{selectedActivity ? "Edit Activity" : "Add Activity"}</h2>

              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Performance task, seatwork, project..."
                />
              </label>

              <label>
                Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as ActivityKind
                    }))
                  }
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatType(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Deadline
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, deadline: event.target.value }))
                  }
                />
              </label>

              <label>
                Items / requirements
                <textarea
                  rows={4}
                  value={form.itemsText}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, itemsText: event.target.value }))
                  }
                  placeholder="One item per line"
                />
              </label>

              <label>
                Details
                <textarea
                  rows={5}
                  value={form.details}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, details: event.target.value }))
                  }
                  placeholder="Instructions, grading notes, submission reminders..."
                />
              </label>

              <label>
                File attachment
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                {selectedActivity?.file && (
                  <span className="current-file">Current: {selectedActivity.file.name}</span>
                )}
              </label>

              <div className="activity-form-actions">
                <button type="button" className="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : selectedActivity ? (
            <div className="activity-detail">
              <div className="activity-card-top">
                <span className={`activity-type ${selectedActivity.type}`}>
                  {formatType(selectedActivity.type)}
                </span>
                <span className="activity-deadline">
                  {getDeadlineLabel(selectedActivity.deadline)}
                </span>
              </div>

              <h2>{selectedActivity.title}</h2>
              <p>{selectedActivity.details || "No details yet."}</p>

              <div className="activity-detail-grid">
                <div>
                  <span>Deadline</span>
                  <strong>{formatDate(selectedActivity.deadline)}</strong>
                </div>
                <div>
                  <span>Completed</span>
                  <strong>{Object.keys(selectedActivity.completedBy || {}).length}</strong>
                </div>
              </div>

              <div className="activity-items">
                <h3>Items</h3>
                {selectedActivity.items.length ? (
                  <ul>
                    {selectedActivity.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No item list added.</p>
                )}
              </div>

              {selectedActivity.file && (
                <a
                  className="activity-file"
                  href={selectedActivity.file.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open attached file: {selectedActivity.file.name}
                </a>
              )}

              <div className="activity-detail-actions">
                <button
                  type="button"
                  onClick={() => handleToggleDone(selectedActivity)}
                  disabled={saving}
                >
                  {profile && selectedActivity.completedBy?.[profile.uid]
                    ? "Mark as not done"
                    : "Check as done"}
                </button>

                {canEdit && (
                  <>
                    <button type="button" className="secondary" onClick={() => handleEdit(selectedActivity)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(selectedActivity)}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="activities-empty detail-empty">Select an activity.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
