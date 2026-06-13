import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function seedClassData() {
  const ref = doc(db, "classCA1B", "data");
  const snap = await getDoc(ref);

  if (snap.exists()) return;

  await setDoc(ref, {
    schedule: [
      // ================= MONDAY =================
      { day: "Monday", time: "8:30 AM - 9:30 AM", subject: "Homeroom Guidance Program I", room: "HB322" },
      { day: "Monday", time: "10:00 AM - 11:00 AM", subject: "Life and Career Skills", room: "HB311" },
      { day: "Monday", time: "11:00 AM - 12:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "HB311" },
      { day: "Monday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "CSLAB4" },
      { day: "Monday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "HB311" },

      // ================= TUESDAY =================
      { day: "Tuesday", time: "8:00 AM - 9:30 AM", subject: "SHS Reading Program I", room: "D12" },
      { day: "Tuesday", time: "10:00 AM - 11:00 AM", subject: "Effective Communication", room: "HB311" },
      { day: "Tuesday", time: "11:00 AM - 12:00 PM", subject: "General Science", room: "HB311" },
      { day: "Tuesday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "CSLAB4" },
      { day: "Tuesday", time: "3:00 PM - 4:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "HB311" },
      { day: "Tuesday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "HB311" },

      // ================= WEDNESDAY =================
      { day: "Wednesday", time: "8:00 AM - 9:30 AM", subject: "Life and Career Skills", room: "HB311" },
      { day: "Wednesday", time: "10:00 AM - 11:00 AM", subject: "Mabisang Komunikasyon", room: "HB311" },
      { day: "Wednesday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "CSLAB4" },
      { day: "Wednesday", time: "3:00 PM - 4:00 PM", subject: "Introduction to Christian Faith: Foundations in a Plural and AI-Driven World", room: "HB311" },
      { day: "Wednesday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "HB311" },

      // ================= THURSDAY =================
      { day: "Thursday", time: "8:00 AM - 9:30 AM", subject: "SHS Reading Program I", room: "D12" },
      { day: "Thursday", time: "10:00 AM - 11:00 AM", subject: "Effective Communication", room: "HB311" },
      { day: "Thursday", time: "1:00 PM - 3:00 PM", subject: "Computer Systems Servicing", room: "CSLAB4" },
      { day: "Thursday", time: "3:00 PM - 4:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "HB311" },
      { day: "Thursday", time: "4:00 PM - 5:00 PM", subject: "General Mathematics", room: "HB311" },

      // ================= FRIDAY =================
      { day: "Friday", time: "8:00 AM - 9:30 AM", subject: "Life and Career Skills", room: "HB311" },
      { day: "Friday", time: "10:00 AM - 11:00 AM", subject: "Mabisang Komunikasyon", room: "HB311" },
      { day: "Friday", time: "11:00 AM - 12:00 PM", subject: "General Science", room: "HB311" },
      { day: "Friday", time: "1:00 PM - 2:00 PM", subject: "Introduction to Christian Faith: Foundations in a Plural and AI-Driven World", room: "HB311" },
      { day: "Friday", time: "2:00 PM - 3:00 PM", subject: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", room: "HB311" }
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