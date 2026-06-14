// src/App.tsx

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";

import Dashboard from "./pages/dashboard/Dashboard";
import Attendance from "./pages/attendance/Attendance";
import Activities from "./pages/activities/Activities";
import Students from "./pages/students/Students";
import CalendarPage from "./pages/calendar/CalendarPage";
import Profile from "./pages/profile/Profile";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Landing from "./pages/landing/Landing";
import Announcements from "./pages/announcements/Announcements";

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
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/activities" element={<Activities />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/announcements" element={<Announcements />} />
                  </Routes>
                </main>
              </div>
            </NotificationProvider>
          </ProtectedRoute>
        }
      />
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