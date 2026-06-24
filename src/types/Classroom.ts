// src/types/Classroom.ts
// Google Classroom API types for CA1B Connect sync

/** OAuth token stored in Firestore for a user */
export interface ClassroomOAuthToken {
  accessToken: string;
  refreshToken: string;
  scope: string;
  tokenType: string;
  expiryDate: number; // timestamp
}

/** A Google Classroom course */
export interface ClassroomCourse {
  id: string;
  name: string;
  section: string;
  descriptionHeading: string;
  description: string;
  ownerId: string;
  creationTime: string;
  updateTime: string;
  enrollmentCode: string;
  courseState: "ACTIVE" | "ARCHIVED" | "PROVISIONED" | "DECLINED";
  alternateLink: string;
  teacherGroupEmail: string;
  courseGroupEmail: string;
}

/** A Google Classroom courseWork item (assignment/question) */
export interface ClassroomCourseWork {
  courseId: string;
  id: string;
  title: string;
  description: string;
  materials: ClassroomMaterial[];
  state: "PUBLISHED" | "DRAFT" | "DELETED";
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours: number;
    minutes: number;
  };
  workType: "ASSIGNMENT" | "SHORT_ANSWER_QUESTION" | "MULTIPLE_CHOICE_QUESTION";
  submissionModificationMode: string;
  creatorUserId: string;
}

/** A Google Classroom announcement */
export interface ClassroomAnnouncement {
  courseId: string;
  id: string;
  text: string;
  materials: ClassroomMaterial[];
  state: "PUBLISHED" | "DRAFT" | "DELETED";
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  creatorUserId: string;
}

/** A Google Classroom courseWork material (resource post, not graded) */
export interface ClassroomCourseWorkMaterial {
  courseId: string;
  id: string;
  title: string;
  description: string;
  materials: ClassroomMaterial[];
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  creatorUserId: string;
  state: "PUBLISHED" | "DRAFT" | "DELETED";
}

/** Material attached to a Classroom item (can be drive file, youtube, link, form) */
export interface ClassroomMaterial {
  driveFile?: {
    driveFile: {
      id: string;
      title: string;
      alternateLink: string;
      thumbnailUrl: string;
    };
    shareMode: string;
  };
  youtubeVideo?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl: string;
  };
  link?: {
    url: string;
    title: string;
    thumbnailUrl: string;
  };
  form?: {
    formUrl: string;
    title: string;
    thumbnailUrl: string;
  };
}

/** Results from a sync operation */
export interface ClassroomSyncResult {
  activitiesCreated: number;
  announcementsCreated: number;
  activitiesSkipped: number;
  announcementsSkipped: number;
  errors: string[];
  summary: string;
}

/** Subject-to-Classroom course mapping */
export interface SubjectClassroomMapping {
  subjectCode: string;
  classroomCourseId: string;
  lastSyncedAt: string;
}

/** Sync log entry stored in Firestore */
export interface ClassroomSyncLog {
  id: string;
  userId: string;
  syncedAt: unknown;
  result: ClassroomSyncResult;
  status: "success" | "partial" | "error";
}

/** OAuth state stored for the flow */
export interface ClassroomOAuthState {
  state: string;
  userId: string;
  createdAt: number;
}