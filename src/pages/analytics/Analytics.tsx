// src/pages/analytics/Analytics.tsx

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getAnalyticsData } from "../../services/analyticsService";
import type { AnalyticsData, TimelineView } from "../../types/Analytics";
import "./Analytics.css";

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<TimelineView>("daily");
  const [activeTab, setActiveTab] = useState<"workload" | "subjects" | "productivity" | "attendance">("workload");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const analytics = await getAnalyticsData(user.uid, view);
        setData(analytics);
      } catch (e) {
        console.error("Failed to load analytics:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, view]);

  const maxTimelineCount = useMemo(() => {
    if (!data) return 1;
    const allCounts = [
      ...data.activityTimeline.map(p => p.count),
      ...data.announcementTimeline.map(p => p.count)
    ];
    return Math.max(...allCounts, 1);
  }, [data]);

  if (loading) {
    return <div className="analytics-page"><div className="loading-state">Loading analytics...</div></div>;
  }

  if (!data) {
    return <div className="analytics-page"><div className="loading-state">Could not load analytics.</div></div>;
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">CA1B Connect</span>
          <h1>Analytics</h1>
          <p>Understand your workload, attendance, and class activity patterns.</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="analytics-view-toggle">
        {(["daily", "weekly", "monthly"] as TimelineView[]).map(v => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => setView(v)}
          >
            {v === "daily" ? "Daily" : v === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button className={activeTab === "workload" ? "active" : ""} onClick={() => setActiveTab("workload")}>
          📊 Workload
        </button>
        <button className={activeTab === "subjects" ? "active" : ""} onClick={() => setActiveTab("subjects")}>
          📚 Subjects
        </button>
        <button className={activeTab === "productivity" ? "active" : ""} onClick={() => setActiveTab("productivity")}>
          ⚡ Productivity
        </button>
        <button className={activeTab === "attendance" ? "active" : ""} onClick={() => setActiveTab("attendance")}>
          ✅ Attendance
        </button>
      </div>

      {/* Workload Tab */}
      {activeTab === "workload" && (
        <div className="analytics-section">
          <div className="analytics-card">
            <h3>Activity Load Timeline</h3>
            <p>Activities assigned per {view === "daily" ? "day" : view === "weekly" ? "week" : "month"}</p>
            <div className="timeline-chart">
              {data.activityTimeline.length === 0 ? (
                <div className="chart-empty">No activity data</div>
              ) : (
                data.activityTimeline.map((point, i) => (
                  <div key={i} className="timeline-bar-group">
                    <div className="timeline-bar" style={{ height: `${(point.count / maxTimelineCount) * 100}%` }}>
                      <span className="timeline-count">{point.count}</span>
                    </div>
                    <span className="timeline-label">{point.date.slice(5)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="analytics-card">
            <h3>Announcement Timeline</h3>
            <p>Announcements posted per {view === "daily" ? "day" : view === "weekly" ? "week" : "month"}</p>
            <div className="timeline-chart">
              {data.announcementTimeline.length === 0 ? (
                <div className="chart-empty">No announcement data</div>
              ) : (
                data.announcementTimeline.map((point, i) => (
                  <div key={i} className="timeline-bar-group">
                    <div className="timeline-bar announcement" style={{ height: `${(point.count / maxTimelineCount) * 100}%` }}>
                      <span className="timeline-count">{point.count}</span>
                    </div>
                    <span className="timeline-label">{point.date.slice(5)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="analytics-card full-width">
            <h3>Combined Workload</h3>
            <p>Activities and announcements on the same timeline</p>
            <div className="combined-chart">
              {data.combinedTimeline.length === 0 ? (
                <div className="chart-empty">No data available</div>
              ) : (
                <div className="combined-grid">
                  {data.combinedTimeline.map((point, i) => (
                    <div key={i} className="combined-column">
                      <div className="combined-bar-group">
                        <div className="combined-bar activity" style={{ height: `${(point.count / maxTimelineCount) * 100}%` }}>
                          <span className="combined-count">{point.type === "activity" ? point.count : ""}</span>
                        </div>
                        {point.type === "announcement" && (
                          <div className="combined-bar announcement" style={{ height: `${(point.count / maxTimelineCount) * 100}%` }}>
                            <span className="combined-count">{point.count}</span>
                          </div>
                        )}
                      </div>
                      <span className="combined-label">{point.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="chart-legend">
              <span><span className="legend-dot activity"></span> Activities</span>
              <span><span className="legend-dot announcement"></span> Announcements</span>
            </div>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === "subjects" && (
        <div className="analytics-section">
          <div className="analytics-card full-width">
            <h3>Subject Workload Breakdown</h3>
            <p>Activities and announcements distributed across subjects</p>
            <div className="subject-breakdown">
              {data.subjectBreakdown.length === 0 ? (
                <div className="chart-empty">No subject data</div>
              ) : (
                data.subjectBreakdown.map(subject => (
                  <div key={subject.subjectCode} className="subject-breakdown-item">
                    <div className="subject-breakdown-header">
                      <span className="subject-code-badge">{subject.subjectCode}</span>
                      <span className="subject-name">{subject.subjectName}</span>
                      <span className="subject-total">{subject.totalCount} total</span>
                    </div>
                    <div className="subject-breakdown-bars">
                      <div className="subject-bar-row">
                        <span className="bar-label">Activities</span>
                        <div className="bar-track">
                          <div className="bar-fill activity" style={{ width: `${subject.activityCount}%` }} />
                        </div>
                        <span className="bar-value">{subject.activityCount}</span>
                      </div>
                      <div className="subject-bar-row">
                        <span className="bar-label">Announcements</span>
                        <div className="bar-track">
                          <div className="bar-fill announcement" style={{ width: `${subject.announcementCount}%` }} />
                        </div>
                        <span className="bar-value">{subject.announcementCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Productivity Tab */}
      {activeTab === "productivity" && (
        <div className="analytics-section">
          <div className="stats-grid-analytics">
            <div className="stat-card-analytics">
              <span className="stat-value">{data.productivity.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-card-analytics">
              <span className="stat-value">{data.productivity.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-card-analytics">
              <span className="stat-value overdue">{data.productivity.overdue}</span>
              <span className="stat-label">Overdue</span>
            </div>
            <div className="stat-card-analytics highlight">
              <span className="stat-value">{data.productivity.completionRate}%</span>
              <span className="stat-label">Completion Rate</span>
            </div>
          </div>

          <div className="analytics-card">
            <h3>Productivity Overview</h3>
            <div className="progress-ring-container">
              <div className="progress-ring">
                <svg viewBox="0 0 120 120" className="progress-svg">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - data.productivity.completionRate / 100)}`}
                    transform="rotate(-90, 60, 60)"
                    strokeLinecap="round"
                  />
                  <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize="24" fontWeight="700">
                    {data.productivity.completionRate}%
                  </text>
                </svg>
              </div>
              <div className="progress-legend">
                <div><span className="legend-dot completed"></span> Completed ({data.productivity.completed})</div>
                <div><span className="legend-dot pending"></span> Pending ({data.productivity.pending})</div>
                <div><span className="legend-dot overdue-dot"></span> Overdue ({data.productivity.overdue})</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <div className="analytics-section">
          <div className="stats-grid-analytics">
            <div className="stat-card-analytics">
              <span className="stat-value present">{data.attendance.present}</span>
              <span className="stat-label">Present</span>
            </div>
            <div className="stat-card-analytics">
              <span className="stat-value late">{data.attendance.late}</span>
              <span className="stat-label">Late</span>
            </div>
            <div className="stat-card-analytics">
              <span className="stat-value excused">{data.attendance.excused}</span>
              <span className="stat-label">Excused</span>
            </div>
            <div className="stat-card-analytics highlight">
              <span className="stat-value">{data.attendance.attendancePercentage}%</span>
              <span className="stat-label">Attendance Rate</span>
            </div>
          </div>

          <div className="analytics-card full-width">
            <h3>Attendance Breakdown</h3>
            <div className="attendance-breakdown">
              {[
                { label: "Present", value: data.attendance.present, color: "#10b981", pct: data.attendance.total > 0 ? Math.round(data.attendance.present / data.attendance.total * 100) : 0 },
                { label: "Late", value: data.attendance.late, color: "#f59e0b", pct: data.attendance.total > 0 ? Math.round(data.attendance.late / data.attendance.total * 100) : 0 },
                { label: "Excused", value: data.attendance.excused, color: "#8b5cf6", pct: data.attendance.total > 0 ? Math.round(data.attendance.excused / data.attendance.total * 100) : 0 },
                { label: "Absent", value: data.attendance.absent, color: "#ef4444", pct: data.attendance.total > 0 ? Math.round(data.attendance.absent / data.attendance.total * 100) : 0 }
              ].map(item => (
                <div key={item.label} className="attendance-bar-item">
                  <div className="attendance-bar-header">
                    <span>{item.label}</span>
                    <span>{item.value} ({item.pct}%)</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}