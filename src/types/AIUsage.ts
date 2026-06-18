// src/types/AIUsage.ts

export interface AIUsageRecord {
  id: string;
  userId: string;
  date: string;
  count: number;
  dailyLimit: number;
  resetAt: unknown;
  createdAt: unknown;
}

export interface AIUsageInfo {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  isLimited: boolean;
}

export const DEFAULT_AI_DAILY_LIMIT = 20;