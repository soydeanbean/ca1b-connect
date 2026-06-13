import type { UserProfile } from "../types/Profile";

const ACTIVITY_MANAGERS = ["president", "vp", "beadle"];
const EVENT_MANAGERS = ["president", "vp", "pio", "beadle"];

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
