// src/App.tsx

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";
import "./components/common/QoL.css";

import Dashboard from "./pages/dashboard/Dashboard";
import Subjects from "./pages/subjects/Subjects";
import Students from "./pages/students/Students";
import CalendarPage from "./pages/calendar/CalendarPage";
import Profile from "./pages/profile/Profile";
import QRAttendance from "./pages/qr/QRAttendance";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Landing from "./pages/landing/Landing";
import Announcements from "./pages/announcements/Announcements";
import SubjectAnnouncements from "./pages/announcements/SubjectAnnouncements";
import SubjectActivities from "./pages/activities/SubjectActivities";
import Analytics from "./pages/analytics/Analytics";
import Settings from "./pages/settings/Settings";
import AI from "./pages/ai/AI";
import ClassroomAdmin from "./pages/classroom/ClassroomAdmin";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import { useAuth } from "./hooks/useAuth";
import { NotificationProvider } from "./context/NotificationContext";

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f0f",
          color: "white"
        }}
      >
        Loading CA1B Connect...
      </div>
    );
  }

  return (
    <Routes>
      {/* PUBLIC LANDING PAGE */}
      <Route path="/" element={<Landing />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* QR Attendance - special endpoint, no nav */}
      <Route
        path="/qr-attendance"
        element={
          <ProtectedRoute>
            <QRAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <NotificationProvider>
              <div className="app-shell">
                <Navbar />

                <main className="app-content">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/subjects" element={<Subjects />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/announcements" element={<Announcements />} />
                    <Route path="/subject-announcements" element={<SubjectAnnouncements />} />
                    <Route path="/subject-activities" element={<SubjectActivities />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/ai" element={<AI />} />
                    <Route path="/classroom-sync" element={<ClassroomAdmin />} />
                  </Routes>
                </main>
              </div>
            </NotificationProvider>
          </ProtectedRoute>
        }
      />

      {/* Legacy redirects */}
      <Route path="/attendance" element={<ProtectedRoute><NotificationProvider><Subjects /></NotificationProvider></ProtectedRoute>} />
      <Route path="/activities" element={<ProtectedRoute><NotificationProvider><Subjects /></NotificationProvider></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}