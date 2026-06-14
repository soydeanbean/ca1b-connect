import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  createPersonalTask,
  deletePersonalTask,
  getPersonalTasks,
  togglePersonalTaskCompletion,
  updatePersonalTask as updatePersonalTaskService
} from "../../services/personalTaskService";
import { canManageActivities, isGboxUser } from "../../services/permissionService";
import { getUserProfile } from "../../services/profileService";
import type {
  ActivityFormValues,
  ActivityKind,
  ClassActivity
} from "../../types/Activity";
import type { PersonalTask, PersonalTaskFormValues } from "../../types/PersonalTask";
import type { UserProfile } from "../../types/Profile";

import "./Activities.css";

const EMPTY_FORM: ActivityFormValues = {
  title: "",
  type: "assignment",
  details: "",
  deadline: "",
  itemsText: ""
};

const EMPTY_PERSONAL_FORM: PersonalTaskFormValues = {
  title: "",
  description: "",
  date: "",
  time: "",
  deadline: ""
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

  const [activeTab, setActiveTab] = useState<"global" | "personal">("global");

  // Global activity state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ClassActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ClassActivity | null>(null);
  const [form, setForm] = useState<ActivityFormValues>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Personal task state
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [personalForm, setPersonalForm] = useState<PersonalTaskFormValues>(EMPTY_PERSONAL_FORM);
  const [editingTask, setEditingTask] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const canEdit = canManageActivities(profile);
  const canCreatePersonal = isGboxUser(profile);

  const stats = useMemo(
    () => getActivityStats(activities, profile?.uid || ""),
    [activities, profile]
  );

  const { active, history } = useMemo(
    () => splitActivitiesForStudent(activities, profile?.uid || ""),
    [activities, profile]
  );

  const highlightedId = searchParams.get("activity");

  const loadActivities = useCallback(async () => {
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
  }, [user, highlightedId]);

  const loadPersonalTasks = useCallback(async () => {
    if (!user || !profile) return;
    try {
      const tasks = await getPersonalTasks(user.uid);
      setPersonalTasks(tasks);
    } catch (error) {
      console.error("Personal tasks load failed:", error);
    }
  }, [user, profile]);

  useEffect(() => {
    const initializeActivities = async () => {
      if (!user) return;
      setLoading(true);
      setMessage("");

      try {
        const state = await fetchActivityPageState(user.uid, highlightedId);
        setProfile(state.loadedProfile);
        setActivities(state.loadedActivities);
        setSelectedActivity(state.selected);
      } catch (error) {
        console.error("Activities load failed:", error);
        setMessage("Activities could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    initializeActivities();
  }, [user, highlightedId]);

  useEffect(() => {
    if (activeTab === "personal" && user && profile) {
      loadPersonalTasks();
    }
  }, [activeTab, user, profile, loadPersonalTasks]);

  // ── Global Activity Handlers ──

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

  // ── Personal Task Handlers ──

  const handleNewTask = () => {
    setEditingTask(true);
    setSelectedTask(null);
    setPersonalForm(EMPTY_PERSONAL_FORM);
  };

  const handleEditTask = (task: PersonalTask) => {
    setSelectedTask(task);
    setEditingTask(true);
    setPersonalForm({
      title: task.title,
      description: task.description,
      date: task.date,
      time: task.time,
      deadline: task.deadline || ""
    });
  };

  const handleSaveTask = async () => {
    if (!profile || !personalForm.title.trim() || !personalForm.date) {
      setMessage("Title and date are required.");
      return;
    }

    setSavingTask(true);
    setMessage("");

    try {
      if (selectedTask) {
        await updatePersonalTaskService(selectedTask, personalForm, profile.uid);
      } else {
        await createPersonalTask(personalForm, profile);
      }

      setEditingTask(false);
      setPersonalForm(EMPTY_PERSONAL_FORM);
      await loadPersonalTasks();
      setMessage("Task saved.");
    } catch (error) {
      console.error("Task save failed:", error);
      setMessage("Task could not be saved.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (task: PersonalTask) => {
    if (!profile) return;
    const confirmed = window.confirm(`Remove "${task.title}"?`);
    if (!confirmed) return;

    setSavingTask(true);
    setMessage("");

    try {
      await deletePersonalTask(task.id);
      setSelectedTask(null);
      await loadPersonalTasks();
      setMessage("Task removed.");
    } catch (error) {
      console.error("Task delete failed:", error);
      setMessage("Task could not be removed.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTaskDone = async (task: PersonalTask) => {
    if (!profile) return;
    setSavingTask(true);

    try {
      await togglePersonalTaskCompletion(task, profile.uid);
      await loadPersonalTasks();
    } catch (error) {
      console.error("Task toggle failed:", error);
    } finally {
      setSavingTask(false);
    }
  };

  // ── Renderers ──

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

  const renderTaskCard = (task: PersonalTask) => {
    const today = new Date();
    const dueDate = new Date(task.date + "T23:59:59");
    const isOverdue = !task.completed && dueDate < today;

    return (
      <article
        key={task.id}
        className={`activity-card ${selectedTask?.id === task.id ? "selected" : ""} ${task.completed ? "done" : ""} ${isOverdue ? "overdue" : ""}`}
        onClick={() => {
          setSelectedTask(task);
          setEditingTask(false);
          setPersonalForm(EMPTY_PERSONAL_FORM);
        }}
      >
        <div className="activity-card-top">
          <span className="activity-type activity">Personal</span>
          {task.completed ? (
            <span className="activity-deadline" style={{ color: "green" }}>Done</span>
          ) : isOverdue ? (
            <span className="activity-deadline" style={{ color: "red" }}>Overdue</span>
          ) : (
            <span className="activity-deadline">Due {formatDate(task.date)}</span>
          )}
        </div>

        <h3>{task.title}</h3>
        <p>{task.description || "No description."}</p>

        <div className="activity-meta">
          <span>{task.time ? `🕐 ${task.time}` : "No time set"}</span>
          {task.deadline && <span>Deadline: {task.deadline}</span>}
        </div>
      </article>
    );
  };

  if (loading) {
    return <div className="activities-page">Loading activities...</div>;
  }

  return (
    <div className="activities-page">
      {/* TABS */}
      <div className="activities-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={activeTab === "global" ? "active" : ""}
          onClick={() => setActiveTab("global")}
          style={{
            padding: "0.6rem 1.5rem",
            border: "1px solid var(--border)",
            borderRadius: "50px",
            background: activeTab === "global" ? "var(--primary, #ff8c00)" : "transparent",
            color: activeTab === "global" ? "white" : "var(--text)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.9rem",
            transition: "all 0.2s ease"
          }}
        >
          Global Activities
        </button>
        <button
          className={activeTab === "personal" ? "active" : ""}
          onClick={() => setActiveTab("personal")}
          style={{
            padding: "0.6rem 1.5rem",
            border: "1px solid var(--border)",
            borderRadius: "50px",
            background: activeTab === "personal" ? "var(--primary, #ff8c00)" : "transparent",
            color: activeTab === "personal" ? "white" : "var(--text)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.9rem",
            transition: "all 0.2s ease"
          }}
        >
          Personal Tasks
        </button>
      </div>

      {/* GLOBAL ACTIVITIES TAB */}
      {activeTab === "global" && (
        <>
          <section className="activities-hero">
            <div>
              <p className="activities-kicker">Assignments • Projects • Activities</p>
              <h1>Global Activities</h1>
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
            <div><span>Total</span><strong>{stats.total}</strong></div>
            <div><span>Finished</span><strong>{stats.completed}</strong></div>
            <div><span>Pending</span><strong>{stats.pending}</strong></div>
            <div><span>Overdue</span><strong>{stats.overdue}</strong></div>
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
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Performance task, seatwork, project..."
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ActivityKind }))}
                    >
                      {ACTIVITY_TYPES.map((type) => (
                        <option key={type} value={type}>{formatType(type)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Deadline
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    />
                  </label>
                  <label>
                    Items / requirements
                    <textarea
                      rows={4}
                      value={form.itemsText}
                      onChange={(e) => setForm((f) => ({ ...f, itemsText: e.target.value }))}
                      placeholder="One item per line"
                    />
                  </label>
                  <label>
                    Details
                    <textarea
                      rows={5}
                      value={form.details}
                      onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                      placeholder="Instructions, grading notes, submission reminders..."
                    />
                  </label>
                  <label>
                    File attachment
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    {selectedActivity?.file && (
                      <span className="current-file">Current: {selectedActivity.file.name}</span>
                    )}
                  </label>
                  <div className="activity-form-actions">
                    <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : selectedActivity ? (
                <div className="activity-detail">
                  <div className="activity-card-top">
                    <span className={`activity-type ${selectedActivity.type}`}>{formatType(selectedActivity.type)}</span>
                    <span className="activity-deadline">{getDeadlineLabel(selectedActivity.deadline)}</span>
                  </div>
                  <h2>{selectedActivity.title}</h2>
                  <p>{selectedActivity.details || "No details yet."}</p>
                  <div className="activity-detail-grid">
                    <div><span>Deadline</span><strong>{formatDate(selectedActivity.deadline)}</strong></div>
                    <div><span>Completed</span><strong>{Object.keys(selectedActivity.completedBy || {}).length}</strong></div>
                  </div>
                  <div className="activity-items">
                    <h3>Items</h3>
                    {selectedActivity.items.length ? (
                      <ul>{selectedActivity.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    ) : <p>No item list added.</p>}
                  </div>
                  {selectedActivity.file && (
                    <a className="activity-file" href={selectedActivity.file.url} target="_blank" rel="noreferrer">
                      Open attached file: {selectedActivity.file.name}
                    </a>
                  )}
                  <div className="activity-detail-actions">
                    <button type="button" onClick={() => handleToggleDone(selectedActivity)} disabled={saving}>
                      {profile && selectedActivity.completedBy?.[profile.uid] ? "Mark as not done" : "Check as done"}
                    </button>
                    {canEdit && (
                      <>
                        <button type="button" className="secondary" onClick={() => handleEdit(selectedActivity)}>Edit</button>
                        <button type="button" className="danger" onClick={() => handleDelete(selectedActivity)}>Remove</button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="activities-empty detail-empty">Select an activity.</div>
              )}
            </aside>
          </div>
        </>
      )}

      {/* PERSONAL TASKS TAB */}
      {activeTab === "personal" && (
        <>
          <section className="activities-hero">
            <div>
              <p className="activities-kicker">Your Personal Tasks</p>
              <h1>Personal Tasks</h1>
              <p>Create and manage your own tasks, reminders, and to-dos.</p>
            </div>

            {canCreatePersonal && (
              <button type="button" onClick={handleNewTask}>
                + New Task
              </button>
            )}
          </section>

          {!canCreatePersonal && (
            <div className="activities-message" style={{ background: "rgba(100,100,255,0.1)", color: "#6666ff" }}>
              Personal tasks are only available for GBOX account holders.
            </div>
          )}

          {message && <div className="activities-message">{message}</div>}

          {canCreatePersonal && (
            <div className="activities-layout">
              <section className="activities-list-panel">
                <div className="activities-section-title">
                  <h2>Your Tasks</h2>
                  <span>{personalTasks.length} total</span>
                </div>

                <div className="activities-list">
                  {personalTasks.length > 0 ? (
                    personalTasks.map(renderTaskCard)
                  ) : (
                    <div className="activities-empty">No personal tasks yet. Create one!</div>
                  )}
                </div>
              </section>

              <aside className="activity-detail-panel">
                {editingTask ? (
                  <div className="activity-form">
                    <h2>{selectedTask ? "Edit Task" : "New Task"}</h2>

                    <label>
                      Title
                      <input
                        value={personalForm.title}
                        onChange={(e) => setPersonalForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Task title..."
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        rows={3}
                        value={personalForm.description}
                        onChange={(e) => setPersonalForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Task description..."
                      />
                    </label>

                    <label>
                      Date
                      <input
                        type="date"
                        value={personalForm.date}
                        onChange={(e) => setPersonalForm((f) => ({ ...f, date: e.target.value }))}
                      />
                    </label>

                    <label>
                      Time (optional)
                      <input
                        type="time"
                        value={personalForm.time}
                        onChange={(e) => setPersonalForm((f) => ({ ...f, time: e.target.value }))}
                      />
                    </label>

                    <label>
                      Deadline (optional)
                      <input
                        type="datetime-local"
                        value={personalForm.deadline}
                        onChange={(e) => setPersonalForm((f) => ({ ...f, deadline: e.target.value }))}
                      />
                    </label>

                    <div className="activity-form-actions">
                      <button type="button" className="secondary" onClick={() => setEditingTask(false)}>Cancel</button>
                      <button type="button" onClick={handleSaveTask} disabled={savingTask}>
                        {savingTask ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : selectedTask ? (
                  <div className="activity-detail">
                    <div className="activity-card-top">
                      <span className="activity-type activity">Personal</span>
                      {selectedTask.completed ? (
                        <span className="activity-deadline" style={{ color: "green" }}>Completed</span>
                      ) : (
                        <span className="activity-deadline">Due {formatDate(selectedTask.date)}</span>
                      )}
                    </div>

                    <h2>{selectedTask.title}</h2>
                    <p>{selectedTask.description || "No description."}</p>

                    <div className="activity-detail-grid">
                      <div><span>Date</span><strong>{formatDate(selectedTask.date)}</strong></div>
                      {selectedTask.time && <div><span>Time</span><strong>{selectedTask.time}</strong></div>}
                      {selectedTask.deadline && <div><span>Deadline</span><strong>{selectedTask.deadline}</strong></div>}
                    </div>

                    <div className="activity-detail-actions">
                      <button type="button" onClick={() => handleToggleTaskDone(selectedTask)} disabled={savingTask}>
                        {selectedTask.completed ? "Mark as not done" : "Mark as done"}
                      </button>
                      <button type="button" className="secondary" onClick={() => handleEditTask(selectedTask)}>Edit</button>
                      <button type="button" className="danger" onClick={() => handleDeleteTask(selectedTask)}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="activities-empty detail-empty">
                    {personalTasks.length > 0 ? "Select a task to view details." : "Create your first task!"}
                  </div>
                )}
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}