// src/pages/announcements/SubjectAnnouncements.tsx

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getAllSubjects } from "../../services/subjectService";
import { getAllSubjectAnnouncements } from "../../services/subjectAnnouncementService";
import type { SubjectAnnouncement } from "../../types/SubjectAnnouncement";
import "./SubjectAnnouncements.css";

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

function formatDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export default function SubjectAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<SubjectAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "pinned" | "subject">("pinned");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SubjectAnnouncement | null>(null);

  const subjects = getAllSubjects();

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const all = await getAllSubjectAnnouncements();
        setAnnouncements(all);
      } catch (e) {
        console.error("Failed to load subject announcements:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.subjectCode.toLowerCase().includes(q) ||
        a.creatorName.toLowerCase().includes(q)
      );
    }

    // Subject filter
    if (subjectFilter !== "all") {
      filtered = filtered.filter(a => a.subjectCode === subjectFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "pinned") {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.createdAt as any)?.toDate?.()?.getTime() - (a.createdAt as any)?.toDate?.()?.getTime();
      }
      if (sortBy === "newest") {
        return (b.createdAt as any)?.toDate?.()?.getTime() - (a.createdAt as any)?.toDate?.()?.getTime();
      }
      if (sortBy === "oldest") {
        return (a.createdAt as any)?.toDate?.()?.getTime() - (b.createdAt as any)?.toDate?.()?.getTime();
      }
      return a.subjectCode.localeCompare(b.subjectCode);
    });

    return filtered;
  }, [announcements, search, subjectFilter, sortBy]);

  const getSubjectName = (code: string) => {
    const subject = subjects.find(s => s.code === code);
    return subject?.name || code;
  };

  if (loading) {
    return <div className="subject-anncs-page"><div className="loading-state">Loading announcements...</div></div>;
  }

  return (
    <div className="subject-anncs-page">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">CA1B Connect</span>
          <h1>Subject Announcements</h1>
          <p>View announcements from all your subjects in one place.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sa-filters">
        <input
          type="text"
          className="sa-search"
          placeholder="Search announcements..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
          <option value="all">All Subjects</option>
          {subjects.filter(s => s.code !== "ASSEMBLY" && s.code !== "EXAMEN").map(s => (
            <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
          ))}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="pinned">Pinned First</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="subject">By Subject</option>
        </select>
      </div>

      {/* Count */}
      <div className="sa-count">
        {filteredAnnouncements.length} announcement{filteredAnnouncements.length === 1 ? "" : "s"}
      </div>

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <div className="sa-detail-overlay" onClick={() => setSelectedAnnouncement(null)}>
          <div className="sa-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="sa-detail-back" onClick={() => setSelectedAnnouncement(null)}>← Back</button>
            <div className="sa-detail-header">
              {selectedAnnouncement.pinned && <span className="annc-pin-badge">📌 Pinned</span>}
              <span className="sa-subject-code">{selectedAnnouncement.subjectCode}</span>
              <span className="sa-date">{formatTimestamp(selectedAnnouncement.createdAt)}</span>
            </div>
            <h2>{selectedAnnouncement.title}</h2>
            <div className="sa-detail-subject">
              {getSubjectName(selectedAnnouncement.subjectCode)}
            </div>
            <p className="sa-detail-desc">{selectedAnnouncement.content}</p>
            <div className="sa-detail-creator">
              <strong>{selectedAnnouncement.creatorName}</strong> · {selectedAnnouncement.creatorRole}
            </div>
            {selectedAnnouncement.dueDate && (
              <div className="sa-detail-meta">
                <div><span>Due Date</span><strong>{formatDate(selectedAnnouncement.dueDate)}</strong></div>
              </div>
            )}
            {selectedAnnouncement.attachments.length > 0 && (
              <div className="annc-attachments">
                {selectedAnnouncement.attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="annc-attachment">
                    📎 {att.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcement List */}
      <div className="sa-list">
        {filteredAnnouncements.length === 0 ? (
          <div className="sa-empty">
            <h3>No announcements found</h3>
            <p>Try changing your filters or check back later.</p>
          </div>
        ) : (
          filteredAnnouncements.map(annc => {
            const subjectInfo = subjects.find(s => s.code === annc.subjectCode);
            return (
              <article
                key={annc.id}
                className={`sa-annc-card ${annc.pinned ? "pinned" : ""}`}
                onClick={() => setSelectedAnnouncement(annc)}
              >
                <div className="sa-annc-header">
                  {annc.pinned && <span className="sa-pin-badge">📌</span>}
                  <span className="sa-annc-subject">{annc.subjectCode}</span>
                  <span className="sa-annc-date">{formatTimestamp(annc.createdAt)}</span>
                </div>
                <h3>{annc.title}</h3>
                <p className="sa-annc-preview">{annc.content.slice(0, 150)}{annc.content.length > 150 ? "..." : ""}</p>
                <div className="sa-annc-creator">
                  <span>{annc.creatorName}</span>
                  <span>{subjectInfo?.name}</span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}