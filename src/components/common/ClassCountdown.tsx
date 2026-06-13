// src/components/common/ClassCountdown.tsx

import { useState, useEffect } from "react";
import "./ClassCountdown.css";

type ScheduleItem = {
  day: string;
  time: string;
  subject: string;
  room: string;
};

type Props = {
  schedule: ScheduleItem[];
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

type TimeRange = { start: number; end: number };

function parseTimeRange(time: string): TimeRange {
  const [startRaw, endRaw] = time.split(" - ");

  const parse = (value: string) => {
    const [hourMin, meridian] = value.trim().split(" ");
    const [parsedHours, minutes] = hourMin.split(":").map(Number);
    let hours = parsedHours;

    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  return { start: parse(startRaw), end: parse(endRaw) };
}

function getManilaNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 3600000); // UTC+8
}

function getManilaWeekday(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    weekday: "long",
    timeZone: "Asia/Manila"
  });
}

function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

type NextClass = {
  subject: string;
  time: string;
  room: string;
  day: string;
  minutesUntil: number;
};

function computeNextClass(schedule: ScheduleItem[]): NextClass | null {
  const now = getManilaNow();
  const currentWeekday = getManilaWeekday(now);
  const currentMinutes = getMinutesFromMidnight(now);

  // Check today's schedule for upcoming classes
  const todaySchedule = schedule
    .filter((item) => item.day === currentWeekday)
    .map((item) => ({
      ...item,
      range: parseTimeRange(item.time)
    }))
    .filter((item) => item.range.start > currentMinutes)
    .sort((a, b) => a.range.start - b.range.start);

  if (todaySchedule.length > 0) {
    const next = todaySchedule[0];
    const minutesUntil = next.range.start - currentMinutes;
    return {
      subject: next.subject,
      time: next.time,
      room: next.room,
      day: "Today",
      minutesUntil
    };
  }

  // No more classes today — find next day with classes
  const currentDayIndex = WEEKDAYS.indexOf(currentWeekday);

  for (let offset = 1; offset <= 7; offset++) {
    const checkIndex = (currentDayIndex + offset) % 7;
    const checkDay = WEEKDAYS[checkIndex];

    const daySchedule = schedule.filter((item) => item.day === checkDay);

    if (daySchedule.length > 0) {
      // Get earliest class that day
      const sorted = daySchedule
        .map((item) => ({
          ...item,
          range: parseTimeRange(item.time)
        }))
        .sort((a, b) => a.range.start - b.range.start);

      const first = sorted[0];

      // Calculate days until that day
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + offset);
      futureDate.setHours(0, 0, 0, 0);

      // Add class start time
      const startHours = Math.floor(first.range.start / 60);
      const startMinutes = first.range.start % 60;
      futureDate.setHours(startHours, startMinutes, 0, 0);

      const totalMinutes = (futureDate.getTime() - now.getTime()) / 60000;

      const dayLabel = offset === 1 ? "Tomorrow" : checkDay;

      return {
        subject: first.subject,
        time: first.time,
        room: first.room,
        day: dayLabel,
        minutesUntil: totalMinutes
      };
    }
  }

  return null; // No classes found in schedule
}

export default function ClassCountdown({ schedule }: Props) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);

  useEffect(() => {
    if (!schedule.length) {
      setNextClass(null);
      return;
    }

    const update = () => {
      const result = computeNextClass(schedule);
      setNextClass(result);
      if (result) {
        setTimeLeft(result.minutesUntil);
      }
    };

    update();

    const interval = setInterval(() => {
      // Recompute full data every 30 seconds to handle day changes
      const result = computeNextClass(schedule);
      setNextClass(result);
      if (result) {
        setTimeLeft(result.minutesUntil);
      }
    }, 30000);

    // Update the display every second for live countdown feel
    const tick = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1 / 60));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [schedule]);

  if (!nextClass || timeLeft <= 0) {
    return null;
  }

  const hours = Math.floor(timeLeft / 60);
  const mins = Math.floor(timeLeft % 60);
  const secs = Math.round((timeLeft % 1) * 60);

  return (
    <div className="class-countdown">
      <div className="countdown-ring">
        <div className="countdown-time">
          <span className="countdown-digits">
            {hours}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className="countdown-label">until next class</span>
        </div>
      </div>

      <div className="countdown-info">
        <div className="countdown-subject">{nextClass.subject}</div>
        <div className="countdown-meta">
          <span>{nextClass.day}</span>
          <span>•</span>
          <span>{nextClass.time}</span>
          <span>•</span>
          <span>{nextClass.room}</span>
        </div>
      </div>
    </div>
  );
}