// src/services/excelExportService.ts
import * as XLSX from "xlsx";
import type { AttendanceSession, SessionAttendanceRecord } from "../types/Subject";

const SESSION_STATUS_LABELS: Record<string, string> = {
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

export function exportSubjectAttendanceExcel(
  subjectCode: string,
  subjectName: string,
  session: AttendanceSession,
  records: SessionAttendanceRecord[]
) {
  const dateLabel = formatDateLabel(session.date);
  const summary = session.summary;
  const attendanceRate = summary.total > 0
    ? Math.round(((summary.present + summary.late + summary.excused) / summary.total) * 100)
    : 0;

  // Build data sorted by student number
  const sortedRecords = [...records].sort((a, b) =>
    (parseInt(a.number) || 999) - (parseInt(b.number) || 999) || a.name.localeCompare(b.name)
  );

  // Title rows
  const titleRows = [
    ["CA1B CONNECT - ATTENDANCE REPORT"],
    [],
    [`Subject: ${subjectCode} - ${subjectName}`],
    [`Date: ${dateLabel}`],
    [`Generated: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`],
    []
  ];

  // Summary section
  const summaryRows = [
    ["ATTENDANCE SUMMARY"],
    ["Category", "Count"],
    ["Total Students", summary.total],
    ["Present", summary.present],
    ["Late", summary.late],
    ["Absent", summary.absent],
    ["Excused", summary.excused],
    ["Attendance Rate", `${attendanceRate}%`],
    []
  ];

  // Headers
  const headers = ["#", "Student Number", "Student Name", "Email", "Status", "Note"];

  // Data rows with alternating colors
  const dataRows = sortedRecords.map((r, i) => [
    i + 1,
    r.number || "-",
    r.name,
    r.email,
    SESSION_STATUS_LABELS[r.status] || r.status,
    r.note || ""
  ]);

  // Totals row
  const totalsRow = ["", "", "TOTALS", "", `${summary.present} Present, ${summary.late} Late, ${summary.absent} Absent, ${summary.excused} Excused`, ""];

  const allRows = [...titleRows, ...summaryRows, [headers], ...dataRows, [], totalsRow];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Column widths
  ws["!cols"] = [
    { wch: 5 },   // #
    { wch: 14 },  // Student Number
    { wch: 32 },  // Student Name
    { wch: 36 },  // Email
    { wch: 14 },  // Status
    { wch: 24 }   // Note
  ];

  // Merge title cells
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },  // Title row
  ];

  // Set cell styles using rich text
  // Bold for title and headers
  for (let R = 0; R < allRows.length; R++) {
    for (let C = 0; C < (allRows[R] as any[]).length; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      // Bold for title rows (0), summary headers (7), data headers (10), totals
      if (R === 0 || (R >= 8 && R <= 9) || R === 11 || R === allRows.length - 1) {
        ws[cellRef].s = { font: { bold: true, sz: R === 0 ? 16 : 11 } };
      }

      // Color coding for status column
      if ((ws[cellRef].v === "Present" || ws[cellRef].v === "Late" || ws[cellRef].v === "Absent" || ws[cellRef].v === "Excused")) {
        ws[cellRef].s = {
          ...ws[cellRef].s,
          font: {
            ...(ws[cellRef].s?.font || {}),
            color: ws[cellRef].v === "Present" ? { rgb: "10B981" } :
                   ws[cellRef].v === "Late" ? { rgb: "F59E0B" } :
                   ws[cellRef].v === "Absent" ? { rgb: "EF4444" } :
                   { rgb: "8B5CF6" }
          }
        };
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `CA1B-${subjectCode}-Attendance-${session.date}.xlsx`);
}

export function exportSubjectAttendanceMultipleSessions(
  subjectCode: string,
  subjectName: string,
  sessions: AttendanceSession[]
) {
  if (sessions.length === 0) return;

  // Get all student UIDs across all sessions
  const allStudentIds = new Set<string>();
  sessions.forEach(s => Object.keys(s.records).forEach(uid => allStudentIds.add(uid)));

  // Build student data
  const studentData: Record<string, { number: string; name: string; email: string; records: Record<string, string> }> = {};
  allStudentIds.forEach(uid => {
    const firstRecord = sessions.find(s => s.records[uid])?.records[uid];
    studentData[uid] = {
      number: firstRecord?.number || "",
      name: firstRecord?.name || "Unknown",
      email: firstRecord?.email || "",
      records: {}
    };
    sessions.forEach(s => {
      studentData[uid].records[s.date] = s.records[uid]?.status || "N/A";
    });
  });

  const sortedStudents = Object.entries(studentData).sort(([, a], [, b]) =>
    (parseInt(a.number) || 999) - (parseInt(b.number) || 999) || a.name.localeCompare(b.name)
  );

  const dateHeaders = sessions.map(s => formatDateLabel(s.date));

  // Title
  const titleRow = [
    [`CA1B CONNECT - ${subjectCode} - ${subjectName} - COMPREHENSIVE ATTENDANCE REPORT`],
    [],
    [`Generated: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`],
    [`Total Sessions: ${sessions.length}`],
    []
  ];

  // Headers
  const headers = ["#", "Student Number", "Student Name", ...dateHeaders, "Present", "Late", "Absent", "Excused", "Rate"];

  const dataRows = sortedStudents.map(([, data], idx) => {
    const totalSessions = sessions.length;
    let present = 0, late = 0, absent = 0, excused = 0;
    const statuses = sessions.map(s => {
      const status = data.records[s.date];
      if (status === "present") present++;
      else if (status === "late") late++;
      else if (status === "absent") absent++;
      else if (status === "excused") excused++;
      return SESSION_STATUS_LABELS[status] || status;
    });
    const rate = totalSessions > 0 ? Math.round(((present + late + excused) / totalSessions) * 100) : 0;

    return [
      idx + 1,
      data.number || "-",
      data.name,
      ...statuses,
      present,
      late,
      absent,
      excused,
      `${rate}%`
    ];
  });

  const allRows: any[][] = [...titleRow, headers, ...dataRows];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  const colWidths = [
    { wch: 5 },
    { wch: 14 },
    { wch: 32 },
    ...dateHeaders.map(() => ({ wch: 14 })),
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 }
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");
  XLSX.writeFile(wb, `CA1B-${subjectCode}-Comprehensive-Attendance.xlsx`);
}