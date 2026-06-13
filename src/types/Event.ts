export type CalendarEventType = "class" | "school" | "deadline" | "reminder";

export type ClassCalendarEvent = {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  time: string;
  location: string;
  details: string;
  createdAt: unknown;
  createdBy: string;
  updatedAt: unknown;
  updatedBy: string;
};

export type EventFormValues = {
  title: string;
  type: CalendarEventType;
  date: string;
  time: string;
  location: string;
  details: string;
};