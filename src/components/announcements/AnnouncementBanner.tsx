import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAnnouncements } from "../../services/announcementService";
import type { Announcement } from "../../types/Announcement";

export default function AnnouncementBanner() {
  const [latest, setLatest] = useState<Announcement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const announcements = await getAnnouncements();
        if (announcements.length > 0) {
          setLatest(announcements[0]);
        }
      } catch {
        // silent
      }
    };
    load();
  }, []);

  if (!latest) return null;

  return (
    <Link
      to={`/announcements?id=${latest.id}`}
      style={{
        display: "block",
        padding: "0.75rem 1rem",
        background: "linear-gradient(135deg, rgba(255,140,0,0.12), rgba(255,208,0,0.08))",
        borderRadius: "12px",
        textDecoration: "none",
        color: "inherit",
        marginBottom: "1rem",
        border: "1px solid rgba(255,140,0,0.2)",
        transition: "all 0.2s ease"
      }}
    >
      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#ff8c00", marginBottom: "0.25rem" }}>
        Latest Announcement
      </div>
      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{latest.title}</div>
    </Link>
  );
}