// src/pages/activities/SubjectActivities.tsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserProfile } from "../../services/profileService";
import { getAllSubjects, getSubjectActivities, getTodayDateId } from "../../services/subjectService";
import type { SubjectActivity } from "../../types/Subject";
import type { UserProfile } from "../../types/Profile";
import "./SubjectActivities.css";

function formatDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getDeadlineLabel(dueDate: string) {
  const today = new Date();
  const due = new Date(`${dueDate}T23:59:59`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

type ActivityStatus = "upcoming" | "ongoing" | "finished" | "overdue";
type StatusFilter = "all" | ActivityStatus;

export default function SubjectActivities() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<SubjectActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "subject" | "title">("dueDate");
  const [selectedActivity, setSelectedActivity] = useState<SubjectActivity | null>(null);

  const subjects = getAllSubjects();

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);

        // Load activities from all subjects
        const subjectCodes = subjects.map(s => s.code);
        const promises = subjectCodes.map(code => getSubjectActivities(code));
        const results = await Promise.all(promises);
        const allActivities = results.flat();
        setActivities(allActivities);
      } catch (e) {
        console.error("Failed to load subject activities:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const getStatus = useCallback((activity: SubjectActivity): ActivityStatus => {
    if (!profile) return "upcoming";
    if (activity.completedBy?.[profile.uid]) return "finished";
    const today = getTodayDateId();
    if (activity.dueDate < today) return "overdue";
    return "upcoming";
  }, [profile]);

  // Exclude completed activities and filter by status
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Exclude finished activities from global view
    if (profile) {
      filtered = filtered.filter(a => !a.completedBy?.[profile.uid]);
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.subjectCode.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }

    // Subject filter
    if (subjectFilter !== "all") {
      filtered = filtered.filter(a => a.subjectCode === subjectFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => getStatus(a) === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "dueDate") return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === "subject") return a.subjectCode.localeCompare(b.subjectCode);
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [activities, search, subjectFilter, statusFilter, sortBy, profile, getStatus]);

  const getSubjectName = (code: string) => {
    const subject = subjects.find(s => s.code === code);
    return subject?.name || code;
  };

  if (loading) {
    return <div className="subject-activities-page"><div className="loading-state">Loading activities...</div></div>;
  }

  return (
    <div className="subject-activities-page">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">CA1B Connect</span>
          <h1>Subject Activities</h1>
          <p>Track activities across all your subjects in one place.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sa-filters">
        <input
          type="text"
          className="sa-search"
          placeholder="Search activities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
          <option value="all">All Subjects</option>
          {subjects.filter(s => s.code !== "ASSEMBLY" && s.code !== "EXAMEN").map(s => (
            <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="overdue">Overdue</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="dueDate">Sort by Due Date</option>
          <option value="subject">Sort by Subject</option>
          <option value="title">Sort by Title</option>
        </select>
      </div>

      {/* Selected Activity Detail */}
      {selectedActivity && (
        <div className="sa-detail-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="sa-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="sa-detail-back" onClick={() => setSelectedActivity(null)}>← Back</button>
            <div className="sa-detail-header">
              <span className={`sa-type-badge ${selectedActivity.type}`}>
                {selectedActivity.type}
              </span>
              <span className={`sa-status-badge ${getStatus(selectedActivity)}`}>
                {getStatus(selectedActivity)}
              </span>
            </div>
            <h2>{selectedActivity.title}</h2>
            <div className="sa-detail-subject">
              {getSubjectName(selectedActivity.subjectCode)} ({selectedActivity.subjectCode})
            </div>
            <p className="sa-detail-desc">{selectedActivity.description || "No description provided."}</p>
            <div className="sa-detail-meta">
              <div><span>Due Date</span><strong>{formatDate(selectedActivity.dueDate)}</strong></div>
              {selectedActivity.dueTime && <div><span>Time</span><strong>{selectedActivity.dueTime}</strong></div>}
              {selectedActivity.links && selectedActivity.links.length > 0 && (
                <div className="sa-detail-links">
                  <span>Links</span>
                  <div className="sa-links-list">
                    {selectedActivity.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" className="sa-link-item">
                        {l.label || l.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div><span>Subject</span><strong>{selectedActivity.subjectCode}</strong></div>
            </div>
            <Link
              to={`/subjects?code=${selectedActivity.subjectCode}`}
              className="sa-detail-subject-link"
              onClick={(e) => e.stopPropagation()}
            >
              📚 View in Subject →
            </Link>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="sa-count">
        {filteredActivities.length} active activit{filteredActivities.length === 1 ? "y" : "ies"}
      </div>

      {/* Activity List */}
      <div className="sa-list">
        {filteredActivities.length === 0 ? (
          <div className="sa-empty">
            <h3>No activities found</h3>
            <p>Try changing your filters or check back later.</p>
          </div>
        ) : (
          filteredActivities.map(activity => {
            const status = getStatus(activity);
            const subjectInfo = subjects.find(s => s.code === activity.subjectCode);
            return (
              <article
                key={activity.id}
                className={`sa-card ${status}`}
                onClick={() => setSelectedActivity(activity)}
              >
                <div className="sa-card-top">
                  <span className={`sa-type-badge ${activity.type}`}>
                    {activity.type}
                  </span>
                  <span className={`sa-deadline ${status}`}>
                    {getDeadlineLabel(activity.dueDate)}
                  </span>
                </div>
                <h3>{activity.title}</h3>
                <div className="sa-card-subject">
                  <span className="sa-subject-code">{activity.subjectCode}</span>
                  <span>{subjectInfo?.name || activity.subjectCode}</span>
                </div>
                <div className="sa-card-meta">
                  <span>📅 {formatDate(activity.dueDate)}</span>
                  {activity.dueTime && <span>⏰ {activity.dueTime}</span>}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}