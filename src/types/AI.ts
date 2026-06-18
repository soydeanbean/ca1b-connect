// src/types/AI.ts

export type AIClassificationType = "assignment" | "activity" | "project" | "announcement" | "subject_announcement";

export interface AIAssignmentResult {
  type: "assignment" | "activity" | "project";
  title: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  dueDate: string;
  dueTime: string;
}

export interface AIAnnouncementResult {
  type: "announcement";
  category: "major" | "minor";
  title: string;
  content: string;
  urgency: "high" | "medium" | "low";
  targetSubjectCode: string;
  targetSubjectName: string;
}

export interface AISubjectAnnouncementResult {
  type: "subject_announcement";
  subjectCode: string;
  subjectName: string;
  title: string;
  content: string;
  pinned: boolean;
  dueDate: string;
  dueTime: string;
}

export type AICreateResult = AIAssignmentResult | AIAnnouncementResult | AISubjectAnnouncementResult;

export type AICreateMultiResult = AICreateResult[];

export interface AIAskResponse {
  answer: string;
}

export type AIErrorType = "safety" | "quota" | "parse" | "network" | "unknown";

export interface AIError {
  type: AIErrorType;
  message: string;
}

export interface AIUsageInfo {
  used: number;
  limit: number;
  remaining: number;
  isLimited: boolean;
}
