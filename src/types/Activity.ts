export type ActivityKind = "assignment" | "project" | "activity";

export type ActivityFile = {
  name: string;
  url: string;
};

export type ActivityCompletion = {
  uid: string;
  name: string;
  email: string;
  completedAt: unknown;
};

export type ClassActivity = {
  id: string;
  title: string;
  type: ActivityKind;
  details: string;
  deadline: string;
  items: string[];
  file?: ActivityFile;
  completedBy: Record<string, ActivityCompletion>;
  createdAt: unknown;
  createdBy: string;
  updatedAt: unknown;
  updatedBy: string;
};

export type ActivityFormValues = {
  title: string;
  type: ActivityKind;
  details: string;
  deadline: string;
  itemsText: string;
};

export type ActivityStats = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  assignmentsCompleted: number;
  projectsCompleted: number;
  activitiesCompleted: number;
};
