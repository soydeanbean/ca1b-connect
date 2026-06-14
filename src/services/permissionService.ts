import type { UserProfile } from "../types/Profile";

const ACTIVITY_MANAGERS = ["president", "vp", "beadle"];
const EVENT_MANAGERS = ["president", "vp", "pio", "beadle"];
const ANNOUNCEMENT_CREATORS = ["beadle", "president", "vp", "secretary", "pio"];

export function canManageActivities(profile: UserProfile | null) {
  return (
    profile?.role === "teacher" ||
    Boolean(profile?.officerRole && ACTIVITY_MANAGERS.includes(profile.officerRole))
  );
}

export function canManageEvents(profile: UserProfile | null) {
  return (
    profile?.role === "teacher" ||
    Boolean(profile?.officerRole && EVENT_MANAGERS.includes(profile.officerRole))
  );
}

export function canCreateAnnouncements(profile: UserProfile | null) {
  return (
    profile?.role === "teacher" ||
    Boolean(profile?.officerRole && ANNOUNCEMENT_CREATORS.includes(profile.officerRole))
  );
}

export function isGboxUser(profile: UserProfile | null) {
  if (!profile) return false;
  return profile.email.endsWith("@gbox.adnu.edu.ph");
}