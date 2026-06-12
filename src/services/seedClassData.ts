import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function seedClassData() {
  const ref = doc(db, "classCA1B", "data");
  const snap = await getDoc(ref);

  if (snap.exists()) return;

  await setDoc(ref, {
    schedule: [
      // ================= MONDAY =================
      { day: "Monday", time: "8:30 AM - 9:30 AM", subject: "Homeroom Guidance Program I", room: "Room 101", status: "upcoming" },
      { day: "Monday", time: "10:00 AM - 11:00 AM", subject: "Life and Career Skills", room: "Room 101", status: "upcoming" },
      { day: "Monday", time: "11:00 AM - 12:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "Room 101", status: "upcoming" },
      { day: "Monday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "Lab 1", status: "upcoming" },
      { day: "Monday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "Room 101", status: "upcoming" },

      // ================= TUESDAY =================
      { day: "Tuesday", time: "8:00 AM - 9:30 AM", subject: "SHS Reading Program I", room: "Room 101", status: "upcoming" },
      { day: "Tuesday", time: "10:00 AM - 11:00 AM", subject: "Effective Communication", room: "Room 101", status: "upcoming" },
      { day: "Tuesday", time: "11:00 AM - 12:00 PM", subject: "General Science", room: "Room 101", status: "upcoming" },
      { day: "Tuesday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "Lab 1", status: "upcoming" },
      { day: "Tuesday", time: "3:00 PM - 4:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "Room 101", status: "upcoming" },
      { day: "Tuesday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "Room 101", status: "upcoming" },

      // ================= WEDNESDAY =================
      { day: "Wednesday", time: "8:00 AM - 9:30 AM", subject: "Life and Career Skills", room: "Room 101", status: "upcoming" },
      { day: "Wednesday", time: "10:00 AM - 11:00 AM", subject: "Mabisang Komunikasyon", room: "Room 101", status: "upcoming" },
      { day: "Wednesday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "Lab 1", status: "upcoming" },
      { day: "Wednesday", time: "3:00 PM - 4:00 PM", subject: "Introduction to Christian Faith: Foundations in a Plural and AI-Driven World", room: "Room 101", status: "upcoming" },
      { day: "Wednesday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "Room 101", status: "upcoming" },

      // ================= THURSDAY =================
      { day: "Thursday", time: "8:00 AM - 9:30 AM", subject: "SHS Reading Program I", room: "Room 101", status: "upcoming" },
      { day: "Thursday", time: "10:00 AM - 11:00 AM", subject: "Effective Communication", room: "Room 101", status: "upcoming" },
      { day: "Thursday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "Lab 1", status: "upcoming" },
      { day: "Thursday", time: "3:00 PM - 4:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "Room 101", status: "upcoming" },
      { day: "Thursday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "Room 101", status: "upcoming" },

      // ================= FRIDAY =================
      { day: "Friday", time: "8:00 AM - 9:30 AM", subject: "Life and Career Skills", room: "Room 101", status: "upcoming" },
      { day: "Friday", time: "10:00 AM - 11:00 AM", subject: "Mabisang Komunikasyon", room: "Room 101", status: "upcoming" },
      { day: "Friday", time: "11:00 AM - 12:00 PM", subject: "General Science", room: "Room 101", status: "upcoming" },
      { day: "Friday", time: "1:00 PM - 2:00 PM", subject: "Introduction to Christian Faith: Foundations in a Plural and AI-Driven World", room: "Room 101", status: "upcoming" },
      { day: "Friday", time: "2:00 PM - 3:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "Room 101", status: "upcoming" }
    ],

    events: [
      {
        date: "2026-06-18",
        title: "CA1B General Assembly",
        description: "First class-wide meeting and orientation."
      },
      {
        date: "2026-07-10",
        title: "Project Submission Day",
        description: "Submission of first major output."
      }
    ],

    studentsCount: 0
  });
}