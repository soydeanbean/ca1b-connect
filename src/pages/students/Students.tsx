import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getActivities, getActivityStats } from "../../services/activityService";
import { getClassProfiles } from "../../services/profileService";
import type { ClassActivity } from "../../types/Activity";
import type { UserProfile } from "../../types/Profile";

import defaultProfile from "../../assets/logos/ca1b.png";
import "./Students.css";

function formatText(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<ClassActivity[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState(searchParams.get("query") || "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const studentId = searchParams.get("student");

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      setMessage("");

      try {
        const [loadedStudents, loadedActivities] = await Promise.all([
          getClassProfiles(),
          getActivities()
        ]);

        setStudents(loadedStudents);
        setActivities(loadedActivities);

        const highlighted = loadedStudents.find((student) => student.uid === studentId);
        if (highlighted) setSelectedStudent(highlighted);
      } catch (error) {
        console.error("Students load failed:", error);
        setMessage("Students could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [studentId]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students
      .filter((student) =>
        `${student.name} ${student.email} ${student.number} ${student.officerRole || ""}`
          .toLowerCase()
          .includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [search, students]);

  const selectedStats = selectedStudent
    ? getActivityStats(activities, selectedStudent.uid)
    : null;

  const openStudent = (student: UserProfile) => {
    setSelectedStudent(student);
    setSearchParams({ student: student.uid });
  };

  const closeStudent = () => {
    setSelectedStudent(null);
    setSearchParams({});
  };

  if (loading) {
    return <div className="students-page">Loading students...</div>;
  }

  return (
    <div className="students-page">
      <section className="students-hero">
        <div>
          <p>CA1B Directory</p>
          <h1>Students</h1>
          <span>Alphabetical cards with GBox account, ID number, and profile details.</span>
        </div>
      </section>

      {message && <div className="students-message">{message}</div>}

      <section className="students-tools">
        <label>
          Search students
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, GBox, ID number, or role"
          />
        </label>
        <span>{filteredStudents.length} student(s)</span>
      </section>

      <section className="students-grid">
        {filteredStudents.length ? (
          filteredStudents.map((student) => (
            <button
              type="button"
              key={student.uid}
              className="student-card"
              onClick={() => openStudent(student)}
            >
              <img src={student.photoURL || defaultProfile} alt={student.name} />
              <div>
                <h3>{student.name}</h3>
                <p>{student.email}</p>
                <span>ID: {student.number || "Not set"}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="students-empty">No students match your search.</div>
        )}
      </section>

      {selectedStudent && (
        <div className="student-modal-overlay" onClick={closeStudent}>
          <article className="student-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="student-modal-close" onClick={closeStudent}>
              ×
            </button>

            <div className="student-modal-head">
              <img src={selectedStudent.photoURL || defaultProfile} alt={selectedStudent.name} />
              <div>
                <p>{formatText(selectedStudent.officerRole || selectedStudent.role)}</p>
                <h2>{selectedStudent.name}</h2>
                <span>{selectedStudent.email}</span>
              </div>
            </div>

            <div className="student-detail-grid">
              <div>
                <span>ID Number</span>
                <strong>{selectedStudent.number || "Not set"}</strong>
              </div>
              <div>
                <span>GBox Account</span>
                <strong>{selectedStudent.email}</strong>
              </div>
              <div>
                <span>Class</span>
                <strong>{selectedStudent.class || "Not assigned"}</strong>
              </div>
              <div>
                <span>Section</span>
                <strong>{selectedStudent.section || "Not assigned"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{formatText(selectedStudent.status)}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selectedStudent.number || "Not set"}</strong>
              </div>
            </div>

            <section className="student-activity-summary">
              <h3>Activity Progress</h3>
              <div>
                <span>Finished</span>
                <strong>{selectedStats?.completed || 0}</strong>
              </div>
              <div>
                <span>Assignments</span>
                <strong>{selectedStats?.assignmentsCompleted || 0}</strong>
              </div>
              <div>
                <span>Projects</span>
                <strong>{selectedStats?.projectsCompleted || 0}</strong>
              </div>
              <div>
                <span>Activities</span>
                <strong>{selectedStats?.activitiesCompleted || 0}</strong>
              </div>
            </section>

            <div className="student-bio">
              <span>Bio</span>
              <p>{selectedStudent.bio || "No bio yet."}</p>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}