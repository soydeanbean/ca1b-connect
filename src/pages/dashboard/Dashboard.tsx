import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

import type { Officer } from "../../data/Officers";
import { officers } from "../../data/Officers";

import ScheduleModal from "../../components/common/ScheduleModal";
import { seedUserData } from "../../services/seedUserData";
import { seedClassData } from "../../services/seedClassData";

import { PH_HOLIDAYS_2026 } from "../../data/Holidays";
import { exportToGoogleCalendar } from "../../services/calendarService";

import "./Dashboard.css";

type WeekDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

type ScheduleItem = {
  day: WeekDay;
  time: string;
  subject: string;
  room: string;
  status: "done" | "ongoing" | "upcoming";
};

type CalendarEvent = {
  date: string;
  title: string;
  description: string;
};

type CalendarViewItem = {
  date: string;
  type: "class" | "event" | "holiday";
  title: string;
  description?: string;
};

const MONTHS = [
  { label: "June 2026", month: 5, year: 2026 },
  { label: "July 2026", month: 6, year: 2026 },
  { label: "August 2026", month: 7, year: 2026 },
  { label: "September 2026", month: 8, year: 2026 },
  { label: "October 2026", month: 9, year: 2026 },
  { label: "November 2026", month: 10, year: 2026 },
  { label: "December 2026", month: 11, year: 2026 },
  { label: "January 2027", month: 0, year: 2027 },
  { label: "February 2027", month: 1, year: 2027 },
  { label: "March 2027", month: 2, year: 2027 },
  { label: "April 2027", month: 3, year: 2027 }
];

const WEEKDAYS: WeekDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

// ---------------- TIME PARSER ----------------
function parseTimeRange(time: string) {
  const [startRaw, endRaw] = time.split(" - ");

  const parse = (t: string) => {
    const [hourMin, meridian] = t.trim().split(" ");
    let [h, m] = hourMin.split(":").map(Number);

    if (meridian === "PM" && h !== 12) h += 12;
    if (meridian === "AM" && h === 12) h = 0;

    return h * 60 + m;
  };

  return {
    start: parse(startRaw),
    end: parse(endRaw)
  };
}

