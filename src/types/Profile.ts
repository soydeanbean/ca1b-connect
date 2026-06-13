// src/types/Profile.ts

export type UserRole = "student" | "visitor" | "teacher";
export type ProfileStatus = "active" | "pending" | "blocked";

export type OfficerRole =
  | "president"
  | "vp"
  | "secretary"
  | "treasurer"
  | "auditor"
  | "beadle"
  | "pio"
  | null;

export type UserProfile = {
  id: string;
  uid: string;
  name: string;
  email: string;
  number: string;
  numberVerified: boolean;
  birthday: string;
  role: UserRole;
  class: string;
  officerRole: OfficerRole;
  status: ProfileStatus;
  section: string;
  bio: string;
  photoURL: string;
  createdAt: unknown;
  updatedAt: unknown;
};