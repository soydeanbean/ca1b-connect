// src/data/ScheduleData.ts
import type { DayOfWeek } from "../types/Subject";

import HomeroomBg from "../assets/backgrounds/HomeroomBackground.png";
import CommunicationsBg from "../assets/backgrounds/CommunicationsBackground.png";
import KomunikasyonBg from "../assets/backgrounds/KomunikasyonBackground.png";
import CareerBg from "../assets/backgrounds/CareerBackground.png";
import HistoryBg from "../assets/backgrounds/HistoryBackground.png";
import MathematicsBg from "../assets/backgrounds/MathematicsBackground.png";
import ScienceBg from "../assets/backgrounds/ScienceBackground.png";
import CTEBg from "../assets/backgrounds/CTEBackground.png";
import FaithBg from "../assets/backgrounds/FaithBackground.png";
import ReadingBg from "../assets/backgrounds/ReadingBackground.png";

export interface ScheduleEntry {
  time: string;
  subjectCode: string;
  subjectName: string;
  room: string;
}

const SCHEDULE: Record<DayOfWeek, ScheduleEntry[]> = {
  Monday: [
    { time: "08:00–08:30", subjectCode: "ASSEMBLY", subjectName: "Assembly", room: "Auditorium" },
    { time: "08:30–10:00", subjectCode: "SRPS001", subjectName: "SHS Reading Program I", room: "D214" },
    { time: "10:00–11:00", subjectCode: "CORS003", subjectName: "Life and Career Skills", room: "HB311" },
    { time: "11:00–12:00", subjectCode: "CORS004", subjectName: "Pag-aaral ng Kasaysayan at Lipunang Pilipino (PKLP)", room: "HB311" },
    { time: "13:00–15:00", subjectCode: "CTES004", subjectName: "Computer Systems Servicing", room: "D416 / CSLAB3" },
    { time: "15:00–16:00", subjectCode: "FLPS001", subjectName: "Introduction to Christian Faith", room: "HB311" },
    { time: "16:00–17:00", subjectCode: "CORS005", subjectName: "General Mathematics", room: "HB311" },
    { time: "17:00–17:10", subjectCode: "EXAMEN", subjectName: "Examen", room: "HB311" }
  ],
  Tuesday: [
    { time: "08:00–09:30", subjectCode: "SRPS001", subjectName: "SHS Reading Program I", room: "D214" },
    { time: "10:00–11:00", subjectCode: "CORS001", subjectName: "Effective Communication", room: "HB311" },
    { time: "11:00–12:00", subjectCode: "CORS006", subjectName: "General Science", room: "HB311" },
    { time: "13:00–15:00", subjectCode: "CTES004", subjectName: "Computer Systems Servicing", room: "D416 / CSLAB3" },
    { time: "15:00–16:00", subjectCode: "CORS004", subjectName: "Pag-aaral ng Kasaysayan at Lipunang Pilipino (PKLP)", room: "HB311" },
    { time: "16:00–17:00", subjectCode: "CORS005", subjectName: "General Mathematics", room: "HB311" },
    { time: "17:00–17:10", subjectCode: "EXAMEN", subjectName: "Examen", room: "HB311" }
  ],
  Wednesday: [
    { time: "08:00–09:30", subjectCode: "CORS003", subjectName: "Life and Career Skills", room: "HB311" },
    { time: "10:00–11:00", subjectCode: "CORS002", subjectName: "Mabisang Komunikasyon", room: "HB311" },
    { time: "11:00–12:00", subjectCode: "CORS006", subjectName: "General Science", room: "HB311" },
    { time: "13:00–15:00", subjectCode: "CTES004", subjectName: "Computer Systems Servicing", room: "D416 / CSLAB3" },
    { time: "15:00–16:00", subjectCode: "FLPS001", subjectName: "Introduction to Christian Faith", room: "HB311" },
    { time: "16:00–17:00", subjectCode: "CORS005", subjectName: "General Mathematics", room: "HB311" },
    { time: "17:00–17:10", subjectCode: "EXAMEN", subjectName: "Examen", room: "HB311" }
  ],
  Thursday: [
    { time: "08:00–09:00", subjectCode: "CORS004", subjectName: "Pag-aaral ng Kasaysayan at Lipunang Pilipino (PKLP)", room: "HB311" },
    { time: "10:00–11:00", subjectCode: "CORS001", subjectName: "Effective Communication", room: "HB311" },
    { time: "11:00–12:00", subjectCode: "CORS006", subjectName: "General Science", room: "HB311" },
    { time: "13:00–15:00", subjectCode: "CTES004", subjectName: "Computer Systems Servicing", room: "D416 / CSLAB3" },
    { time: "16:00–17:00", subjectCode: "CORS005", subjectName: "General Mathematics", room: "HB311" },
    { time: "17:00–17:10", subjectCode: "EXAMEN", subjectName: "Examen", room: "HB311" }
  ],
  Friday: [
    { time: "08:00–09:30", subjectCode: "CORS003", subjectName: "Life and Career Skills", room: "HB311" },
    { time: "10:00–11:00", subjectCode: "CORS002", subjectName: "Mabisang Komunikasyon", room: "HB311" },
    { time: "11:00–12:00", subjectCode: "CORS006", subjectName: "General Science", room: "HB311" },
    { time: "14:00–15:00", subjectCode: "FLPS001", subjectName: "Introduction to Christian Faith", room: "HB311" },
    { time: "15:00–16:00", subjectCode: "CORS004", subjectName: "Pag-aaral ng Kasaysayan at Lipunang Pilipino (PKLP)", room: "HB311" },
    { time: "16:00–17:00", subjectCode: "HRGP001", subjectName: "Homeroom Guidance Program I", room: "HB322" }
  ]
};

