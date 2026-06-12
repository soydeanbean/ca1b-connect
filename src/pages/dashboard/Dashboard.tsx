import { useEffect, useState } from "react";
import ScheduleModal from "../../components/common/ScheduleModal";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import "./Dashboard.css";

type ScheduleStatus = "done" | "ongoing" | "upcoming";

type ScheduleItem = {
  time: string;
  subject: string;
  room: string;
  status: ScheduleStatus;
};

type Stats = {
  students: number;
  attendance: number;
  assignments: number;
  announcements: number;
};

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<Stats>({
    students: 0,
    attendance: 0,
    assignments: 0,
    announcements: 0,
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  // 🔥 FETCH FIRESTORE DATA
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) return;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setStats(
          data.stats ?? {
            students: 0,
            attendance: 0,
            assignments: 0,
            announcements: 0,
          }
        );

        setSchedule(data.schedule ?? []);
      }

      setLoading(false);
    };

    fetchDashboard();
  }, [user]);

  const getStatusClass = (status: ScheduleStatus) => {
    if (status === "done") return "done";
    if (status === "ongoing") return "ongoing";
    return "upcoming";
  };

  const openModal = (item: ScheduleItem) => {
    setSelectedSchedule(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedSchedule(null);
    setModalOpen(false);
  };

  // ⏳ LOADING STATE
  if (loading) {
    return (
      <div className="dashboard">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">

      <section className="dashboard-header">
        <h1>CA1B Dashboard</h1>
        <p>Welcome back, manage your class efficiently.</p>
      </section>

      {/* STATS */}
      <section className="stats-grid">

        <div className="stat-card">
          <h3>{stats.students}</h3>
          <p>Total Students</p>
        </div>

        <div className="stat-card">
          <h3>{stats.attendance}%</h3>
          <p>Attendance Rate</p>
        </div>

        <div className="stat-card">
          <h3>{stats.assignments}</h3>
          <p>Pending Assignments</p>
        </div>

        <div className="stat-card">
          <h3>{stats.announcements}</h3>
          <p>Announcements</p>
        </div>

      </section>

      {/* SCHEDULE + ANNOUNCEMENTS */}
      <section className="dashboard-grid">

        <div className="card schedule-card">
          <h2>Today's Schedule</h2>

          <div className="schedule-table">

            <div className="schedule-header">
              <span>Time</span>
              <span>Subject</span>
              <span>Room</span>
            </div>

            {schedule.length === 0 ? (
              <p>No schedule available</p>
            ) : (
              schedule.map((item, index) => (
                <div
                  key={index}
                  className={`schedule-row ${getStatusClass(item.status)}`}
                  onClick={() => openModal(item)}
                >
                  <span>{item.time}</span>
                  <span>{item.subject}</span>
                  <span>{item.room}</span>
                </div>
              ))
            )}

          </div>
        </div>

        <div className="card announcements-card">
          <h2>Announcements</h2>

          <div className="announcement">
            <h4>Exam Schedule Updated</h4>
            <p>Midterm exams will start next week.</p>
          </div>

          <div className="announcement">
            <h4>Project Submission</h4>
            <p>All assignments must be submitted Friday.</p>
          </div>

        </div>

      </section>

      {/* QUICK ACTIONS */}
      <section className="bottom-grid">

        <div className="card quick-actions">
          <h2>Quick Actions</h2>

          <button>Add Student</button>
          <button>Take Attendance</button>
          <button>Create Assignment</button>
          <button>New Announcement</button>
        </div>

        <div className="card events-card">
          <h2>Upcoming Events</h2>

          <ul>
            <li>📅 Quiz - Friday</li>
            <li>📅 Project Deadline - Next Week</li>
            <li>📅 School Event - Month End</li>
          </ul>
        </div>

      </section>

      {/* MODAL */}
      <ScheduleModal
        open={modalOpen}
        item={selectedSchedule}
        onClose={closeModal}
      />

    </div>
  );
}