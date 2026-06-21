// src/services/aiService.ts

import type { AICreateResult, AIError } from "../types/AI";

/**
 * Get the base URL for API calls.
 * In development (localhost), calls go to the Vite dev server which proxies to Vercel.
 * In production (Vercel), calls go to the same domain (no CORS issues).
 */
function getApiBaseUrl(): string {
  // When running on Vercel, use relative paths (same origin)
  // When running locally, Vite proxy will handle forwarding
  return "";
}

/**
 * Call the AI Create Instances API endpoint
 * Sends a prompt and receives structured JSON result
 */
export async function aiCreateInstances(prompt: string): Promise<AICreateResult> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/ai/create-instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw buildAIError(
        parseErrorType(response.status, result.error),
        result.error || "AI request failed."
      );
    }

    if (!result.data) {
      throw buildAIError("parse", "AI returned an empty response.");
    }

    return result.data;
  } catch (error: any) {
    // If it's already an AIError, re-throw it
    if (error.type && error.message) {
      throw error;
    }
    throw parseAIError(error);
  }
}

/**
 * Create multiple instances from a single prompt
 * Returns an array of AICreateResult items
 */
export async function aiCreateMultipleInstances(prompt: string): Promise<AICreateResult[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/ai/create-instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, multi: true }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw buildAIError(
        parseErrorType(response.status, result.error),
        result.error || "AI request failed."
      );
    }

    if (!result.data) {
      throw buildAIError("parse", "AI returned an empty response.");
    }

    // Support both single result and array
    return Array.isArray(result.data) ? result.data : [result.data];
  } catch (error: any) {
    if (error.type && error.message) {
      throw error;
    }
    throw parseAIError(error);
  }
}

/**
 * Call the AI Ask Question API endpoint
 * Sends a question and receives a text answer
 */
export async function aiAskQuestion(question: string): Promise<string> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/ai/ask-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw buildAIError(
        parseErrorType(response.status, result.error),
        result.error || "AI request failed."
      );
    }

    if (!result.answer) {
      throw buildAIError("parse", "AI returned an empty response.");
    }

    return result.answer;
  } catch (error: any) {
    if (error.type && error.message) {
      throw error;
    }
    throw parseAIError(error);
  }
}

/**
 * Map HTTP status codes to AI error types
 */
function parseErrorType(status: number, message?: string): AIError["type"] {
  if (status === 429) return "quota";
  if (status === 400 && message?.includes("safety")) return "safety";
  if (status >= 500) return "network";
  return "unknown";
}

/**
 * Parse generic errors into structured AI errors
 */
function parseAIError(error: any): AIError {
  const message = error?.message || "An unknown error occurred.";

  if (message.includes("safety") || message.includes("SAFETY")) {
    return buildAIError("safety", message);
  }

  if (message.includes("quota") || message.includes("QUOTA") || message.includes("429")) {
    return buildAIError("quota", "AI service is currently busy. Please try again later.");
  }

  if (message.includes("fetch") || message.includes("NetworkError") || message.includes("Failed to fetch")) {
    return buildAIError("network", "AI service is temporarily unavailable. Please try again.");
  }

  return buildAIError("unknown", message);
}

function buildAIError(type: AIError["type"], message: string): AIError {
  return { type, message };
}