export const SUBJECTS = [
  { code: "HRGP001", name: "Homeroom Guidance Program I", room: "HB322", backgroundImage: HomeroomBg },
  { code: "CORS001", name: "Effective Communication", room: "HB311", backgroundImage: CommunicationsBg },
  { code: "CORS002", name: "Mabisang Komunikasyon", room: "HB311", backgroundImage: KomunikasyonBg },
  { code: "CORS003", name: "Life and Career Skills", room: "HB311", backgroundImage: CareerBg },
  { code: "CORS004", name: "Pag-aaral ng Kasaysayan at Lipunang Pilipino (PKLP)", room: "HB311", backgroundImage: HistoryBg },
  { code: "CORS005", name: "General Mathematics", room: "HB311", backgroundImage: MathematicsBg },
  { code: "CORS006", name: "General Science", room: "HB311", backgroundImage: ScienceBg },
  { code: "CTES004", name: "Computer Systems Servicing", room: "D416 / CSLAB3", backgroundImage: CTEBg },
  { code: "FLPS001", name: "Introduction to Christian Faith: Foundations in a Plural and AI-Driven World", room: "HB311", backgroundImage: FaithBg },
  { code: "SRPS001", name: "SHS Reading Program I", room: "D214", backgroundImage: ReadingBg }
];

export function getTodaySchedule(): ScheduleEntry[] {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }) as DayOfWeek;
  return SCHEDULE[today] || [];
}

export function getDaySchedule(day: DayOfWeek): ScheduleEntry[] {
  return SCHEDULE[day] || [];
}

export function getAllSchedules(): Record<DayOfWeek, ScheduleEntry[]> {
  return { ...SCHEDULE };
}

export function getSubjectSchedule(subjectCode: string): { day: DayOfWeek; entry: ScheduleEntry }[] {
  const results: { day: DayOfWeek; entry: ScheduleEntry }[] = [];
  for (const [day, entries] of Object.entries(SCHEDULE)) {
    for (const entry of entries) {
      if (entry.subjectCode === subjectCode) {
        results.push({ day: day as DayOfWeek, entry });
      }
    }
  }
  return results.sort((a, b) => {
    const dayOrder: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
    return (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
  });
}

export function isSubjectScheduledToday(subjectCode: string): boolean {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }) as DayOfWeek;
  return SCHEDULE[today]?.some(e => e.subjectCode === subjectCode) ?? false;
}