// src/pages/qr/QRAttendance.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getSession, recordLateScan, getTodayDateId, getSubjectInfo } from "../../services/subjectService";
import "./QRAttendance.css";

export default function QRAttendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<"validating" | "valid" | "error" | "success" | "already">("validating");
  const [message, setMessage] = useState("Validating attendance scan...");
  const [subjectName, setSubjectName] = useState("");

  const subjectCode = searchParams.get("subject");
  const date = searchParams.get("date");

  useEffect(() => {
    // This page should NOT be accessible via direct navigation
    // It only works if accessed through QR code scan
    const processScan = async () => {
      try {
        // Validate params
        if (!subjectCode || !date) {
          setStatus("error");
          setMessage("Invalid QR code. Missing subject or date information.");
          return;
        }

        const todayDate = getTodayDateId();
        if (date !== todayDate) {
          setStatus("error");
          setMessage("This QR code is for a different date. Please scan today's QR code.");
          return;
        }

        // Check if user is authenticated
        if (!user) {
          setStatus("error");
          setMessage("You must be logged in to scan attendance. Please login with your Google account first.");
          return;
        }

        // Get subject info
        const subjectInfo = getSubjectInfo(subjectCode);
        if (!subjectInfo) {
          setStatus("error");
          setMessage("Invalid subject code.");
          return;
        }
        setSubjectName(subjectInfo.name);

        // Check if session exists
        const session = await getSession(subjectCode, date);
        if (!session) {
          setStatus("error");
          setMessage("No attendance session found for this subject today. Please see your teacher.");
          return;
        }

        // Check if user is in this session
        const record = session.records[user.uid];
        if (!record) {
          setStatus("error");
          setMessage("You are not registered in this class session.");
          return;
        }

        // Check if already marked late
        if (record.status === "late") {
          setStatus("already");
          setMessage("Late attendance was already recorded for you today.");
          return;
        }

        // If already present, mark as late
        if (record.status === "present") {
          // Process the late scan
          await recordLateScan(subjectCode, date, user.uid);

          // Verify it worked
          const updatedSession = await getSession(subjectCode, date);
          const updatedRecord = updatedSession?.records[user.uid];

          if (updatedRecord?.status === "late") {
            setStatus("success");
            setMessage("Late attendance successfully recorded.");
          } else {
            setStatus("error");
            setMessage("Could not record late attendance. Please try again.");
          }
          return;
        }

        // If absent or excused, mark as late
        await recordLateScan(subjectCode, date, user.uid);
        setStatus("success");
        setMessage("Late attendance successfully recorded.");
      } catch (error) {
        console.error("QR attendance error:", error);
        setStatus("error");
        setMessage("An error occurred. Please try scanning again.");
      }
    };

    processScan();
  }, [user, subjectCode, date]);

  const handleGoToSubjects = () => {
    navigate("/subjects");
  };

  return (
    <div className="qr-attendance-page">
      <div className={`qr-attendance-card ${status}`}>
        <div className="qr-icon">
          {status === "validating" && "⏳"}
          {status === "success" && "✅"}
          {status === "already" && "ℹ️"}
          {status === "error" && "❌"}
          {status === "valid" && "📱"}
        </div>

        <h2>
          {status === "success" && "Attendance Recorded!"}
          {status === "already" && "Already Recorded"}
          {status === "error" && "Scan Failed"}
          {status === "validating" && "Processing..."}
          {status === "valid" && "Valid QR Code"}
        </h2>

        <div className="qr-message">{message}</div>

        {subjectName && (
          <div className="qr-attendance-details">
            <p><strong>Subject:</strong> {subjectCode} - {subjectName}</p>
            <p><strong>Date:</strong> {date}</p>
            <p><strong>Status:</strong> Late</p>
          </div>
        )}

        <button className="qr-go-button" onClick={handleGoToSubjects}>
          Go to Subjects
        </button>
      </div>
    </div>
  );
}