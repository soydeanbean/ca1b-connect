// src/pages/dashboard/Dashboard.tsx

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

import type { Officer } from "../../data/Officers";
import { officers } from "../../data/Officers";
import { PH_HOLIDAYS_2026 } from "../../data/Holidays";

import ScheduleModal from "../../components/common/ScheduleModal";

import { seedUserData } from "../../services/seedUserData";
import { seedClassData } from "../../services/seedClassData";
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

type ScheduleStatus = "done" | "ongoing" | "upcoming";

type ScheduleItem = {
  day: WeekDay;
  time: string;
  subject: string;
  room: string;
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

type ClassData = {
  schedule?: ScheduleItem[];
  events?: CalendarEvent[];
  students?: unknown[];
  studentCount?: number;
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

function parseTimeRange(time: string) {
  const [startRaw, endRaw] = time.split(" - ");

  const parse = (value: string) => {
    const [hourMin, meridian] = value.trim().split(" ");
    let [hours, minutes] = hourMin.split(":").map(Number);

    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  return {
    start: parse(startRaw),
    end: parse(endRaw)
  };
}

function getManilaWeekday(date: Date): WeekDay {
  return date.toLocaleDateString("en-PH", {
    weekday: "long",
    timeZone: "Asia/Manila"
  }) as WeekDay;
}

function getManilaDateText(date: Date) {
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila"
  });
}

function getScheduleStatus(item: ScheduleItem): ScheduleStatus {
  const now = new Date();
  const currentDay = getManilaWeekday(now);

  const currentDayIndex = WEEKDAYS.indexOf(currentDay);
  const scheduleDayIndex = WEEKDAYS.indexOf(item.day);

  if (scheduleDayIndex < currentDayIndex) return "done";
  if (scheduleDayIndex > currentDayIndex) return "upcoming";

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const { start, end } = parseTimeRange(item.time);

  if (nowMinutes > end) return "done";
  if (nowMinutes >= start && nowMinutes <= end) return "ongoing";

  return "upcoming";
}

function getStudentCount(data: ClassData) {
  if (Array.isArray(data.students)) return data.students.length;
  if (typeof data.studentCount === "number") return data.studentCount;

  return 0;
}

export default function Dashboard() {
  const { user } = useAuth();

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);

  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<CalendarViewItem[] | null>(
    null
  );

  const [nowText, setNowText] = useState("");

  const today = new Date();
  const weekday = getManilaWeekday(today);
  const phDate = getManilaDateText(today);

  const currentMonth = MONTHS[monthIndex];

  const todaysSchedule = useMemo(
    () => schedule.filter((item) => item.day === weekday),
    [schedule, weekday]
  );

  const daysInMonth = useMemo(
    () => new Date(currentMonth.year, currentMonth.month + 1, 0).getDate(),
    [currentMonth]
  );

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      await seedClassData();
      await seedUserData(user.uid);

      const snap = await getDoc(doc(db, "classCA1B", "data"));

      if (snap.exists()) {
        const data = snap.data() as ClassData;

        setSchedule(data.schedule || []);
        setEvents(data.events || []);
        setStudentCount(getStudentCount(data));
      }

      setLoading(false);
    };

    loadDashboardData();
  }, [user]);

  useEffect(() => {
    const updateLiveTracker = () => {
      if (!todaysSchedule.length) {
        setNowText("No classes today");
        return;
      }

      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();

      const parsedSchedule = todaysSchedule
        .map((item) => {
          const time = parseTimeRange(item.time);
          return { ...item, start: time.start, end: time.end };
        })
        .sort((a, b) => a.start - b.start);

      const currentClass = parsedSchedule.find(
        (item) => minutes >= item.start && minutes <= item.end
      );
      const nextClass = parsedSchedule.find((item) => item.start > minutes);

      if (minutes >= 720 && minutes <= 780) {
        setNowText("Lunch time");
        return;
      }

      if (currentClass) {
        setNowText(`Now: ${currentClass.subject}`);
        return;
      }

      if (nextClass) {
        setNowText(`Next: ${nextClass.subject} at ${nextClass.time}`);
        return;
      }

      setNowText("Free time / school over");
    };

    updateLiveTracker();

    const interval = window.setInterval(updateLiveTracker, 60000);
    return () => window.clearInterval(interval);
  }, [todaysSchedule]);

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
      .filter((event) => event.date === dateStr)
      .forEach((event) => {
        items.push({
          date: event.date,
          type: "event",
          title: event.title,
          description: event.description
        });
      });

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

  if (loading) {
    return <div className="dashboard">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <section className="hero">
        <div>
          <h1>CA1B Connect</h1>
          <p className="motto">Creativity is Society’s Cab</p>
        </div>

        <div className="hero-date">
          <p>
            {weekday} • {phDate}
          </p>
          <p className="live-status">{nowText}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Students</span>
          <strong>{studentCount}</strong>
          <p>Current CA1B class members</p>
        </div>
      </section>

      <div className="flow">
        <section className="panel">
          <h2>Today’s Schedule</h2>

          {todaysSchedule.length === 0 ? (
            <p className="empty-state">No classes scheduled</p>
          ) : (
            todaysSchedule.map((item, index) => (
              <div
                key={`${item.day}-${item.time}-${index}`}
                className={`schedule ${getScheduleStatus(item)}`}
                onClick={() => {
                  setSelectedSchedule(item);
                  setModalOpen(true);
                }}
              >
                <span>{item.time}</span>
                <b>{item.subject}</b>
                <span>{item.room}</span>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <div className="calendar-header">
            <h2>Calendar</h2>

            <div className="month-select">
              <select
                value={monthIndex}
                onChange={(event) => setMonthIndex(Number(event.target.value))}
              >
                {MONTHS.map((month, index) => (
                  <option key={month.label} value={index}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="calendar-layout">
            <div className="calendar-list">
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const { date, weekdayShort } = getDateInfo(day);

                return (
                  <div key={day} className="day-item">
                    <div className="day-number">{day}</div>

                    <div className="day-meta">
                      <span>{weekdayShort}</span>
                      <small>{date.toISOString().split("T")[0]}</small>
                    </div>

                    <div className="day-actions">
                      <button type="button" onClick={() => handleOpenDay(day)}>
                        View
                      </button>
                      <button type="button" onClick={() => handleGoogleSync(day)}>
                        Sync
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="calendar-detail">
              {!selectedDay ? (
                <div className="empty-state">Select a day</div>
              ) : (
                selectedDay.map((item, index) => (
                  <div key={`${item.date}-${item.title}-${index}`} className={`cal-card ${item.type}`}>
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

      <section className="officers">
        <h2>Class Officers</h2>

        <div className="officer-layout">
          <div className="officer-list">
            {officers.map((officer) => (
              <button
                type="button"
                key={officer.role}
                className="officer-item"
                onClick={() => setSelectedOfficer(officer)}
              >
                {officer.role}
              </button>
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
        item={
          selectedSchedule
            ? {
                ...selectedSchedule,
                status: getScheduleStatus(selectedSchedule)
              }
            : null
        }
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}