export default function Dashboard() {
  const { user } = useAuth();

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);

  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<CalendarViewItem[] | null>(null);

  const currentMonth = MONTHS[monthIndex];

  const today = new Date();

  const weekday = today.toLocaleDateString("en-PH", {
    weekday: "long",
    timeZone: "Asia/Manila"
  }) as WeekDay;

  const phDate = today.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila"
  });

  const filteredSchedule = schedule.filter((s) => s.day === weekday);

  // ---------------- LIVE TRACKER ----------------
  const [nowText, setNowText] = useState<string>("");

  useEffect(() => {
    const update = () => {
      if (!filteredSchedule.length) {
        setNowText("No classes today");
        return;
      }

      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();

      const parsed = filteredSchedule
        .map((s) => {
          const t = parseTimeRange(s.time);
          return { ...s, start: t.start, end: t.end };
        })
        .sort((a, b) => a.start - b.start);

      const current = parsed.find((s) => minutes >= s.start && minutes <= s.end);
      const next = parsed.find((s) => s.start > minutes);

      if (minutes >= 720 && minutes <= 780) {
        setNowText("🍽️ LUNCH TIME");
        return;
      }

      if (current) {
        setNowText(`📚 NOW: ${current.subject}`);
      } else if (next) {
        setNowText(`⏭ NEXT: ${next.subject} at ${next.time}`);
      } else {
        setNowText("🆓 FREE TIME / SCHOOL OVER");
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [filteredSchedule]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;

      await seedClassData();
      await seedUserData(user.uid);

      const snap = await getDoc(doc(db, "classCA1B", "data"));

      if (snap.exists()) {
        const data = snap.data();
        setSchedule(data.schedule || []);
        setEvents(data.events || []);
      }

      setLoading(false);
    };

    init();
  }, [user]);

  const daysInMonth = useMemo(
    () => new Date(currentMonth.year, currentMonth.month + 1, 0).getDate(),
    [currentMonth]
  );

  const getDateInfo = (day: number) => {
    const date = new Date(Date.UTC(currentMonth.year, currentMonth.month, day));

    const dateStr = date.toISOString().split("T")[0];
    const weekdayShort = WEEKDAYS[date.getUTCDay()];

    const items: CalendarViewItem[] = [];

    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

    if (isWeekend) {
      items.push({
        date: dateStr,
        type: "holiday",
        title: "Weekend",
        description: "No classes scheduled"
      });
    }

    if (PH_HOLIDAYS_2026[dateStr]) {
      items.push({
        date: dateStr,
        type: "holiday",
        title: PH_HOLIDAYS_2026[dateStr],
        description: "Philippine Holiday"
      });
    }

    events
      .filter((e) => e.date === dateStr)
      .forEach((e) =>
        items.push({
          date: e.date,
          type: "event",
          title: e.title,
          description: e.description
        })
      );

    if (items.length === 0) {
      items.push({
        date: dateStr,
        type: "class",
        title: "Regular Class Day",
        description: "Normal school day"
      });
    }

    return { date, weekdayShort, items };
  };

  const handleOpenDay = (day: number) => {
    const info = getDateInfo(day);
    setSelectedDay(info.items);
  };

  const handleGoogleSync = async (day: number) => {
    const info = getDateInfo(day);
    await exportToGoogleCalendar(info.items);
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

        <div className="hero-date">
          <p>{weekday} • {phDate}</p>
          <p style={{ marginTop: 6, fontWeight: 700 }}>{nowText}</p>
        </div>
      </section>

      <div className="flow">

        {/* SCHEDULE */}
        <section className="panel">
          <h2>Today’s Schedule</h2>

          {filteredSchedule.length === 0 ? (
            <p className="empty-state">No classes scheduled</p>
          ) : (
            filteredSchedule.map((s, i) => (
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
            ))
          )}
        </section>

        {/* CALENDAR */}
        <section className="panel">
          <div className="calendar-header">
            <h2>Calendar</h2>

            <div className="month-select">
              <select
                value={monthIndex}
                onChange={(e) => setMonthIndex(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="calendar-layout">

            <div className="calendar-list">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const { date, weekdayShort } = getDateInfo(i + 1);

                return (
                  <div key={i} className="day-item">
                    <div className="day-number">{i + 1}</div>
                    <div className="day-meta">
                      <span>{weekdayShort}</span>
                      <small>{date.toISOString().split("T")[0]}</small>
                    </div>

                    <div className="day-actions">
                      <button onClick={() => handleOpenDay(i + 1)}>View</button>
                      <button onClick={() => handleGoogleSync(i + 1)}>Sync</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="calendar-detail">
              {!selectedDay ? (
                <div className="empty-state">Select a day</div>
              ) : (
                selectedDay.map((item, i) => (
                  <div key={i} className={`cal-card ${item.type}`}>
                    <b>{item.title}</b>
                    <p>{item.description}</p>
                    <span>{item.type}</span>
                  </div>
                ))
              )}
            </div>

          </div>
        </section>
      </div>

      {/* OFFICERS */}
      <section className="officers">
        <h2>Class Officers</h2>

        <div className="officer-layout">
          <div className="officer-list">
            {officers.map((o) => (
              <div
                key={o.role}
                className="officer-item"
                onClick={() => setSelectedOfficer(o)}
              >
                {o.role}
              </div>
            ))}
          </div>

          <div className="officer-detail">
            {!selectedOfficer ? (
              <div className="empty-state">Select officer</div>
            ) : (
              <div className="officer-content">
                <h3>{selectedOfficer.name}</h3>
                <p>{selectedOfficer.description}</p>
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