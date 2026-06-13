// src/pages/profile/Profile.tsx

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

import defaultProfile from "../../assets/logos/ca1b.png";

import "./Profile.css";

type StudentProfile = {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  number?: string;
  role?: string;
  birthday?: string;
  photoURL?: string;
  bio?: string;
  section?: string;
};

type ProfileForm = {
  name: string;
  email: string;
  number: string;
  role: string;
  birthday: string;
  photoURL: string;
  bio: string;
};

const emptyForm: ProfileForm = {
  name: "",
  email: "",
  number: "",
  role: "",
  birthday: "",
  photoURL: "",
  bio: ""
};

function isStudentProfile(value: unknown): value is StudentProfile {
  return typeof value === "object" && value !== null;
}

function formatRole(role: string) {
  if (!role) return "Student";

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Profile() {
  const { user } = useAuth();

  const [studentKey, setStudentKey] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");

  const initials = useMemo(() => {
    const source = form.name || user?.displayName || user?.email || "CA";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [form.name, user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setLoading(true);
      setMessage("");

      const studentsRef = doc(db, "classCA1B", "Students");
      const snap = await getDoc(studentsRef);

      if (!snap.exists()) {
        setLoading(false);
        setMessage("Students document was not found.");
        return;
      }

      const data = snap.data();
      const currentEmail = user.email?.toLowerCase();

      const match = Object.entries(data).find(([, value]) => {
        if (!isStudentProfile(value)) return false;

        const profile = value;
        const profileEmail = profile.email?.toLowerCase();

        return (
          profile.uid === user.uid ||
          profile.id === user.uid ||
          profileEmail === currentEmail
        );
      });

      if (!match) {
        setLoading(false);
        setMessage("No student profile is connected to this account yet.");
        return;
      }

      const [key, value] = match;
      const profile = value as StudentProfile;

      setStudentKey(key);
      setStudent(profile);
      setForm({
        name: profile.name || user.displayName || "",
        email: profile.email || user.email || "",
        number: profile.number || "",
        role: profile.role || "student",
        birthday: profile.birthday || "",
        photoURL: profile.photoURL || user.photoURL || "",
        bio: profile.bio || ""
      });

      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleCancel = () => {
    setEditMode(false);
    setMessage("");

    setForm({
      name: student?.name || user?.displayName || "",
      email: student?.email || user?.email || "",
      number: student?.number || "",
      role: student?.role || "student",
      birthday: student?.birthday || "",
      photoURL: student?.photoURL || user?.photoURL || "",
      bio: student?.bio || ""
    });
  };

  const handleSave = async () => {
    if (!user || !studentKey) return;

    setSaving(true);
    setMessage("");

    const studentsRef = doc(db, "classCA1B", "Students");

    const updatedProfile: StudentProfile = {
      ...student,
      id: student?.id || studentKey,
      uid: student?.uid || user.uid,
      name: form.name.trim(),
      email: form.email.trim(),
      number: form.number.trim(),
      role: form.role,
      birthday: form.birthday,
      photoURL: form.photoURL.trim(),
      bio: form.bio.trim()
    };

    await updateDoc(studentsRef, {
      [studentKey]: updatedProfile
    });

    await updateProfile(user, {
      displayName: updatedProfile.name || user.displayName,
      photoURL: updatedProfile.photoURL || user.photoURL
    });

    setStudent(updatedProfile);
    setEditMode(false);
    setSaving(false);
    setMessage("Profile updated successfully.");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar">
            {form.photoURL ? (
              <img src={form.photoURL} alt={form.name || "Profile"} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div>
            <p className="profile-kicker">CA1B Student Profile</p>
            <h1>{form.name || "Unnamed Student"}</h1>
            <span>{formatRole(form.role)}</span>
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

      {message && <div className="profile-message">{message}</div>}

      <section className="profile-grid">
        <div className="profile-card profile-main-card">
          <div className="profile-card-header">
            <h2>Personal Info</h2>
            <p>Details connected to your CA1B account.</p>
          </div>

          <div className="profile-form">
            <label>
              Full Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="Your full name"
              />
            </label>

            <label>
              Email
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="your.email@example.com"
              />
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
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="student">Student</option>
                <option value="president">President</option>
                <option value="vp">Vice President</option>
                <option value="secretary">Secretary</option>
                <option value="treasurer">Treasurer</option>
                <option value="auditor">Auditor</option>
                <option value="beadle">Beadle</option>
                <option value="pio">PIO</option>
              </select>
            </label>

            <label>
              Photo URL
              <input
                name="photoURL"
                value={form.photoURL}
                onChange={handleChange}
                disabled={!editMode}
                placeholder="https://..."
              />
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
            src={form.photoURL || defaultProfile}
            alt="Profile preview"
            className="profile-preview-img"
          />

          <div>
            <h3>{form.name || "Student"}</h3>
            <p>{form.email || "No email added"}</p>
          </div>

          <div className="profile-mini-list">
            <div>
              <span>Student ID</span>
              <strong>{student?.id || studentKey || "Not set"}</strong>
            </div>

            <div>
              <span>Section</span>
              <strong>{student?.section || "CA1B"}</strong>
            </div>

            <div>
              <span>Role</span>
              <strong>{formatRole(form.role)}</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}