// src/services/aiUsageService.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { AIUsageRecord, AIUsageInfo } from "../types/AIUsage";
import { DEFAULT_AI_DAILY_LIMIT } from "../types/AIUsage";

const COLLECTION = "aiUsage";

function getTodayDateId(): string {
  return new Date().toISOString().split("T")[0];
}

function getDocId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

export async function getAIUsageInfo(userId: string): Promise<AIUsageInfo> {
  const date = getTodayDateId();
  const docId = getDocId(userId, date);

  try {
    const ref = doc(db, COLLECTION, docId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        used: 0,
        limit: DEFAULT_AI_DAILY_LIMIT,
        remaining: DEFAULT_AI_DAILY_LIMIT,
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        isLimited: false
      };
    }

    const record = snap.data() as AIUsageRecord;
    return {
      used: record.count,
      limit: record.dailyLimit || DEFAULT_AI_DAILY_LIMIT,
      remaining: Math.max(0, (record.dailyLimit || DEFAULT_AI_DAILY_LIMIT) - record.count),
      resetAt: record.resetAt as string,
      isLimited: record.count >= (record.dailyLimit || DEFAULT_AI_DAILY_LIMIT)
    };
  } catch (error) {
    console.error("Failed to get AI usage info:", error);
    return {
      used: 0,
      limit: DEFAULT_AI_DAILY_LIMIT,
      remaining: DEFAULT_AI_DAILY_LIMIT,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      isLimited: false
    };
  }
}

export async function incrementAIUsage(userId: string): Promise<boolean> {
  const date = getTodayDateId();
  const docId = getDocId(userId, date);

  try {
    const ref = doc(db, COLLECTION, docId);
    const snap = await getDoc(ref);

    const resetAt = new Date(new Date().setHours(24, 0, 0, 0));

    if (!snap.exists()) {
      await setDoc(ref, {
        id: docId,
        userId,
        date,
        count: 1,
        dailyLimit: DEFAULT_AI_DAILY_LIMIT,
        resetAt,
        createdAt: serverTimestamp()
      });
      return true;
    }

    const record = snap.data() as AIUsageRecord;
    if (record.count >= (record.dailyLimit || DEFAULT_AI_DAILY_LIMIT)) {
      return false;
    }

    await updateDoc(ref, {
      count: increment(1)
    });
    return true;
  } catch (error) {
    console.error("Failed to increment AI usage:", error);
    return false;
  }
}

export async function canUseAI(userId: string): Promise<boolean> {
  const info = await getAIUsageInfo(userId);
  return !info.isLimited;
}

export async function getRemainingUsage(userId: string): Promise<number> {
  const info = await getAIUsageInfo(userId);
  return info.remaining;
}