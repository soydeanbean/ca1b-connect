// d:\ca1b\src\hooks\useDashboard.ts
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

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

const DEFAULT_STATS: Stats = {
  students: 0,
  attendance: 0,
  assignments: 0,
  announcements: 0
};

export function useDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch global class data
      const classSnap = await getDoc(doc(db, "classCA1B", "data"));

      if (classSnap.exists()) {
        const classData = classSnap.data();
        setSchedule(classData.schedule || []);
        setStats(classData.stats || DEFAULT_STATS);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  return { stats, schedule, loading };
}