// src/hooks/useAttendance.ts

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  canManageAttendance,
  createAttendanceDay,
  deleteAttendanceDay,
  getAttendanceDay,
  getSavedAttendanceDates,
  getTodayDateId,
  updateAttendanceRecord
} from "../services/attendanceService";
import { getUserProfile } from "../services/profileService";
import type {
  AttendanceDay,
  AttendanceRecord,
  AttendanceStatus
} from "../types/Attendance";
import type { UserProfile } from "../types/Profile";

export function useAttendance(uid?: string) {
  const todayDate = useMemo(() => getTodayDateId(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [attendance, setAttendance] = useState<AttendanceDay | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEdit = canManageAttendance(profile);

  const records = useMemo<AttendanceRecord[]>(() => {
    if (!attendance) return [];

    return Object.values(attendance.records).sort((a, b) => {
      const numberA = Number(a.number || 9999);
      const numberB = Number(b.number || 9999);

      if (numberA !== numberB) return numberA - numberB;
      return a.name.localeCompare(b.name);
    });
  }, [attendance]);

  const loadAttendance = useCallback(async (date: string) => {
    setError("");

    try {
      const day = await getAttendanceDay(date);
      setAttendance(day);
    } catch (loadError) {
      console.error("Attendance load failed:", loadError);
      setError("Could not load attendance for this date.");
    }
  }, []);

  const refreshDates = useCallback(async () => {
    const savedDates = await getSavedAttendanceDates();
    setDates(savedDates);
    return savedDates;
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const currentProfile = await getUserProfile(uid);
        setProfile(currentProfile);

        const savedDates = await getSavedAttendanceDates();
        setDates(savedDates);

        const firstDate = savedDates[0] || todayDate;
        setSelectedDate(firstDate);

        const day = await getAttendanceDay(firstDate);
        setAttendance(day);
      } catch (initError) {
        console.error("Attendance init failed:", initError);
        setError("Could not load attendance.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [uid, todayDate]);

  useEffect(() => {
    if (!uid || loading) return;
    loadAttendance(selectedDate);
  }, [uid, loading, selectedDate, loadAttendance]);

  const createToday = useCallback(async () => {
    if (!uid || !canEdit) return;

    setSaving(true);
    setError("");

    try {
      const day = await createAttendanceDay(todayDate, uid);
      const savedDates = await refreshDates();

      setDates(savedDates.includes(todayDate) ? savedDates : [todayDate, ...savedDates]);
      setSelectedDate(todayDate);
      setAttendance(day);
    } catch (createError) {
      console.error("Create attendance failed:", createError);
      setError("Could not create today's attendance.");
    } finally {
      setSaving(false);
    }
  }, [uid, canEdit, todayDate, refreshDates]);

  const updateRecord = useCallback(
    async (studentUid: string, status: AttendanceStatus, note = "") => {
      if (!uid || !canEdit || !attendance) return;

      setSaving(true);
      setError("");

      try {
        await updateAttendanceRecord(attendance.date, studentUid, {
          status,
          note,
          updatedBy: uid
        });

        await loadAttendance(attendance.date);
      } catch (updateError) {
        console.error("Update attendance failed:", updateError);
        setError("Could not update attendance.");
      } finally {
        setSaving(false);
      }
    },
    [uid, canEdit, attendance, loadAttendance]
  );

  const deleteSelectedDay = useCallback(async () => {
    if (!canEdit || !attendance) return;

    setSaving(true);
    setError("");

    try {
      await deleteAttendanceDay(attendance.date);

      const savedDates = await refreshDates();
      const nextDate = savedDates.filter((date) => date !== attendance.date)[0] || todayDate;

      setSelectedDate(nextDate);
      setAttendance(savedDates.length ? await getAttendanceDay(nextDate) : null);
    } catch (deleteError) {
      console.error("Delete attendance failed:", deleteError);
      setError("Could not delete this attendance day.");
    } finally {
      setSaving(false);
    }
  }, [canEdit, attendance, refreshDates, todayDate]);

  return {
    profile,
    canEdit,
    dates,
    selectedDate,
    setSelectedDate,
    attendance,
    records,
    loading,
    saving,
    error,
    todayDate,
    createToday,
    updateRecord,
    deleteSelectedDay
  };
}