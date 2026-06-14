// src/pages/landing/Landing.tsx

import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

import groupImage1 from "../../assets/images/CA1BGroupImage1.jpg";
import groupImage2 from "../../assets/images/CA1BGroupImage2.jpg";
import adnuLogo from "../../assets/logos/ADNULogo.png";
import ca1bLogo from "../../assets/logos/ca1b.png";

const FEATURES = [
  {
    icon: "📋",
    title: "Attendance Tracking",
    description: "Easily track and monitor attendance for the entire class with real-time updates."
  },
  {
    icon: "📝",
    title: "Activities & Deadlines",
    description: "Stay on top of assignments, projects, and activities with deadlines and progress tracking."
  },
  {
    icon: "📅",
    title: "Class Calendar",
    description: "View all class events, school activities, and important dates in one place."
  },
  {
    icon: "👥",
    title: "Student Directory",
    description: "Connect with classmates and teachers through the integrated student directory."
  },
  {
    icon: "📢",
    title: "Announcements",
    description: "Receive official announcements from class officers and teachers in real time."
  },
  {
    icon: "🔔",
    title: "Smart Notifications",
    description: "Get reminded about overdue tasks, new activities, and important announcements."
  }
];

function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      elements.forEach((el) => observerRef.current?.unobserve(el));
    };
  }, []);

  return observerRef;
}

export default function Landing() {
  const navigate = useNavigate();
  useScrollReveal();

  const handleGoToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="landing-page">
      {/* ─── HERO ─── */}
      <section className="landing-hero">
        <div className="landing-logo-row">
          <img src={adnuLogo} alt="Ateneo de Naga University" />
          <img src={ca1bLogo} alt="CA1B Logo" />
        </div>

        <h1>CA1B Connect</h1>
        <p className="hero-subtitle">
          Creativity is Society's Cab
        </p>
        <p className="hero-description">
          Your all-in-one section management platform made specifically for class CA1B. Track attendance, manage activities,
          stay updated with announcements, and connect with your classmates all in one place.
        </p>

        <button className="landing-cta" onClick={handleGoToDashboard}>
          Go to Dashboard →
        </button>

        <div className="landing-scroll-indicator">
          <span>Scroll to explore</span>
          <span />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="landing-section">
        <div className="landing-section-title scroll-reveal">
          <h2>Everything You Need</h2>
          <p>Powerful tools to manage your section efficiently</p>
        </div>

        <div className="landing-features">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="landing-feature-card scroll-reveal"
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      <section className="landing-section">
        <div className="landing-section-title scroll-reveal">
          <h2>Our Class Gallery</h2>
          <p>Moments captured throughout the journey</p>
        </div>

        <div className="landing-gallery">
          <div className="landing-gallery-item scroll-reveal">
            <img src={groupImage1} alt="CA1B Group Photo 1" loading="lazy" />
          </div>
          <div className="landing-gallery-item scroll-reveal">
            <img src={groupImage2} alt="CA1B Group Photo 2" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ─── LOGO SECTION ─── */}
      <section className="landing-logo-section scroll-reveal">
        <img src={adnuLogo} alt="Ateneo de Naga University Logo" />
        <h3>Ateneo de Naga University</h3>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <h3>CA1B Connect &copy; {new Date().getFullYear()} &mdash; Creativity is Society's Cab</h3>
        <br />
        <p>Made with love and care by Rejiro Reobaldez :)</p>
      </footer>
    </div>
  );
}