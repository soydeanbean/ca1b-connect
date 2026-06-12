import { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import ca1b_logo from '../../assets/logos/ca1b.png'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-container">

        <div className="logo">
          <img src={ca1b_logo} alt="CA1B" style={{ width: "100px", height: "auto" }}/>
          <p>CA1B <span>Connect</span></p>
        </div>

        <nav className={`nav-links ${menuOpen ? "active" : ""}`}>
          <Link to="/">Dashboard</Link>
          <Link to="/attendance">Attendance</Link>
          <Link to="/students">Students</Link>
          <Link to="/calendar">Calendar</Link>
        </nav>

        {/* MOBILE BUTTON */}
        <button
          className="menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

      </div>
    </header>
  );
}