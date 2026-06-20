// src/services/permissionService.ts

import type { UserProfile } from "../types/Profile";

// ─── Role Hierarchy ───
// admin > teacher > officer (president/vp/secretary/treasurer/auditor/beadle/pio) > student

const ACTIVITY_MANAGERS = ["president", "vp", "beadle"];
const EVENT_MANAGERS = ["president", "vp", "pio", "beadle"];
const ANNOUNCEMENT_CREATORS = ["beadle", "president", "vp", "secretary", "pio"];
const ATTENDANCE_MANAGERS = ["beadle", "president", "vp"];
const STUDENT_MANAGERS = ["president", "vp", "secretary"];
const ANALYTICS_ACCESS = ["president", "vp", "secretary", "beadle", "pio"];

function hasRole(profile: UserProfile | null, allowedRoles: string[]): boolean {
  if (!profile) return false;
  if (profile.role === "admin" || profile.role === "teacher") return true;
  return Boolean(profile.officerRole && allowedRoles.includes(profile.officerRole));
}

// ─── Activity Permissions ───

export function canManageActivities(profile: UserProfile | null) {
  return hasRole(profile, ACTIVITY_MANAGERS);
}

export function canManageSubjectActivities(profile: UserProfile | null) {
  // Teachers and admins can manage all subject activities
  if (profile?.role === "teacher" || profile?.role === "admin") return true;
  return hasRole(profile, ACTIVITY_MANAGERS);
}

// ─── Event Permissions ───

export function canManageEvents(profile: UserProfile | null) {
  return hasRole(profile, EVENT_MANAGERS);
}

// ─── Announcement Permissions ───

export function canCreateAnnouncements(profile: UserProfile | null) {
  return hasRole(profile, ANNOUNCEMENT_CREATORS);
}

export function canCreateSubjectAnnouncements(profile: UserProfile | null) {
  if (profile?.role === "teacher" || profile?.role === "admin") return true;
  return hasRole(profile, ANNOUNCEMENT_CREATORS);
}

// ─── Attendance Permissions ───

export function canManageAttendance(profile: UserProfile | null) {
  return hasRole(profile, ATTENDANCE_MANAGERS);
}

export function canCreateAttendanceSession(profile: UserProfile | null) {
  return hasRole(profile, ATTENDANCE_MANAGERS);
}

// ─── Student Management ───

export function canManageStudents(profile: UserProfile | null) {
  return hasRole(profile, STUDENT_MANAGERS);
}

// ─── Analytics ───

export function canAccessAnalytics(profile: UserProfile | null) {
  return hasRole(profile, ANALYTICS_ACCESS);
}

// ─── Administrative ───

export function canAdministrate(profile: UserProfile | null) {
  if (!profile) return false;
  return profile.role === "admin" || profile.role === "teacher";
}

// ─── View Permissions ───

export function canViewAllProfiles(profile: UserProfile | null) {
  if (!profile) return false;
  return profile.role === "admin" || profile.role === "teacher" || profile.role === "student";
}

// ─── Legacy ───

export function isGboxUser(profile: UserProfile | null) {
  if (!profile) return false;
  return profile.email.endsWith("@gbox.adnu.edu.ph");
}