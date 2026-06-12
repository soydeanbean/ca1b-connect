import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

type Stats = {
  students: number;
  attendance: number;
  assignments: number;
  announcements: number;
};

type ScheduleItem = {
  time: string;
  subject: string;
  room: string;
  status: "done" | "ongoing" | "upcoming";
};

export function useDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setStats(data.stats);
        setSchedule(data.schedule || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return { stats, schedule, loading };
}