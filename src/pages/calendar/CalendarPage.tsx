import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { getActivities } from "../../services/activityService";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent
} from "../../services/eventService";
import { canManageEvents } from "../../services/permissionService";
import { getUserProfile } from "../../services/profileService";
import { getSubjectActivities } from "../../services/subjectService";
import { SUBJECTS } from "../../data/ScheduleData";
import type { ClassActivity } from "../../types/Activity";
import type {
  CalendarEventType,
  ClassCalendarEvent,
  EventFormValues
} from "../../types/Event";
import type { UserProfile } from "../../types/Profile";
import type { SubjectActivity } from "../../types/Subject";

import "./CalendarPage.css";

type CalendarItem = {
  id: string;
  title: string;
  date: string;
  type: string;
  details: string;
  time?: string;
  location?: string;
  source: "activity" | "event" | "subject_activity";
  subjectCode?: string;
};

const EMPTY_FORM: EventFormValues = {
  title: "",
  type: "class",
  date: "",
  time: "",
  location: "",
  details: ""
};

const EVENT_TYPES: CalendarEventType[] = ["class", "school", "deadline", "reminder"];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatType(type: string) {
  return type[0].toUpperCase() + type.slice(1);
}

function getTodayDateId() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

async function fetchCalendarState(uid: string, highlightedEventId: string | null) {
  const [loadedProfile, loadedEvents, loadedActivities] = await Promise.all([
    getUserProfile(uid),
    getCalendarEvents(),
    getActivities()
  ]);

  // Load subject-specific activities
  const allSubjects = SUBJECTS.map(s => s.code);
  const subjectActivityPromises = allSubjects.map(code => getSubjectActivities(code));
  const subjectActivityResults = await Promise.all(subjectActivityPromises);
  const loadedSubjectActivities = subjectActivityResults.flat();

  const highlighted = loadedEvents.find((event) => event.id === highlightedEventId);

  return {
    loadedProfile,
    loadedEvents,
    loadedActivities,
    loadedSubjectActivities,
    highlighted
  };
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<ClassCalendarEvent[]>([]);
  const [activities, setActivities] = useState<ClassActivity[]>([]);
  const [subjectActivities, setSubjectActivities] = useState<SubjectActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<ClassCalendarEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canEdit = canManageEvents(profile);
  const highlightedEventId = searchParams.get("event");

  const items = useMemo<CalendarItem[]>(() => {
    const eventItems = events.map<CalendarItem>((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      type: event.type,
      details: event.details,
      time: event.time,
      location: event.location,
      source: "event"
    }));

    const activityItems = activities.map<CalendarItem>((activity) => ({
      id: activity.id,
      title: activity.title,
      date: activity.deadline,
      type: activity.type,
      details: activity.details,
      source: "activity"
    }));

    const subjectActivityItems = subjectActivities.map<CalendarItem>((sa) => {
      const subjectInfo = SUBJECTS.find(s => s.code === sa.subjectCode);
      const subjectLabel = subjectInfo ? `[${subjectInfo.code}] ` : "";
      return {
        id: sa.id,
        title: `${subjectLabel}${sa.title}`,
        date: sa.dueDate,
        type: sa.type,
        details: sa.description || "Subject activity",
        time: sa.dueTime,
        source: "subject_activity" as const,
        subjectCode: sa.subjectCode
      };
    });

    return [...eventItems, ...activityItems, ...subjectActivityItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [activities, events, subjectActivities]);

  const monthItems = useMemo(
    () =>
      items.filter((item) => {
        const itemDate = new Date(`${item.date}T00:00:00`);
        return itemDate.getMonth() === month && itemDate.getFullYear() === year;
      }),
    [items, month, year]
  );

  const selectedDateItems = selectedDate
    ? items.filter((item) => item.date === selectedDate)
    : monthItems.slice(0, 6);

  const loadCalendar = async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");

    try {
      const { loadedProfile, loadedEvents, loadedActivities, loadedSubjectActivities, highlighted } =
        await fetchCalendarState(user.uid, highlightedEventId);

      setProfile(loadedProfile);
      setEvents(loadedEvents);
      setActivities(loadedActivities);
      setSubjectActivities(loadedSubjectActivities);

      if (highlighted) {
        const highlightedDate = new Date(`${highlighted.date}T00:00:00`);
        setSelectedEvent(highlighted);
        setSelectedDate(highlighted.date);
        setMonth(highlightedDate.getMonth());
        setYear(highlightedDate.getFullYear());
      } else if (!selectedDate) {
        setSelectedDate(getTodayDateId());
      }
    } catch (error) {
      console.error("Calendar load failed:", error);
      setMessage("Calendar could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeCalendar = async () => {
      if (!user) return;

      setLoading(true);
      setMessage("");

      try {
        const { loadedProfile, loadedEvents, loadedActivities, loadedSubjectActivities, highlighted } =
          await fetchCalendarState(user.uid, highlightedEventId);

        setProfile(loadedProfile);
        setEvents(loadedEvents);
        setActivities(loadedActivities);
        setSubjectActivities(loadedSubjectActivities);

        if (highlighted) {
          const highlightedDate = new Date(`${highlighted.date}T00:00:00`);
          setSelectedEvent(highlighted);
          setSelectedDate(highlighted.date);
          setMonth(highlightedDate.getMonth());
          setYear(highlightedDate.getFullYear());
        } else {
          setSelectedDate(getTodayDateId());
        }
      } catch (error) {
        console.error("Calendar load failed:", error);
        setMessage("Calendar could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    initializeCalendar();
  }, [user, highlightedEventId]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstDay }).map(() => null),
      ...Array.from({ length: daysInMonth }).map((_, index) => index + 1)
    ];
  }, [month, year]);

  const handleMonthChange = (direction: -1 | 1) => {
    const next = new Date(year, month + direction, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
    setSelectedDate("");
  };

  const handleNew = () => {
    setSelectedEvent(null);
    setEditing(true);
    setForm({
      ...EMPTY_FORM,
      date: selectedDate || getTodayDateId()
    });
  };

  const handleEdit = (event: ClassCalendarEvent) => {
    setSelectedEvent(event);
    setEditing(true);
    setForm({
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      location: event.location,
      details: event.details
    });
  };

  const handleSave = async () => {
    if (!profile || !form.title.trim() || !form.date) {
      setMessage("Title and date are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (selectedEvent) {
        await updateCalendarEvent(selectedEvent, form, profile.uid);
      } else {
        await createCalendarEvent(form, profile.uid);
      }

      setEditing(false);
      await loadCalendar();
      setMessage("Event saved.");
    } catch (error) {
      console.error("Event save failed:", error);
      setMessage("Event could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: ClassCalendarEvent) => {
    const confirmed = window.confirm(`Remove "${event.title}"?`);

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      await deleteCalendarEvent(event.id);
      setSelectedEvent(null);
      await loadCalendar();
      setMessage("Event removed.");
    } catch (error) {
      console.error("Event delete failed:", error);
      setMessage("Event could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="calendar-page">Loading calendar...</div>;
  }

  return (
    <div className="calendar-page">
      <section className="calendar-hero">
        <div>
          <p>Calendar & Events</p>
          <h1>Class Calendar</h1>
          <span>Events, reminders, deadlines, and activity details in one place.</span>
        </div>

        {canEdit && (
          <button type="button" onClick={handleNew}>
            Add Event
          </button>
        )}
      </section>

      {message && <div className="calendar-message">{message}</div>}

      <div className="calendar-page-layout">
        <section className="calendar-main-panel">
          <div className="calendar-toolbar">
            <button type="button" onClick={() => handleMonthChange(-1)}>
              Previous
            </button>
            <h2>
              {new Date(year, month).toLocaleDateString("en-PH", {
                month: "long",
                year: "numeric"
              })}
            </h2>
            <button type="button" onClick={() => handleMonthChange(1)}>
              Next
            </button>
          </div>

          <div className="calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid-page">
            {days.map((day, index) => {
              if (!day) return <div key={`blank-${index}`} className="calendar-day blank" />;

              const date = new Intl.DateTimeFormat("en-CA").format(new Date(year, month, day));
              const dayItems = items.filter((item) => item.date === date);

              return (
                <button
                  type="button"
                  key={date}
                  className={`calendar-day ${selectedDate === date ? "active" : ""}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <strong>{day}</strong>
                  {dayItems.slice(0, 3).map((item) => (
                    <span key={`${item.source}-${item.id}`} className={item.source}>
                      {item.title}
                    </span>
                  ))}
                  {dayItems.length > 3 && <small>+{dayItems.length - 3} more</small>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-side-panel">
          {editing ? (
            <div className="event-form">
              <h2>{selectedEvent ? "Edit Event" : "Add Event"}</h2>

              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>

              <label>
                Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as CalendarEventType
                    }))
                  }
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatType(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </label>

              <label>
                Time
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, time: event.target.value }))
                  }
                />
              </label>

              <label>
                Location
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </label>

              <label>
                Details
                <textarea
                  rows={5}
                  value={form.details}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, details: event.target.value }))
                  }
                />
              </label>

              <div className="event-form-actions">
                <button type="button" className="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="calendar-side-heading">
                <h2>{selectedDate ? formatDate(selectedDate) : "Month Overview"}</h2>
                <span>{selectedDateItems.length} item(s)</span>
              </div>

              <div className="calendar-item-list">
                {selectedDateItems.length ? (
                  selectedDateItems.map((item) => (
                    <article key={`${item.source}-${item.id}`} className={`calendar-item ${item.source}`}>
                      <div>
                        <span>{formatType(item.type)}</span>
                        <h3>{item.title}</h3>
                      </div>

                      <p>{item.details || "No extra details yet."}</p>

                      {(item.time || item.location) && (
                        <small>
                          {item.time || "Any time"} {item.location ? `• ${item.location}` : ""}
                        </small>
                      )}

                      {item.source === "subject_activity" && item.subjectCode && (
                        <Link to={`/subjects?code=${item.subjectCode}`} className="cal-card-link">
                          View in Subject →
                        </Link>
                      )}

                      {item.source === "event" && canEdit && (
                        <div className="calendar-item-actions">
                          <button
                            type="button"
                            onClick={() => handleEdit(events.find((event) => event.id === item.id)!)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDelete(events.find((event) => event.id === item.id)!)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="calendar-empty">No events or deadlines for this day.</div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}