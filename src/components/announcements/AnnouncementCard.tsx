import type { Announcement } from "../../types/Announcement";

type Props = {
  announcement: Announcement;
  onClick?: () => void;
};

function formatTimestamp(ts: unknown) {
  if (!ts) return "";
  const date = ts instanceof Date ? ts : (ts as { toDate?: () => Date })?.toDate?.() || new Date(String(ts));
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function AnnouncementCard({ announcement, onClick }: Props) {
  return (
    <article
      className="announcement-card"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="announcement-card-header">
        <span className={`announcement-card-category ${announcement.category}`}>
          {announcement.category}
        </span>
        <span className="announcement-card-time">
          {formatTimestamp(announcement.createdAt)}
        </span>
      </div>

      <h2>{announcement.title}</h2>
      <p className="announcement-card-content">{announcement.content}</p>

      <div className="announcement-card-footer">
        <div className="announcement-card-creator">
          <img
            src={announcement.creatorPhotoURL || undefined}
            alt={announcement.creatorName}
          />
          <div className="announcement-card-creator-info">
            <span className="announcement-card-creator-name">
              {announcement.creatorName}
            </span>
            <span className="announcement-card-creator-role">
              {announcement.creatorRole}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}