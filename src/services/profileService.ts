// src/services/profileService.ts

import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../lib/firebase";
import type { UserProfile, UserRole, ProfileStatus } from "../types/Profile";

const PROFILE_COLLECTION = "classCA1B_Profiles";
const GBOX_DOMAIN = "@gbox.adnu.edu.ph";

function isGboxEmail(email: string) {
  return email.toLowerCase().endsWith(GBOX_DOMAIN);
}

function getDefaultRole(email: string): UserRole {
  return isGboxEmail(email) ? "student" : "visitor";
}

function getDefaultStatus(email: string): ProfileStatus {
  return isGboxEmail(email) ? "active" : "pending";
}

export function getProfileRef(uid: string) {
  return doc(db, PROFILE_COLLECTION, uid);
}

export async function ensureUserProfile(user: User) {
  const email = user.email || "";
  const profileRef = getProfileRef(user.uid);
  const snap = await getDoc(profileRef);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const profile: UserProfile = {
    id: user.uid,
    uid: user.uid,
    name: user.displayName || email.split("@")[0] || "New User",
    email,
    number: "",
    numberVerified: false,
    birthday: "",
    role: getDefaultRole(email),
    class: isGboxEmail(email) ? "CA1B" : "",
    officerRole: null,
    status: getDefaultStatus(email),
    section: isGboxEmail(email) ? "CA1B" : "",
    bio: "",
    photoURL: user.photoURL || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(profileRef, profile);
  return profile;
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(getProfileRef(uid));

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as UserProfile;
}

export async function getClassProfiles() {
  const profilesQuery = query(
    collection(db, PROFILE_COLLECTION),
    where("class", "==", "CA1B")
  );
  const snap = await getDocs(profilesQuery);

  return snap.docs
    .map((profileDoc) => profileDoc.data() as UserProfile)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateMyProfile(
  uid: string,
  data: {
    name: string;
    number: string;
    birthday: string;
    bio: string;
  }
) {
  await updateDoc(getProfileRef(uid), {
    name: data.name.trim(),
    number: data.number.trim(),
    birthday: data.birthday,
    bio: data.bio.trim(),
    numberVerified: false,
    updatedAt: serverTimestamp()
  });
}