import React, { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";

import { useAuth } from "../../hooks/useAuth";
import {
  ensureUserProfile,
  getUserProfile,
  updateMyProfile
} from "../../services/profileService";
import { formatText, formatDateLabel } from "../../utils/formatters";
import { getStudentAttendanceOverview } from "../../services/attendanceService";
import { getActivities, getActivityStats } from "../../services/activityService";
import { getStudentAttendancePerSubject, getStudentSubjectActivityStats, getAllSubjects } from "../../services/subjectService";

import type { UserProfile } from "../../types/Profile";
import type { PersonalAttendanceOverview } from "../../types/Attendance";
import type { ActivityStats } from "../../types/Activity";

import defaultProfile from "../../assets/logos/ca1b.png";
import "./Profile.css";

type ProfileForm = {
  name: string;
  number: string;
  birthday: string;
  bio: string;
};

export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [attendanceOverview, setAttendanceOverview] =
    useState<PersonalAttendanceOverview | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    number: "",
    birthday: "",
    bio: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");

  const initials = useMemo(() => {
    const source = profile?.name || user?.displayName || user?.email || "CA";

    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile, user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setLoading(true);
      setMessage("");

      try {
        await ensureUserProfile(user);

        const loadedProfile = await getUserProfile(user.uid);
        const [overview, activities] = await Promise.all([
          getStudentAttendanceOverview(user.uid),
          getActivities()
        ]);

        if (loadedProfile) {
          setProfile(loadedProfile);
          setForm({
            name: loadedProfile.name || "",
            number: loadedProfile.number || "",
            birthday: loadedProfile.birthday || "",
            bio: loadedProfile.bio || ""
          });
        }

        setAttendanceOverview(overview);
        setActivityStats(getActivityStats(activities, user.uid));
      } catch (error) {
        console.error("Profile load failed:", error);
        setMessage("Profile could not be fully loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleCancel = () => {
    if (!profile) return;

    setForm({
      name: profile.name || "",
      number: profile.number || "",
      birthday: profile.birthday || "",
      bio: profile.bio || ""
    });

    setEditMode(false);
    setMessage("");
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    setMessage("");

    try {
      await updateMyProfile(user.uid, form);

      await updateProfile(user, {
        displayName: form.name || user.displayName
      });

      const updatedProfile = await getUserProfile(user.uid);

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      setEditMode(false);
      setMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);
      setMessage("Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Profile could not be loaded.</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} />
            ) : user?.photoURL ? (
              <img src={user.photoURL} alt={profile.name} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div>
            <p className="profile-kicker">CA1B Connect Profile</p>
            <h1>{profile.name}</h1>
            <span>{formatText(profile.officerRole || profile.role)}</span>
          </div>
        </div>

        <button
          type="button"
          className="profile-edit-btn"
          onClick={() => (editMode ? handleCancel() : setEditMode(true))}
        >
          {editMode ? "Cancel" : "Edit Profile"}
        </button>
      </section>

      <section className="profile-card profile-activity-card">
        <div className="profile-card-header">
          <h2>My Activities</h2>
          <p>Assignments, class activities, and projects checked as finished.</p>
        </div>

        <div className="profile-activity-summary">
          <div>
            <span>Finished</span>
            <strong>{activityStats?.completed || 0}</strong>
          </div>
          <div>
            <span>Pending</span>
            <strong>{activityStats?.pending || 0}</strong>
          </div>
          <div>
            <span>Overdue</span>
            <strong>{activityStats?.overdue || 0}</strong>
          </div>
          <div>
            <span>Assignments</span>
            <strong>{activityStats?.assignmentsCompleted || 0}</strong>
          </div>
          <div>
            <span>Projects</span>
            <strong>{activityStats?.projectsCompleted || 0}</strong>
          </div>
          <div>
            <span>Activities</span>
            <strong>{activityStats?.activitiesCompleted || 0}</strong>
          </div>
        </div>
      </section>

      {message && <div className="profile-message">{message}</div>}

      {profile.status === "pending" && (
        <div className="profile-warning">
          Your account is listed as visitor and is waiting for approval.
        </div>
      )}

      <section className="profile-grid">
        <div className="profile-card profile-main-card">
          <div className="profile-card-header">
            <h2>Personal Information</h2>
            <p>Email, role, section, and status are protected fields.</p>
          </div>

          <div className="profile-form">
            <label>
              Full Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!editMode}
              />
            </label>

            <label>
              Email
              <input value={profile.email} disabled />
            </label>

            <label>
              Phone Number
              <input
                name="number"
                value={form.number}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="09XXXXXXXXX"
              />
            </label>

            <label>
              Phone Status
              <input
                value={profile.numberVerified ? "Verified" : "Not verified"}
                disabled
              />
            </label>

            <label>
              Birthday
              <input
                type="date"
                name="birthday"
                value={form.birthday}
                onChange={handleChange}
                disabled={!editMode}
              />
            </label>

            <label>
              Role
              <input value={formatText(profile.role)} disabled />
            </label>

            <label>
              Class
              <input value={profile.class || "Not assigned"} disabled />
            </label>

            <label>
              Section
              <input value={profile.section || "Not assigned"} disabled />
            </label>

            <label>
              Officer Role
              <input value={formatText(profile.officerRole)} disabled />
            </label>

            <label>
              Status
              <input value={formatText(profile.status)} disabled />
            </label>

            <label className="profile-wide">
              Bio
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="Tell the class a little about yourself."
                rows={4}
              />
            </label>
          </div>

          {editMode && (
            <div className="profile-actions">
              <button
                type="button"
                className="profile-secondary-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="profile-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        <aside className="profile-card profile-side-card">
          <img
            src={profile.photoURL || user?.photoURL || defaultProfile}
            alt="Profile preview"
            className="profile-preview-img"
          />

          <div>
            <h3>{profile.name}</h3>
            <p>{profile.email}</p>
          </div>

          <div className="profile-mini-list">
            <div>
              <span>ID</span>
              <strong>{profile.id}</strong>
            </div>

            <div>
              <span>Role</span>
              <strong>{formatText(profile.role)}</strong>
            </div>

            <div>
              <span>Section</span>
              <strong>{profile.section || "Not assigned"}</strong>
            </div>

            <div>
              <span>Officer Role</span>
              <strong>{formatText(profile.officerRole)}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="profile-card profile-attendance-card">
        <div className="profile-card-header">
          <h2>My Attendance</h2>
          <p>Your full personal attendance history from saved class records.</p>
        </div>

        <div className="profile-attendance-summary">
          <div>
            <span>Rate</span>
            <strong>{attendanceOverview?.attendanceRate || 0}%</strong>
          </div>
          <div>
            <span>Present</span>
            <strong>{attendanceOverview?.present || 0}</strong>
          </div>
          <div>
            <span>Late</span>
            <strong>{attendanceOverview?.late || 0}</strong>
          </div>
          <div>
            <span>Absent</span>
            <strong>{attendanceOverview?.absent || 0}</strong>
          </div>
          <div>
            <span>Excused</span>
            <strong>{attendanceOverview?.excused || 0}</strong>
          </div>
        </div>

        {!attendanceOverview || attendanceOverview.entries.length === 0 ? (
          <div className="profile-attendance-empty">
            No attendance records found yet.
          </div>
        ) : (
          <div className="profile-attendance-list">
            {attendanceOverview.entries.map((entry) => (
              <div
                key={entry.date}
                className={`profile-attendance-row ${entry.status}`}
              >
                <div>
                  <strong>{formatDateLabel(entry.date)}</strong>
                  <span>{formatText(entry.status)}</span>
                </div>

                <p>{entry.note || "No note"}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}