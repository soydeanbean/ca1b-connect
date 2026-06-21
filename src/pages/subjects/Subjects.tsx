// src/pages/subjects/Subjects.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { getUserProfile } from "../../services/profileService";
import { canManageActivities, canCreateAnnouncements } from "../../services/permissionService";
import {
  getSubjectAnnouncements,
  createSubjectAnnouncement,
  updateSubjectAnnouncement,
  deleteSubjectAnnouncement,
  togglePinSubjectAnnouncement
} from "../../services/subjectAnnouncementService";
import type { SubjectAnnouncement, SubjectAnnouncementFormValues } from "../../types/SubjectAnnouncement";
import {
  getAllSubjects,
  getSubjectInfo,
  createSession,
  getSubjectSessions,
  updateSessionRecord,
  getSubjectActivities,
  createSubjectActivity,
  updateSubjectActivity,
  deleteSubjectActivity,
  toggleSubjectActivityCompletion,
  getActivityDeadlineLabel,
  getTodayDateId,
  getStudentAttendancePerSubject,
  deleteSession
} from "../../services/subjectService";
import {
  getTodaySchedule,
  getSubjectSchedule,
  isSubjectScheduledToday
} from "../../data/ScheduleData";
import type {
  AttendanceSession,
  SessionAttendanceStatus,
  SubjectActivity,
  SubjectActivityFormValues
} from "../../types/Subject";
import type { UserProfile } from "../../types/Profile";
import { QRCodeSVG } from "qrcode.react";
import { exportSubjectAttendanceExcel } from "../../services/excelExportService";
import "./Subjects.css";

type SubjectView = "grid" | "detail";
type DetailTab = "activities" | "attendance" | "qrcode" | "schedule" | "announcements";

const SESSION_STATUS_LABELS: Record<SessionAttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused"
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  assignment: "Assignment",
  project: "Project",
  activity: "Activity",
  quiz: "Quiz"
};

const EMPTY_ACTIVITY_FORM: SubjectActivityFormValues = {
  title: "",
  description: "",
  type: "assignment",
  dueDate: "",
  dueTime: "",
  link: ""
};

function formatDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export default function Subjects() {
  const { user } = useAuth();
  const { getSubjectUnreadCount } = useNotifications();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<SubjectView>("grid");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("activities");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Attendance state
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [todaySession, setTodaySession] = useState<AttendanceSession | null>(null);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>("");

  // Activities state
  const [activities, setActivities] = useState<SubjectActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<SubjectActivity | null>(null);
  const [activityForm, setActivityForm] = useState<SubjectActivityFormValues>(EMPTY_ACTIVITY_FORM);
  const [editingActivity, setEditingActivity] = useState(false);

  // QR state
  const [qrBaseUrl, setQrBaseUrl] = useState("");

  // Subject Announcements state
  const [subjectAnnouncements, setSubjectAnnouncements] = useState<SubjectAnnouncement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState<SubjectAnnouncementFormValues>({
    title: "",
    content: "",
    pinned: false,
    dueDate: ""
  });
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);

  // Student stats
  const [studentPerf, setStudentPerf] = useState<Record<string, any>>({});

  const canEdit = canManageActivities(profile);
  const canCreateAnnc = canCreateAnnouncements(profile);
  const todayDate = getTodayDateId();

  // ─── Announcement Handlers ───

  function formatTimestamp(ts: unknown) {
    if (!ts) return "";
    const date = ts instanceof Date ? ts : (ts as { toDate?: () => Date })?.toDate?.() || new Date(String(ts));
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  const handleSaveAnnouncement = async () => {
    if (!profile || !selectedSubject || !announcementForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (editingAnnouncement) {
        await updateSubjectAnnouncement(editingAnnouncement, announcementForm, profile.uid);
      } else {
        await createSubjectAnnouncement(announcementForm, selectedSubject, profile);
      }
      setShowAnnouncementForm(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: "", content: "", pinned: false, dueDate: "" });
      const anncs = await getSubjectAnnouncements(selectedSubject);
      setSubjectAnnouncements(anncs);
      setMessage(editingAnnouncement ? "✅ Announcement updated" : "✅ Announcement created");
    } catch (e) {
      setMessage("❌ Could not save announcement");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleEditAnnouncement = (annc: SubjectAnnouncement) => {
    setEditingAnnouncement(annc.id);
    setAnnouncementForm({
      title: annc.title,
      content: annc.content,
      pinned: annc.pinned,
      dueDate: annc.dueDate || ""
    });
    setShowAnnouncementForm(true);
  };

  const handleTogglePin = async (annc: SubjectAnnouncement) => {
    if (!selectedSubject) return;
    setSaving(true);
    try {
      await togglePinSubjectAnnouncement(annc.id, annc.pinned);
      const anncs = await getSubjectAnnouncements(selectedSubject);
      setSubjectAnnouncements(anncs);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    if (!selectedSubject) return;
    setSaving(true);
    try {
      await deleteSubjectAnnouncement(id);
      const anncs = await getSubjectAnnouncements(selectedSubject);
      setSubjectAnnouncements(anncs);
      setMessage("✅ Announcement deleted");
    } catch (e) {
      setMessage("❌ Could not delete");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };


  const subjects = getAllSubjects();

  const sortedBySchedule = useMemo(() => {
    const todaySchedule = getTodaySchedule().map(e => e.subjectCode).filter(c => c !== "ASSEMBLY" && c !== "EXAMEN");
    const priority = new Set(todaySchedule);
    const withPriority = subjects.filter(s => priority.has(s.code));
    const withoutPriority = subjects.filter(s => !priority.has(s.code));
    return [...withPriority, ...withoutPriority];
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        setQrBaseUrl(window.location.origin);

        // Check URL for ?code= parameter to auto-select a subject
        const codeParam = searchParams.get("code");
        if (codeParam) {
          const subject = subjects.find(s => s.code === codeParam);
          if (subject && subject.code !== "ASSEMBLY" && subject.code !== "EXAMEN") {
            setSelectedSubject(codeParam);
            setDetailTab("activities");
            setView("detail");
          }
        }
      } catch (e) {
        console.error("Init failed:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, searchParams]);

  const loadSubjectData = useCallback(async (subjectCode: string) => {
    if (!subjectCode) return;
    try {
      const [acts, allSessions, anncs] = await Promise.all([
        getSubjectActivities(subjectCode),
        getSubjectSessions(subjectCode),
        getSubjectAnnouncements(subjectCode)
      ]);
      setActivities(acts);
      setSessions(allSessions);
      setSubjectAnnouncements(anncs);

      // Set today's session if exists
      const todaySesh = allSessions.find(s => s.date === todayDate);
      setTodaySession(todaySesh || null);
      setSelectedSessionDate(todaySesh?.date || allSessions[0]?.date || todayDate);

      // Load student performance if student
      if (user && profile?.role === "student") {
        const perf = await getStudentAttendancePerSubject(user.uid);
        setStudentPerf(perf);
      }
    } catch (e) {
      console.error("Load subject data failed:", e);
    }
  }, [user, profile, todayDate]);

  useEffect(() => {
    if (selectedSubject && user) {
      loadSubjectData(selectedSubject);
    }
  }, [selectedSubject, user, loadSubjectData]);

  const handleSelectSubject = (code: string) => {
    setSelectedSubject(code);
    setDetailTab("activities");
    setSelectedActivity(null);
    setEditingActivity(false);
    setActivityForm(EMPTY_ACTIVITY_FORM);
    setView("detail");
  };

  const handleBack = () => {
    setView("grid");
    setSelectedSubject(null);
    setSelectedActivity(null);
    setEditingActivity(false);
    setMessage("");
  };

  // ─── Attendance Handlers ───

  const handleCreateSession = async () => {
    if (!selectedSubject || !user) return;
    setSaving(true);
    setMessage("");
    try {
      const session = await createSession(selectedSubject, user.uid);
      if (session) {
        setTodaySession(session);
        setSessions(prev => {
          const exists = prev.find(s => s.id === session.id);
          if (exists) return prev.map(s => s.id === session.id ? session : s);
          return [session, ...prev];
        });
        setMessage("✅ Attendance session created - all students marked Present");
      }
    } catch (e) {
      setMessage("❌ Could not create session");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRecord = async (uid: string, status: SessionAttendanceStatus) => {
    if (!selectedSubject || !user) return;
    setSaving(true);
    try {
      const date = selectedSessionDate || todayDate;
      await updateSessionRecord(selectedSubject, date, uid, {
        status,
        updatedBy: user.uid
      });
      await loadSubjectData(selectedSubject);
    } catch (e) {
      console.error("Update failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSubject) return;
    const date = selectedSessionDate || todayDate;
    if (!window.confirm(`Delete attendance for ${formatDate(date)}? This cannot be undone.`)) return;
    setSaving(true);
    setMessage("");
    try {
      await deleteSession(selectedSubject, date);
      setSessions(prev => prev.filter(s => s.date !== date));
      setSelectedSessionDate(sessions.filter(s => s.date !== date)[0]?.date || "");
      if (todaySession?.date === date) setTodaySession(null);
      setMessage("✅ Attendance session deleted");
    } catch (e) {
      setMessage("❌ Could not delete session");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentSession = () => {
    if (!selectedSessionDate) return sessions[0] || null;
    return sessions.find(s => s.date === selectedSessionDate) || sessions[0] || null;
  };

  const handleExportExcel = () => {
    if (!selectedSubject || !currentSession || !subjectInfo) return;
    exportSubjectAttendanceExcel(
      selectedSubject,
      subjectInfo.name,
      currentSession,
      sessionRecords
    );
  };

  // ─── Activity Handlers ───

  const handleNewActivity = () => {
    setEditingActivity(true);
    setSelectedActivity(null);
    setActivityForm(EMPTY_ACTIVITY_FORM);
  };

  const handleEditActivity = (activity: SubjectActivity) => {
    setSelectedActivity(activity);
    setEditingActivity(true);
    setActivityForm({
      title: activity.title,
      description: activity.description,
      type: activity.type,
      dueDate: activity.dueDate,
      dueTime: activity.dueTime,
      link: activity.link || ""
    });
  };

  const handleSaveActivity = async () => {
    if (!profile || !selectedSubject) return;
    if (!activityForm.title.trim() || !activityForm.dueDate) {
      setMessage("Title and due date are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (selectedActivity) {
        await updateSubjectActivity(selectedActivity, activityForm, profile.uid);
      } else {
        await createSubjectActivity(activityForm, selectedSubject, profile);
      }
      setEditingActivity(false);
      setActivityForm(EMPTY_ACTIVITY_FORM);
      await loadSubjectData(selectedSubject);
      setMessage(selectedActivity ? "✅ Activity updated" : "✅ Activity created");
    } catch (e) {
      setMessage("❌ Could not save activity");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (activity: SubjectActivity) => {
    if (!window.confirm(`Delete "${activity.title}"?`)) return;
    setSaving(true);
    try {
      await deleteSubjectActivity(activity.id);
      setSelectedActivity(null);
      await loadSubjectData(selectedSubject!);
      setMessage("✅ Activity deleted");
    } catch (e) {
      setMessage("❌ Could not delete");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompletion = async (activity: SubjectActivity) => {
    if (!profile) return;
    setSaving(true);
    try {
      await toggleSubjectActivityCompletion(activity, profile);
      await loadSubjectData(selectedSubject!);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Student activity status
  const getActivityStatus = (activity: SubjectActivity) => {
    if (!profile) return "upcoming";
    if (activity.completedBy?.[profile.uid]) return "submitted";
    const today = getTodayDateId();
    if (activity.dueDate < today) return "overdue";
    return "upcoming";
  };

  if (loading) {
    return <div className="subjects-page"><div className="subjects-loading">Loading subjects...</div></div>;
  }

  // ─── GRID VIEW ───
  if (view === "grid") {
    return (
      <div className="subjects-page">
        <div className="subjects-header">
          <div>
            <span className="subjects-eyebrow">CA1B Connect</span>
            <h1>Subjects</h1>
            <p>Your academic dashboard. access activities, attendance, and resources per subject.</p>
          </div>
        </div>

        {message && <div className="subjects-message">{message}</div>}

        <div className="subjects-grid">
          {sortedBySchedule.map((subject) => {
            const scheduledToday = isSubjectScheduledToday(subject.code);
            const perfStats = studentPerf[subject.code];
            const isAssembly = subject.code === "ASSEMBLY" || subject.code === "EXAMEN";
            const unreadNotifs = getSubjectUnreadCount(subject.code);

            return (
              <article
                key={subject.code}
                className={`subject-card ${scheduledToday ? "today" : ""} ${unreadNotifs > 0 ? "has-notifications" : ""}`}
                onClick={() => !isAssembly && handleSelectSubject(subject.code)}
                style={{ cursor: isAssembly ? "default" : "pointer" }}
              >
                {unreadNotifs > 0 && (
                  <span className="subject-notif-badge">
                    {unreadNotifs > 99 ? "99+" : unreadNotifs}
                  </span>
                )}
                <div
                  className="subject-card-bg"
                  style={{
                    backgroundImage: `url(${subject.backgroundImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: scheduledToday ? "brightness(0.7)" : "brightness(0.6)"
                  }}
                />
                <div className="subject-card-overlay">
                  <div className="subject-card-header">
                    <span className="subject-code">{subject.code}</span>
                    {scheduledToday && <span className="subject-today-badge">Today</span>}
                  </div>
                  <h3 className="subject-name">{subject.name}</h3>
                  <p className="subject-room">{subject.room}</p>
                  {perfStats && (
                    <div className="subject-mini-stats">
                      <span>📊 {perfStats.present + perfStats.late}/{perfStats.total} attended</span>
                    </div>
                  )}
                  {!isAssembly && <button className="subject-enter-btn">Enter →</button>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DETAIL VIEW ───
  const subjectInfo = getSubjectInfo(selectedSubject || "");
  const currentSession = getCurrentSession();
  const sessionRecords = currentSession ? Object.values(currentSession.records).sort((a, b) =>
    (parseInt(a.number) || 999) - (parseInt(b.number) || 999) || a.name.localeCompare(b.name)
  ) : [];

  // Filter activities for student view
  const upcomingActivities = activities.filter(a => {
    const status = profile ? getActivityStatus(a) : "upcoming";
    return status === "upcoming";
  });
  const submittedActivities = activities.filter(a => getActivityStatus(a) === "submitted");
  const overdueActivities = activities.filter(a => getActivityStatus(a) === "overdue");

  return (
    <div className="subjects-page">
      <button className="subjects-back-btn" onClick={handleBack}>← Back to Subjects</button>

      <div className="subject-detail-hero">
        <div
          className="subject-detail-bg"
          style={{
            backgroundImage: `url(${subjectInfo?.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        <div className="subject-detail-overlay">
          <span className="subject-detail-code">{subjectInfo?.code}</span>
          <h1>{subjectInfo?.name}</h1>
          <p>📍 {subjectInfo?.room}</p>
          <div className="subject-detail-schedule">
            {getSubjectSchedule(selectedSubject || "").map((s, i) => (
              <span key={i}>{s.day} {s.entry.time}</span>
            ))}
          </div>
        </div>
      </div>

      {message && <div className="subjects-message">{message}</div>}

      {/* Tabs */}
      <div className="subject-tabs">
        <button className={detailTab === "activities" ? "active" : ""} onClick={() => setDetailTab("activities")}>📝 Activities</button>
        <button className={detailTab === "announcements" ? "active" : ""} onClick={() => setDetailTab("announcements")}>📢 Announcements</button>
        <button className={detailTab === "attendance" ? "active" : ""} onClick={() => setDetailTab("attendance")}>✅ Attendance</button>
        <button className={detailTab === "qrcode" ? "active" : ""} onClick={() => setDetailTab("qrcode")}>📱 QR Late</button>
        <button className={detailTab === "schedule" ? "active" : ""} onClick={() => setDetailTab("schedule")}>📅 Schedule</button>
      </div>

      {/* ── ACTIVITIES TAB ── */}
      {detailTab === "activities" && (
        <div className="subject-activities">
          <div className="subject-activities-header">
            <h2>Activities</h2>
            {canEdit && <button onClick={handleNewActivity}>+ New Activity</button>}
          </div>

          {editingActivity ? (
            <div className="activity-form-card">
              <h3>{selectedActivity ? "Edit Activity" : "New Activity"}</h3>
              <div className="activity-form-grid">
                <label>
                  Title *
                  <input
                    value={activityForm.title}
                    onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Activity title"
                  />
                </label>
                <label>
                  Type
                  <select
                    value={activityForm.type}
                    onChange={e => setActivityForm(f => ({ ...f, type: e.target.value as any }))}
                  >
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="activity">Activity</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </label>
                <label>
                  Due Date *
                  <input
                    type="date"
                    value={activityForm.dueDate}
                    onChange={e => setActivityForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </label>
                <label>
                  Due Time
                  <input
                    type="time"
                    value={activityForm.dueTime}
                    onChange={e => setActivityForm(f => ({ ...f, dueTime: e.target.value }))}
                  />
                </label>
                <label className="full-width">
                  Description
                  <textarea
                    rows={4}
                    value={activityForm.description}
                    onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Instructions, notes, requirements..."
                  />
                </label>
                <label className="full-width">
                  Link (Optional)
                  <input
                    type="url"
                    value={activityForm.link}
                    onChange={e => setActivityForm(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <div className="activity-form-actions">
                <button className="secondary" onClick={() => { setEditingActivity(false); setActivityForm(EMPTY_ACTIVITY_FORM); }}>Cancel</button>
                <button onClick={handleSaveActivity} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          ) : selectedActivity ? (
            <div className="activity-detail-card">
              <div className="activity-detail-header">
                <span className={`activity-type-badge ${selectedActivity.type}`}>
                  {ACTIVITY_TYPE_LABELS[selectedActivity.type] || selectedActivity.type}
                </span>
                <span className={`activity-status-badge ${getActivityStatus(selectedActivity)}`}>
                  {getActivityStatus(selectedActivity)}
                </span>
              </div>
              <h3>{selectedActivity.title}</h3>
              <p>{selectedActivity.description || "No description."}</p>
              <div className="activity-detail-meta">
                <div><span>Due Date</span><strong>{formatDate(selectedActivity.dueDate)}</strong></div>
                {selectedActivity.dueTime && <div><span>Time</span><strong>{formatTime(selectedActivity.dueTime)}</strong></div>}
                {selectedActivity.link && (
                  <div><span>Link</span><a href={selectedActivity.link} target="_blank" rel="noreferrer">{selectedActivity.link}</a></div>
                )}
                <div><span>Submitted</span><strong>{Object.keys(selectedActivity.completedBy || {}).length}</strong></div>
              </div>
              <div className="activity-detail-actions">
                <button onClick={() => handleToggleCompletion(selectedActivity)} disabled={saving}>
                  {profile && selectedActivity.completedBy?.[profile.uid] ? "✓ Submitted (Click to undo)" : "Mark as done"}
                </button>
                {canEdit && (
                  <>
                    <button className="secondary" onClick={() => handleEditActivity(selectedActivity)}>Edit</button>
                    <button className="danger" onClick={() => handleDeleteActivity(selectedActivity)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="activity-lists">
              {/* Student view: filter activities */}
              {profile?.role === "student" ? (
                <>
                  <div className="activity-section">
                    <h4>📌 Upcoming</h4>
                    {upcomingActivities.length === 0 ? <p className="activity-empty">No upcoming activities.</p> :
                      upcomingActivities.map(a => renderActivityCard(a))}
                  </div>
                  <div className="activity-section">
                    <h4>✅ Submitted</h4>
                    {submittedActivities.length === 0 ? <p className="activity-empty">No submitted activities.</p> :
                      submittedActivities.map(a => renderActivityCard(a))}
                  </div>
                  <div className="activity-section">
                    <h4>⚠️ Missing / Overdue</h4>
                    {overdueActivities.length === 0 ? <p className="activity-empty">No missing activities!</p> :
                      overdueActivities.map(a => renderActivityCard(a))}
                  </div>
                </>
              ) : (
                /* Teacher view: all activities with stats */
                <>
                  <div className="activity-section">
                    <h4>📊 All Activities ({activities.length})</h4>
                    {activities.length === 0 ? <p className="activity-empty">No activities yet. Create one!</p> :
                      activities.map(a => (
                        <article key={a.id} className="activity-list-card" onClick={() => { setSelectedActivity(a); setEditingActivity(false); }}>
                          <div className="activity-list-top">
                            <span className={`activity-type-badge ${a.type}`}>{ACTIVITY_TYPE_LABELS[a.type]}</span>
                            <span>{getActivityDeadlineLabel(a.dueDate)}</span>
                          </div>
                          <h4>{a.title}</h4>
                          <div className="activity-list-stats">
                            <span>📋 {Object.keys(a.completedBy || {}).length} / 37 submitted</span>
                            <span>📊 {Math.round((Object.keys(a.completedBy || {}).length / 37) * 100)}% completion</span>
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {detailTab === "attendance" && (
        <div className="subject-attendance">
          <div className="subject-attendance-header">
            <h2>Attendance</h2>
            <div className="attendance-header-actions">
              {canEdit && (
                <button onClick={handleCreateSession} disabled={saving}>
                  {saving ? "Creating..." : todaySession ? "🔄 Reopen Today" : "⚡ Create Today's Session"}
                </button>
              )}
              {sessions.length > 0 && (
                <select value={selectedSessionDate} onChange={e => setSelectedSessionDate(e.target.value)}>
                  {sessions.map(s => (
                    <option key={s.id} value={s.date}>{formatDate(s.date)}</option>
                  ))}
                </select>
              )}
              {currentSession && (
                <button onClick={handleExportExcel}>
                  📥 Export Excel
                </button>
              )}
              {canEdit && currentSession && (
                <button className="danger" onClick={handleDeleteSession} disabled={saving}>
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>

          {!currentSession ? (
            <div className="attendance-empty-state">
              <h3>No attendance session</h3>
              <p>Create today's attendance session to start tracking.</p>
            </div>
          ) : (
            <>
              <div className="attendance-summary-strip">
                <div className="as-item present"><span>Present</span><strong>{currentSession.summary.present}</strong></div>
                <div className="as-item late"><span>Late</span><strong>{currentSession.summary.late}</strong></div>
                <div className="as-item absent"><span>Absent</span><strong>{currentSession.summary.absent}</strong></div>
                <div className="as-item excused"><span>Excused</span><strong>{currentSession.summary.excused}</strong></div>
                <div className="as-item total"><span>Total</span><strong>{currentSession.summary.total}</strong></div>
              </div>

              <div className="attendance-table-container">
                <table className="attendance-session-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRecords.map((record, idx) => (
                      <tr key={record.uid} className={record.uid === user?.uid ? "current-user" : ""}>
                        <td>{record.number || idx + 1}</td>
                        <td><strong>{record.name}</strong><span>{record.email}</span></td>
                        <td>
                          {canEdit ? (
                            <select
                              value={record.status}
                              disabled={saving}
                              onChange={e => handleUpdateRecord(record.uid, e.target.value as SessionAttendanceStatus)}
                              className={`status-select ${record.status}`}
                            >
                              <option value="present">Present</option>
                              <option value="late">Late</option>
                              <option value="absent">Absent</option>
                              <option value="excused">Excused</option>
                            </select>
                          ) : (
                            <span className={`status-badge ${record.status}`}>
                              {SESSION_STATUS_LABELS[record.status]}
                            </span>
                          )}
                        </td>
                        <td>{record.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── QR TAB ── */}
      {detailTab === "qrcode" && (
        <div className="subject-qr">
          <div className="qr-info-card">
            <h3>📱 QR Late Attendance System</h3>
            <p>Students scan this QR code to mark themselves as <strong>LATE</strong> for {subjectInfo?.code} today.</p>
            <div className="qr-warning">
              ⚠️ This QR only records <strong>LATE</strong> entries. Present and Absent must be managed manually.
            </div>
          </div>

          {!todaySession ? (
            <div className="qr-no-session">
              <h3>No active session for today</h3>
              <p>Create today's attendance session first.</p>
              {canEdit && <button onClick={handleCreateSession} disabled={saving}>Create Session</button>}
            </div>
          ) : (
            <div className="qr-display-card">
              <div className="qr-code-container">
                <QRCodeSVG
                  value={`${qrBaseUrl}/qr-attendance?subject=${selectedSubject}&date=${todayDate}`}
                  size={280}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="qr-details">
                <p><strong>Subject:</strong> {subjectInfo?.code} - {subjectInfo?.name}</p>
                <p><strong>Date:</strong> {formatDate(todayDate)}</p>
                <p><strong>Students marked Late via QR:</strong> {todaySession.summary.late}</p>
              </div>
            </div>
          )}

          {todaySession && todaySession.summary.late > 0 && (
            <div className="qr-late-list">
              <h4>Late Arrivals Today</h4>
              <div className="late-records">
                {Object.values(todaySession.records).filter(r => r.status === "late").map(r => (
                  <div key={r.uid} className="late-record-item">
                    <span>{r.name}</span>
                    <span className="late-time">{r.scannedAt ? "✅ Scanned" : "Manual"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANNOUNCEMENTS TAB ── */}
      {detailTab === "announcements" && (
        <div className="subject-announcements-tab">
          <div className="subject-activities-header">
            <h2>Announcements</h2>
            {canCreateAnnc && (
              <button onClick={() => { setShowAnnouncementForm(true); setEditingAnnouncement(null); setAnnouncementForm({ title: "", content: "", pinned: false, dueDate: "" }); }}>
                + New Announcement
              </button>
            )}
          </div>

          {showAnnouncementForm && (
            <div className="announcement-form-overlay" onClick={() => setShowAnnouncementForm(false)}>
              <div className="announcement-form-modal" onClick={e => e.stopPropagation()}>
                <h3>{editingAnnouncement ? "Edit Announcement" : "New Announcement"}</h3>
                <label>
                  Title
                  <input
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Announcement title..."
                  />
                </label>
                <label>
                  Content
                  <textarea
                    rows={5}
                    value={announcementForm.content}
                    onChange={e => setAnnouncementForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Write your announcement..."
                  />
                </label>
                <label className="ann-form-row">
                  <input
                    type="checkbox"
                    checked={announcementForm.pinned}
                    onChange={e => setAnnouncementForm(f => ({ ...f, pinned: e.target.checked }))}
                  />
                  <span>Pin this announcement</span>
                </label>
                <label>
                  Due date (optional)
                  <input
                    type="date"
                    value={announcementForm.dueDate}
                    onChange={e => setAnnouncementForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </label>
                <div className="activity-form-actions">
                  <button className="secondary" onClick={() => { setShowAnnouncementForm(false); setEditingAnnouncement(null); }}>Cancel</button>
                  <button onClick={handleSaveAnnouncement} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                </div>
              </div>
            </div>
          )}

          {!showAnnouncementForm && (
            <div className="subject-announcements-list">
              {subjectAnnouncements.length === 0 ? (
                <div className="activity-empty">No announcements yet.</div>
              ) : (
                subjectAnnouncements.map(annc => (
                  <article key={annc.id} className={`subject-annc-card ${annc.pinned ? "pinned" : ""}`}>
                    <div className="subject-annc-header">
                      {annc.pinned && <span className="annc-pin-badge">📌 Pinned</span>}
                      <span className="annc-creator">
                        {annc.creatorName} · {annc.creatorRole}
                      </span>
                      <span className="annc-date">
                        {formatTimestamp(annc.createdAt)}
                      </span>
                    </div>
                    <h3>{annc.title}</h3>
                    <p className="annc-content">{annc.content}</p>
                    {annc.dueDate && (
                      <span className="annc-due">Due: {formatDate(annc.dueDate)}</span>
                    )}
                    {annc.attachments.length > 0 && (
                      <div className="annc-attachments">
                        {annc.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="annc-attachment">
                            📎 {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="annc-actions">
                      {canCreateAnnc && (
                        <>
                          <button className="secondary small" onClick={() => handleEditAnnouncement(annc)}>✏️ Edit</button>
                          <button className="secondary small" onClick={() => handleTogglePin(annc)}>
                            {annc.pinned ? "📌 Unpin" : "📌 Pin"}
                          </button>
                          <button className="danger small" onClick={() => handleDeleteAnnouncement(annc.id)}>🗑️ Delete</button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {detailTab === "schedule" && (
        <div className="subject-schedule-tab">
          <h2>Weekly Schedule</h2>
          <div className="schedule-table-wrap">
            {getSubjectSchedule(selectedSubject || "").length === 0 ? (
              <p>No scheduled sessions for this subject.</p>
            ) : (
              <table className="schedule-detail-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {getSubjectSchedule(selectedSubject || "").map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.day}</strong></td>
                      <td>{s.entry.time}</td>
                      <td>{s.entry.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Activity card renderer (shared)
  function renderActivityCard(activity: SubjectActivity) {
    const status = profile ? getActivityStatus(activity) : "upcoming";
    return (
      <article
        key={activity.id}
        className={`activity-list-card ${status}`}
        onClick={() => { setSelectedActivity(activity); setEditingActivity(false); }}
      >
        <div className="activity-list-top">
          <span className={`activity-type-badge ${activity.type}`}>
            {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
          </span>
          <span className={`activity-deadline-label ${status}`}>
            {status === "overdue" ? getActivityDeadlineLabel(activity.dueDate) : activity.dueTime ? formatTime(activity.dueTime) : "All day"}
          </span>
        </div>
        <h4>{activity.title}</h4>
        <p className="activity-list-desc">{activity.description?.slice(0, 120)}</p>
        <div className="activity-list-meta">
          <span>📅 {formatDate(activity.dueDate)}</span>
          {activity.link && <span>🔗 Link</span>}
        </div>
      </article>
    );
  }
}
