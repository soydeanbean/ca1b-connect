import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { logoutUser } from "../../services/authService";
import { searchGlobal, type GlobalSearchResult } from "../../services/searchService";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 🌙 DARK MODE
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const results = await searchGlobal(searchQuery);
        setSearchResults(results);
        setSearchOpen(true);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  // ❌ CLOSE PROFILE ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
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

  const handleSearchResult = (result: GlobalSearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    navigate(result.path);
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
          <div className="search-container" ref={searchRef}>
            <input
              type="text"
              placeholder="Search students, attendance, activities, events..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
            />

            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="global-search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="global-search-empty">No matches found</div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      type="button"
                      key={result.id}
                      onClick={() => handleSearchResult(result)}
                    >
                      <span>{result.category}</span>
                      <strong>{result.label}</strong>
                      <small>{result.description}</small>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* NAV */}
          <nav className={`nav-links ${menuOpen ? "active" : ""}`}>
            <Link to="/">Dashboard</Link>
            <Link to="/attendance">Attendance</Link>
            <Link to="/activities">Activities</Link>
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