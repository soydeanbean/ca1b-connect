// src/types/Announcement.ts

export type AnnouncementCategory = "major" | "minor";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  subjectCode?: string;
  subjectName?: string;
  pinned?: boolean;
  attachments?: AnnouncementAttachment[];
  createdBy: string;            // uid
  creatorName: string;
  creatorRole: string;
  creatorPhotoURL: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type AnnouncementAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export type AnnouncementFormValues = {
  title: string;
  content: string;
  category: AnnouncementCategory;
  subjectCode?: string;
  pinned?: boolean;
};
