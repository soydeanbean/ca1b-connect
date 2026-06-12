import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />

        <main className="app-content">
          <Routes>
            {/* TEMP PAGES (replace later with real ones) */}
            <Route path="/" element={<h1>Dashboard</h1>} />
            <Route path="/attendance" element={<h1>Attendance</h1>} />
            <Route path="/students" element={<h1>Students</h1>} />
            <Route path="/calendar" element={<h1>Calendar</h1>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;