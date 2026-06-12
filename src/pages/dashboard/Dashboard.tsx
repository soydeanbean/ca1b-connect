import { useState } from "react";
import ScheduleModal from "../../components/common/ScheduleModal";
import "./Dashboard.css";

type ScheduleStatus = "done" | "ongoing" | "upcoming";

type ScheduleItem = {
  time: string;
  subject: string;
  room: string;
  status: ScheduleStatus;
};

export default function Dashboard() {
  const [stats] = useState({
    students: 37,
    attendance: 100,
    assignments: 0,
    announcements: 3,
  });

  const [schedule] = useState<ScheduleItem[]>([
    {
      time: "08:00 - 09:30 AM",
      subject: "Homeroom Guidance Program I",
      room: "HB322",
      status: "done",
    },
    {
      time: "10:00 - 11:00 AM",
      subject: "Life and Career Skills",
      room: "HB311",
      status: "ongoing",
    },
    {
      time: "11:00 - 12:00 AM/Noon",
      subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino",
      room: "HB311",
      status: "upcoming",
    },
    {
      time: "01:00 - 03:00 PM",
      subject: "Computer Systems Servicing",
      room: "CSLAB4",
      status: "upcoming",
    },
    {
      time: "04:00 - 05:00 PM",
      subject: "General Mathematics",
      room: "HB311",
      status: "upcoming",
    },
  ]);

  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <div className="dashboard">

      <section className="dashboard-header">
        <h1>CA1B Dashboard</h1>
        <p>Welcome back, manage your class efficiently.</p>
      </section>

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

      <section className="dashboard-grid">

        <div className="card schedule-card">
          <h2>Today's Schedule</h2>

          <div className="schedule-table">

            <div className="schedule-header">
              <span>Time</span>
              <span>Subject</span>
              <span>Room</span>
            </div>

            {schedule.map((item, index) => (
              <div
                key={index}
                className={`schedule-row ${getStatusClass(item.status)}`}
                onClick={() => openModal(item)}
              >
                <span>{item.time}</span>
                <span>{item.subject}</span>
                <span>{item.room}</span>
              </div>
            ))}

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

      <section className="bottom-grid">

        <div className="card quick-actions">
          <h2>Quick Actions</h2>

          <button> Add Student</button>
          <button> Take Attendance</button>
          <button> Create Assignment</button>
          <button> New Announcement</button>
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

      <ScheduleModal
        open={modalOpen}
        item={selectedSchedule}
        onClose={closeModal}
      />

    </div>
  );
}