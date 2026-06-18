// src/types/SubjectAnnouncement.ts

export interface SubjectAnnouncement {
  id: string;
  subjectCode: string;
  title: string;
  content: string;
  pinned: boolean;
  attachments: SubjectAnnouncementAttachment[];
  createdBy: string;
  creatorName: string;
  creatorRole: string;
  creatorPhotoURL: string;
  createdAt: unknown;
  updatedAt: unknown;
  dueDate?: string;
}

export interface SubjectAnnouncementAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface SubjectAnnouncementFormValues {
  title: string;
  content: string;
  pinned: boolean;
  dueDate: string;
}