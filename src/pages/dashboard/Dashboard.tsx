import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ScheduleModal from "../../components/common/ScheduleModal";
import "./Dashboard.css";

type Officer = {
  role: string;
  name: string;
  description: string;
  responsibilities: string[];
};

type ScheduleItem = {
  time: string;
  subject: string;
  room: string;
  status: "done" | "ongoing" | "upcoming";
};

type CalendarDay = {
  day: number;
  type?: "class" | "event" | "holiday" | "online";
  label?: string;
};

const officers: Officer[] = [
    {
    role: "President",
    name: "Khyle Reese R. Bernando",
    description:
      "Leads the class organization, oversees decisions, and represents the section in school matters.",
    responsibilities: [
      "Leads meetings",
      "Coordinates officers",
      "Represents class in school activities",
    ],
  },
  {
    role: "Vice President",
    name: "Mikhaila Hurleyanne E. Sorita",
    description:
      "Assists the president and takes charge when the president is unavailable.",
    responsibilities: ["Supports president", "Assists in coordination"],
  },
  {
    role: "Secretary",
    name: "Bea Agatha T. Espiritu",
    description:
      "Handles documentation, attendance records, and official class notes.",
    responsibilities: ["Records meetings", "Manages documents"],
  },
  {
    role: "Treasurer",
    name: "Elvin Yhiel D. Garfin",
    description:
      "Manages class funds, budgeting, and financial tracking.",
    responsibilities: ["Handles funds", "Tracks expenses"],
  },
  {
    role: "Auditor",
    name: "Rachel P. Parza",
    description:
      "Ensures all financial records are accurate and transparent.",
    responsibilities: ["Audits finances", "Validates records"],
  },
  {
    role: "P.I.O",
    name: "Nativity France S. Cedron",
    description:
      "Manages announcements and class communication.",
    responsibilities: ["Posts updates", "Handles communication"],
  },
  {
    role: "Business Managers",
    name: "Leo John S. Arganda & James Joseph T. Rovera",
    description:
      "Handles class projects, fundraising, and external coordination.",
    responsibilities: ["Manages projects", "Organizes fundraisers"],
  },
  {
    role: "Beadle",
    name: "Rejiro R. Reobaldez",
    description:
      "Maintains classroom order and assists teachers during class.",
    responsibilities: ["Assists teacher", "Maintains order"],
  },
  {
    role: "Co-beadle",
    name: "Arkin B. Canonizado",
    description:
      "Supports the beadle in maintaining classroom discipline.",
    responsibilities: ["Supports Beadle", "Helps classroom flow"],
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);

  // 🔥 used for animation refresh
  const [animKey, setAnimKey] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setSchedule(snap.data().schedule ?? []);

      setLoading(false);
    };

    fetch();
  }, [user]);

  const selectOfficer = (o: Officer) => {
    setSelectedOfficer(o);
    setAnimKey((k) => k + 1); // retrigger animation
  };

  const openDay = (day: number) => {
    const types: CalendarDay["type"][] = ["class", "event", "holiday", "online"];

    setSelectedDay({
      day,
      type: types[day % 4],
      label:
        day % 4 === 0
          ? "Regular Class Day"
          : day % 4 === 1
          ? "School Event"
          : day % 4 === 2
          ? "Holiday"
          : "Online Class",
    });
  };

  if (loading) return <div className="dashboard">Loading...</div>;

  return (
    <div className="dashboard">

      {/* HERO */}
      <section className="hero">
        <div>
          <h1>CA1B Connect</h1>
          <p className="motto">Creativity is Society’s Cab</p>
        </div>

        <div className="hero-right">
          <p>📅 {new Date().toDateString()}</p>
        </div>
      </section>

      {/* FLOW */}
      <div className="flow">

        {/* SCHEDULE */}
        <section className="panel accent-orange">
          <h2>Today’s Schedule</h2>

          {schedule.slice(0, 5).map((s, i) => (
            <div
              key={i}
              className={`schedule ${s.status}`}
              onClick={() => {
                setSelectedSchedule(s);
                setModalOpen(true);
              }}
            >
              <span>{s.time}</span>
              <b>{s.subject}</b>
              <span>{s.room}</span>
            </div>
          ))}
        </section>

        {/* CALENDAR */}
        <section className="panel calendar-panel">
          <h2>Calendar</h2>

          <div className="calendar">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="day" onClick={() => openDay(i + 1)}>
                {i + 1}
              </div>
            ))}
          </div>

          {selectedDay && (
            <div className="day-details">
              <b>Day {selectedDay.day}</b>
              <p>{selectedDay.label}</p>
              <span className={`tag ${selectedDay.type}`}>
                {selectedDay.type}
              </span>
            </div>
          )}
        </section>
      </div>

      {/* OFFICERS MASTER DETAIL */}
      <section className="officers">
        <h2>Class Officers</h2>

        <div className="officer-layout">

          {/* LEFT */}
          <div className="officer-list">
            {officers.map((o, i) => (
              <div
                key={i}
                className={`officer-item ${selectedOfficer?.role === o.role ? "active" : ""}`}
                onClick={() => selectOfficer(o)}
              >
                {o.role}
              </div>
            ))}
          </div>

          {/* RIGHT */}
          <div key={animKey} className={`officer-detail ${!selectedOfficer ? "empty" : ""}`}>

            {!selectedOfficer ? (
              <div className="empty-state">
                Select an officer to view details
              </div>
            ) : (
              <div className="officer-content">

                <div className="role">{selectedOfficer.role}</div>

                <div className="name">{selectedOfficer.name}</div>

                <div className="desc">{selectedOfficer.description}</div>

                <div className="section-title">Responsibilities</div>

                <ul className="resp">
                  {selectedOfficer.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

              </div>
            )}

          </div>

        </div>
      </section>

      <ScheduleModal
        open={modalOpen}
        item={selectedSchedule}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}