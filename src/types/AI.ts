// src/types/AI.ts

export type AIClassificationType = "assignment" | "activity" | "project" | "announcement";

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

export type AICreateResult = AIAssignmentResult | AIAnnouncementResult;

export interface AIAskResponse {
  answer: string;
}

export type AIErrorType = "safety" | "quota" | "parse" | "network" | "unknown";

export interface AIError {
  type: AIErrorType;
  message: string;
}