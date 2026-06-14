// src/types/Announcement.ts

export type AnnouncementCategory = "major" | "minor";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  createdBy: string;            // uid
  creatorName: string;
  creatorRole: string;
  creatorPhotoURL: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type AnnouncementFormValues = {
  title: string;
  content: string;
  category: AnnouncementCategory;
};