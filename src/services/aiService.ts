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

/**
 * Gather class data from Firestore and format as text for AI context
 * This runs on the client side (free Firestore reads) and sends to the AI
 */
export async function gatherClassDataForAI(): Promise<string> {
  try {
    const { getAllSubjects, getSubjectActivities, getAllSessions } = await import("./subjectService");
    const { getAllSubjectAnnouncements } = await import("./subjectAnnouncementService");
    const { getActivities } = await import("./activityService");
    const { getCalendarEvents } = await import("./eventService");
    const { getAllSchedules } = await import("../data/ScheduleData");

    const subjects = getAllSubjects();
    const schedule = getAllSchedules();

    let context = "";

    // Subjects
    context += "=== SUBJECTS ===\n";
    subjects.forEach(s => {
      context += `${s.code}: ${s.name} (Room: ${s.room})\n`;
    });

    // Schedule
    context += "\n=== WEEKLY SCHEDULE ===\n";
    for (const [day, entries] of Object.entries(schedule)) {
      context += `${day}:\n`;
      entries.forEach((e: any) => {
        context += `  ${e.time} - ${e.subjectCode}: ${e.subjectName} @ ${e.room}\n`;
      });
    }

    // Subject Activities (load from all subjects)
    context += "\n=== SUBJECT ACTIVITIES ===\n";
    const subjectCodes = subjects.map(s => s.code).filter(c => c !== "ASSEMBLY" && c !== "EXAMEN");
    const activityPromises = subjectCodes.map(code => getSubjectActivities(code));
    const activityResults = await Promise.all(activityPromises);
    const allActivities = activityResults.flat();
    allActivities.forEach(a => {
      const completedCount = Object.keys(a.completedBy || {}).length;
      context += `[${a.subjectCode}] ${a.title} - ${a.type} - Due: ${a.dueDate} ${a.dueTime || ""} - ${completedCount} submitted\n`;
    });

    // Subject Announcements
    context += "\n=== SUBJECT ANNOUNCEMENTS ===\n";
    try {
      const announcements = await getAllSubjectAnnouncements();
      announcements.slice(0, 20).forEach(a => {
        context += `[${a.subjectCode}] ${a.title} - ${a.content.slice(0, 100)} - ${a.pinned ? "Pinned" : ""}\n`;
      });
    } catch (e) {
      context += "(Could not load announcements)\n";
    }

    // Global Activities
    context += "\n=== GLOBAL ACTIVITIES ===\n";
    try {
      const globalActivities = await getActivities();
      globalActivities.slice(0, 20).forEach(a => {
        context += `${a.title} - ${a.type} - Due: ${a.deadline}\n`;
      });
    } catch (e) {
      context += "(Could not load global activities)\n";
    }

    // Events
    context += "\n=== CALENDAR EVENTS ===\n";
    try {
      const events = await getCalendarEvents();
      events.slice(0, 20).forEach(e => {
        context += `${e.title} - ${e.date} ${e.time || ""} - ${e.type}\n`;
      });
    } catch (e) {
      context += "(Could not load events)\n";
    }

    // Attendance Sessions (summary)
    context += "\n=== RECENT ATTENDANCE SESSIONS ===\n";
    try {
      const sessions = await getAllSessions();
      sessions.slice(0, 10).forEach(s => {
        context += `[${s.subjectCode}] ${s.date} - ${s.status} - ${s.summary.present} present, ${s.summary.late} late, ${s.summary.absent} absent\n`;
      });
    } catch (e) {
      context += "(Could not load attendance)\n";
    }

    return context;
  } catch (error) {
    console.error("Failed to gather class data:", error);
    return "Could not load class data from database.";
  }
}

/**
 * Ask AI a question with class data context
 * Frontend reads Firestore (free), sends data to AI API
 */
export async function aiAskWithContext(question: string): Promise<string> {
  try {
    // Gather class data from Firestore (free reads)
    const classData = await gatherClassDataForAI();

    const response = await fetch(`${getApiBaseUrl()}/api/ai/ask-with-context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question, classData }),
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

function buildAIError(type: AIError["type"], message: string): AIError {
  return { type, message };
}
