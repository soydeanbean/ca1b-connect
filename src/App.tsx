// src/App.tsx

import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";

import Dashboard from "./pages/dashboard/Dashboard";
import Attendance from "./pages/attendance/Attendance";
import Activities from "./pages/activities/Activities";
import Students from "./pages/students/Students";
import CalendarPage from "./pages/calendar/CalendarPage";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import Todos from "./pages/todos/Todos";
import PriorityInbox from "./pages/priority/PriorityInbox";
import Chat from "./pages/chat/Chat";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import { useAuth } from "./hooks/useAuth";
import { NotificationProvider } from "./context/NotificationContext";
import { startPresence } from "./services/presenceService";

function AppRoutes() {
  const { user, loading } = useAuth();

  // Start presence heartbeat when user is logged in
  useEffect(() => {
    if (!user) return;
    const cleanup = startPresence(user.uid);
    return cleanup;
  }, [user]);

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
            <NotificationProvider uid={user?.uid || null}>
              <div className="app-shell">
                <Navbar />

                <main className="app-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/activities" element={<Activities />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/todos" element={<Todos />} />
                    <Route path="/priority" element={<PriorityInbox />} />
                    <Route path="/chat" element={<Chat />} />
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

//so i want u to update my website and add the things i will say, first is gonna be the notifications feature, where if there are new added global activity or event it notify everyone, next is add class countdown timer, and add a personal to do list that can be synced with assignments automatically and like there are a personal to do section where u can add ur to do list to be organized and it can be scheduled too, and there will be 2 notification type, major and minor major is just basically when sent to all student like events, assignments etc.. minor are just when the one in ur to do list needs to be done, and add settings section/feature now, just put there what u prefer for settings such as the notification if it should show up etc..., u should also add an ai feature, there will be a little floating icon that is draggable and clickable, if clicked it will focus on a pop up menu where u can chat with ai asking things about the website and stuffs like assignments, events, etc..., and there should also be a priority inbox wherein there its organized like due today, overdue, upcoming, etc.., and make the active status work wherein if the student is interacting with the website its gonna say in their profile that they are online, else if not then not online, and make it so students can chat each other or send each other texts, and there are a general group chat where everybody in the class is in it, to avoid getting too much chats, once the chat exceed 100 or more chat it should start deleting the ones that are in the past and there should also be a feature about pinning chats just like in messenger, no file input or image input for now, just pure chat and emojis., and there should be an idea like streaks, and it should be mobile first layout, and should be a PWA or progressive web app, the website should also include a loading screen fitting the theme, just make it the logo spinning and like dots loading, and change up the log in  menu and register menu to make it look better, it should also show the ca1b logo aswell as make it look better for mobile too, and after logging in, it should first go in the landing page where there are infos about the website and class and ive inputted 3 images, 2 in the images folder and 1 in the logos folder, those 2 images from images folder are the class's students group picture, include it in the landing page and as for the logo, it is an adnu logo basically saying that the class is at adnu, it can be in the footer i think and should also include links for ateneo de naga university, then there will be a button in the very bottom saying proceed to dashboard, and it should have good animations and transitions for like scrolling and stuff, another thing to add is offline friendly caching,and the ai feature should revolve around the class website and the things on class but can be used for searching stuffs aswell, just use a free one for it and tell me what else i need to do after u make the whole systems, and while in the ai focus menu when user click outside of it, it stops focusing and animates out, it should all fit my website theme and should look modern and good.
