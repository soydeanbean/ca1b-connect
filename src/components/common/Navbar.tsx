import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

import ca1b_logo from "../../assets/logos/ca1b.png";
import defaultProfile from "../../assets/logos/ca1b.png";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <img src={ca1b_logo} alt="CA1B Logo" />

          <div className="logo-text">
            <h3>CA1B Connect</h3>
            <span>Creativity is Society's Cab</span>
          </div>
        </Link>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search dashboard, activities, events..."
          />
        </div>

        <nav className={`nav-links ${menuOpen ? "active" : ""}`}>
          <Link to="/">Dashboard</Link>
          <Link to="/attendance">Attendance</Link>
          <Link to="/students">Students</Link>
          <Link to="/calendar">Calendar</Link>
        </nav>

        <div className="navbar-right">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <div
            className="profile-wrapper"
            ref={profileRef}
          >
            <button
              className="profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <img
                src={defaultProfile}
                alt="Profile"
              />
            </button>

            <div
              className={`profile-dropdown ${
                profileOpen ? "show" : ""
              }`}
            >
              <Link to="/profile">👤 Profile</Link>
              <Link to="/dashboard">📊 My Dashboard</Link>
              <Link to="/settings">⚙️ Settings</Link>

              <hr />

              <button>🚪 Logout</button>
            </div>
          </div>

          <button
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}