// src/types/PersonalTask.ts

export type PersonalTask = {
  id: string;
  uid: string;            // owner's uid
  title: string;
  description: string;
  date: string;           // due date (YYYY-MM-DD)
  time: string;           // optional time (HH:mm)
  deadline?: string;      // optional deadline (YYYY-MM-DD HH:mm)
  completed: boolean;
  createdBy: string;      // uid of creator
  createdAt: unknown;
  updatedAt: unknown;
};

export type PersonalTaskFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  deadline: string;
};