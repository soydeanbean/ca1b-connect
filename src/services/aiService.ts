// src/services/aiService.ts

import { getFunctions, httpsCallable } from "firebase/functions";
import type { AICreateResult, AIError } from "../types/AI";

const functions = getFunctions();

/**
 * Call the AI Create Instances cloud function
 * Sends a prompt and receives structured JSON result
 */
export async function aiCreateInstances(prompt: string): Promise<AICreateResult> {
  const createInstances = httpsCallable<{ prompt: string }, { success: boolean; data: AICreateResult }>(
    functions,
    "aiCreateInstances"
  );

  try {
    const result = await createInstances({ prompt });
    const { data } = result.data;
    
    if (!data) {
      throw buildAIError("parse", "AI returned an empty response.");
    }

    return data;
  } catch (error: any) {
    throw parseAIError(error);
  }
}

/**
 * Call the AI Ask Question cloud function
 * Sends a question and receives a text answer
 */
export async function aiAskQuestion(question: string): Promise<string> {
  const askQuestion = httpsCallable<{ question: string }, { success: boolean; answer: string }>(
    functions,
    "aiAskQuestion"
  );

  try {
    const result = await askQuestion({ question });
    const { answer } = result.data;
    
    if (!answer) {
      throw buildAIError("parse", "AI returned an empty response.");
    }

    return answer;
  } catch (error: any) {
    throw parseAIError(error);
  }
}

/**
 * Parse errors from Firebase callable functions into structured AI errors
 */
function parseAIError(error: any): AIError {
  // Firebase function errors
  const message = error?.message || "An unknown error occurred.";
  
  if (message.includes("safety") || message.includes("SAFETY")) {
    return buildAIError("safety", message);
  }
  
  if (message.includes("quota") || message.includes("QUOTA")) {
    return buildAIError("quota", "AI service is currently busy. Please try again later.");
  }

  if (message.includes("unauthenticated") || message.includes("Authentication")) {
    return buildAIError("network", "You must be logged in to use AI features.");
  }

  // Network errors
  if (error?.code === "functions/unavailable" || error?.code === "functions/deadline-exceeded") {
    return buildAIError("network", "AI service is temporarily unavailable. Please try again.");
  }

  // Default
  return buildAIError("unknown", message);
}

function buildAIError(type: AIError["type"], message: string): AIError {
  return { type, message };
}