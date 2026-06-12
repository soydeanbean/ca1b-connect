import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../services/authService";
import "./Navbar.css";

import ca1b_logo from "../../assets/logos/ca1b.png";
import defaultProfile from "../../assets/logos/ca1b.png";

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 🌙 DARK MODE
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  // ❌ CLOSE PROFILE ON OUTSIDE CLICK
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

  // ❌ CLOSE MODAL ON OUTSIDE CLICK
  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () =>
      document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 🔥 LOGOUT
  const handleLogout = async () => {
    await logoutUser();
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">

          {/* LOGO */}
          <Link to="/" className="logo">
            <img src={ca1b_logo} alt="CA1B Logo" />
            <div className="logo-text">
              <h3>CA1B Connect</h3>
              <span>Creativity is Society's Cab</span>
            </div>
          </Link>

          {/* SEARCH */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search dashboard, activities, events..."
            />
          </div>

          {/* NAV */}
          <nav className={`nav-links ${menuOpen ? "active" : ""}`}>
            <Link to="/">Dashboard</Link>
            <Link to="/attendance">Attendance</Link>
            <Link to="/students">Students</Link>
            <Link to="/calendar">Calendar</Link>
          </nav>

          {/* RIGHT */}
          <div className="navbar-right">

            {/* THEME */}
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* PROFILE */}
            <div className="profile-wrapper" ref={profileRef}>
              <button
                className="profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <img
                  src={user?.photoURL ? user.photoURL : defaultProfile}
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

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>

            {/* MOBILE MENU */}
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* 🔥 LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div className="logout-overlay">
          <div className="logout-modal" ref={modalRef}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>

            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
                No
              </button>

              <button className="btn-confirm" onClick={handleLogout}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}