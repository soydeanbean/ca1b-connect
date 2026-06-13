// src/pages/attendance/Attendance.tsx

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

import { useAuth } from "../../hooks/useAuth";
import { useAttendance } from "../../hooks/useAttendance";
import type { AttendanceRecord, AttendanceStatus } from "../../types/Attendance";

import "./Attendance.css";

const STATUS_OPTIONS: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused"
];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused"
};

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function exportAttendanceExcel(
  date: string,
  records: AttendanceRecord[],
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
  }
) {
  const rows = [
    ["CA1B Attendance"],
    [`Date: ${formatDateLabel(date)}`],
    [],
    ["Summary"],
    ["Total", summary.total],
    ["Present", summary.present],
    ["Late", summary.late],
    ["Absent", summary.absent],
    ["Excused", summary.excused],
    [],
    ["No.", "Student Name", "Email", "Status", "Excuse Note"],
    ...records.map((record) => [
      record.number || "-",
      record.name,
      record.email,
      STATUS_LABELS[record.status],
      record.note || ""
    ])
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 34 },
    { wch: 14 },
    { wch: 34 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
  XLSX.writeFile(workbook, `CA1B-Attendance-${date}.xlsx`);
}

export default function Attendance() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const {
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
  } = useAttendance(user?.uid);

  const summary = useMemo(
    () =>
      attendance?.summary || {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0
      },
    [attendance]
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return records;

    return records.filter((record) =>
      `${record.name} ${record.email} ${record.number}`
        .toLowerCase()
        .includes(query)
    );
  }, [records, search]);

  const handleDeleteDay = () => {
    if (!attendance) return;

    const confirmed = window.confirm(
      `Delete attendance for ${formatDateLabel(attendance.date)}? This cannot be undone.`
    );

    if (confirmed) {
      deleteSelectedDay();
    }
  };

  if (loading) {
    return <div className="attendance-page">Loading attendance...</div>;
  }

  return (
    <div className="attendance-page">
      <section className="attendance-hero">
        <div>
          <span className="attendance-eyebrow">Class attendance</span>
          <h1>Attendance</h1>
          <p>
            View, search, export, and manage saved CA1B attendance records.
          </p>
        </div>

        <div className="attendance-actions">
          <label>
            <span>Date</span>
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              disabled={dates.length === 0}
            >
              {dates.length === 0 ? (
                <option value={todayDate}>No saved attendance yet</option>
              ) : (
                dates.map((date) => (
                  <option key={date} value={date}>
                    {formatDateLabel(date)}
                  </option>
                ))
              )}
            </select>
          </label>

          {attendance && (
            <button
              type="button"
              onClick={() => exportAttendanceExcel(attendance.date, records, summary)}
            >
              Download Excel
            </button>
          )}

          {canEdit && (
            <button type="button" onClick={createToday} disabled={saving}>
              {saving ? "Saving..." : "Create today"}
            </button>
          )}

          {canEdit && attendance && (
            <button
              type="button"
              className="danger-action"
              onClick={handleDeleteDay}
              disabled={saving}
            >
              Delete day
            </button>
          )}
        </div>
      </section>

      {error && <div className="attendance-alert">{error}</div>}

      <section className="attendance-summary">
        <div className="attendance-stat">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="attendance-stat present">
          <span>Present</span>
          <strong>{summary.present}</strong>
        </div>
        <div className="attendance-stat late">
          <span>Late</span>
          <strong>{summary.late}</strong>
        </div>
        <div className="attendance-stat absent">
          <span>Absent</span>
          <strong>{summary.absent}</strong>
        </div>
        <div className="attendance-stat excused">
          <span>Excused</span>
          <strong>{summary.excused}</strong>
        </div>
      </section>

      <section className="attendance-panel">
        <div className="attendance-panel-header">
          <div>
            <h2>{attendance ? formatDateLabel(attendance.date) : "No record"}</h2>
            <p>
              {canEdit
                ? "Update each student as present, late, absent, or excused."
                : "You can view attendance records, but editing is locked."}
            </p>
          </div>

          <span className={canEdit ? "edit-badge unlocked" : "edit-badge"}>
            {canEdit ? "Editor access" : "View only"}
          </span>
        </div>

        {attendance && (
          <div className="attendance-tools">
            <label>
              <span>Search students</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type a name, email, or number"
              />
            </label>

            <p>
              Showing {filteredRecords.length} of {records.length}
            </p>
          </div>
        )}

        {!attendance ? (
          <div className="attendance-empty">
            <h3>No attendance saved for this date</h3>
            <p>
              {canEdit
                ? "Create today's attendance to start tracking the class."
                : "Attendance will appear here after the beadle or teacher creates it."}
            </p>
          </div>
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Number</th>
                  <th>Status</th>
                  <th>Excuse note</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.uid}
                    className={record.uid === user?.uid ? "current-user" : ""}
                  >
                    <td>
                      <strong>{record.name}</strong>
                      <span>{record.email}</span>
                    </td>

                    <td>{record.number || "-"}</td>

                    <td>
                      <select
                        value={record.status}
                        disabled={!canEdit || saving}
                        className={`status-select ${record.status}`}
                        onChange={(event) => {
                          const nextStatus = event.target.value as AttendanceStatus;

                          updateRecord(
                            record.uid,
                            nextStatus,
                            nextStatus === "excused" ? record.note : ""
                          );
                        }}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        key={`${record.uid}-${record.status}-${record.note}`}
                        type="text"
                        defaultValue={record.note}
                        placeholder={
                          record.status === "excused"
                            ? "Approved by teacher"
                            : "Only for excused"
                        }
                        disabled={!canEdit || saving || record.status !== "excused"}
                        onBlur={(event) => {
                          if (record.status !== "excused") return;
                          if (event.target.value === record.note) return;

                          updateRecord(record.uid, "excused", event.target.value);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}