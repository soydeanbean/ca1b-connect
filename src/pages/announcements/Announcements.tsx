// src/pages/announcements/Announcements.tsx

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement
} from "../../services/announcementService";
import { getUserProfile } from "../../services/profileService";
import { canCreateAnnouncements } from "../../services/permissionService";
import type { Announcement, AnnouncementCategory, AnnouncementFormValues } from "../../types/Announcement";
import type { UserProfile } from "../../types/Profile";

import "./Announcements.css";

const EMPTY_FORM: AnnouncementFormValues = {
  title: "",
  content: "",
  category: "major"
};

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

export default function Announcements() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { markAllRead } = useNotifications();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | AnnouncementCategory>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnouncementFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Profile modal state
  const [selectedCreator, setSelectedCreator] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const canCreate = canCreateAnnouncements(profile);

  const highlightedId = searchParams.get("id");

  const loadAnnouncements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");

    try {
      const [loadedProfile, loadedAnnouncements] = await Promise.all([
        getUserProfile(user.uid),
        getAnnouncements()
      ]);

      setProfile(loadedProfile);
      setAnnouncements(loadedAnnouncements);
    } catch (error) {
      console.error("Announcements load failed:", error);
      setMessage("Announcements could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Mark notifications as read when visiting page
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const filteredAnnouncements = useMemo(() => {
    if (filter === "all") return announcements;
    return announcements.filter((a) => a.category === filter);
  }, [announcements, filter]);

  const handleCreate = async () => {
    if (!profile || !form.title.trim() || !form.content.trim()) {
      setMessage("Title and content are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await createAnnouncement(form, profile);
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadAnnouncements();
      setMessage("Announcement created.");
    } catch (error) {
      console.error("Announcement create failed:", error);
      setMessage("Announcement could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;

    setMessage("");
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();
      setMessage("Announcement removed.");
    } catch (error) {
      console.error("Announcement delete failed:", error);
      setMessage("Announcement could not be removed.");
    }
  };

  const handleCreatorClick = async (createdBy: string) => {
    setLoadingProfile(true);
    try {
      const creatorProfile = await getUserProfile(createdBy);
      setSelectedCreator(creatorProfile);
    } catch {
      setSelectedCreator(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loading) {
    return <div className="announcements-page">Loading announcements...</div>;
  }

  return (
    <div className="announcements-page">
      {/* HEADER */}
      <div className="announcements-header">
        <div>
          <h1>Announcements</h1>
          <p>Stay updated with class announcements and notices</p>
        </div>

        {canCreate && (
          <button
            className="announcements-create-btn"
            onClick={() => setShowForm(true)}
          >
            + New Announcement
          </button>
        )}
      </div>

      {message && <div className="announcements-message">{message}</div>}

      {/* FILTERS */}
      <div className="announcements-filters">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={filter === "major" ? "active" : ""}
          onClick={() => setFilter("major")}
        >
          Major
        </button>
        <button
          className={filter === "minor" ? "active" : ""}
          onClick={() => setFilter("minor")}
        >
          Minor
        </button>
      </div>

      {/* GRID */}
      {filteredAnnouncements.length === 0 ? (
        <div className="announcements-empty">
          <h3>No announcements yet</h3>
          <p>
            {filter === "all"
              ? "Check back later for updates."
              : `No ${filter} announcements at the moment.`}
          </p>
        </div>
      ) : (
        <div className="announcements-grid">
          {filteredAnnouncements.map((announcement) => (
            <article
              key={announcement.id}
              className={`announcement-card ${
                highlightedId === announcement.id ? "highlighted" : ""
              }`}
            >
              <div className="announcement-card-header">
                <span
                  className={`announcement-card-category ${announcement.category}`}
                >
                  {announcement.category}
                </span>
                <span className="announcement-card-time">
                  {formatTimestamp(announcement.createdAt)}
                </span>
              </div>

              <h2>{announcement.title}</h2>
              <p className="announcement-card-content">{announcement.content}</p>

              <div className="announcement-card-footer">
                <div
                  className="announcement-card-creator"
                  onClick={() => handleCreatorClick(announcement.createdBy)}
                >
                  <img
                    src={announcement.creatorPhotoURL || undefined}
                    alt={announcement.creatorName}
                  />
                  <div className="announcement-card-creator-info">
                    <span className="announcement-card-creator-name">
                      {announcement.creatorName}
                    </span>
                    <span className="announcement-card-creator-role">
                      {announcement.creatorRole}
                    </span>
                  </div>
                </div>

                {canCreate && (
                  <button
                    className="announcement-delete-btn"
                    onClick={() => handleDelete(announcement.id)}
                    title="Delete"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px"
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* CREATE FORM MODAL */}
      {showForm && (
        <div
          className="announcement-form-overlay"
          onClick={() => setShowForm(false)}
        >
          <div
            className="announcement-form"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>New Announcement</h2>

            <label>
              <span>Title</span>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Announcement title..."
              />
            </label>

            <label>
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as AnnouncementCategory
                  }))
                }
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </label>

            <label>
              <span>Content</span>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Write your announcement here..."
              />
            </label>

            <div className="announcement-form-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {(selectedCreator || loadingProfile) && (
        <div
          className="profile-overlay"
          onClick={() => setSelectedCreator(null)}
        >
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingProfile ? (
              <p>Loading profile...</p>
            ) : selectedCreator ? (
              <>
                <img
                  src={selectedCreator.photoURL || undefined}
                  alt={selectedCreator.name}
                />
                <h3>{selectedCreator.name}</h3>
                <p className="profile-modal-role">
                  {selectedCreator.officerRole || selectedCreator.role}
                </p>
                <p className="profile-modal-email">{selectedCreator.email}</p>
                <button onClick={() => setSelectedCreator(null)}>
                  Close
                </button>
              </>
            ) : (
              <>
                <p>Profile not found.</p>
                <button onClick={() => setSelectedCreator(null)}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}