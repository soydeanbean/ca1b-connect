// src/services/aiService.ts

import { getActivities } from "./activityService";
import { getCalendarEvents } from "./eventService";

// Gemini API free tier endpoint
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const DEFAULT_API_KEY = "AIzaSyD8cSx8JQmFUjGg4FKINjuH2WEgTXsYHLo"; // public demo key, user can override

type AiMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

let conversationHistory: AiMessage[] = [];
let systemContext = "";

/**
 * Build the system context from CA1B Connect data.
 * Call this once when the widget opens.
 */
export async function buildContext(): Promise<string> {
  try {
    const [activities, events] = await Promise.all([
      getActivities().catch(() => []),
      getCalendarEvents().catch(() => [])
    ]);

    const parts: string[] = [];

    parts.push(
      "You are an AI assistant for CA1B Connect, a class management website for section CA1B at Ateneo de Naga University."
    );
    parts.push("Respond concisely and helpfully.");

    if (activities.length > 0) {
      parts.push("\nCurrent class activities:");
      activities.slice(0, 10).forEach((a) => {
        const completedCount = Object.keys(a.completedBy || {}).length;
        parts.push(
          `- [${a.type}] "${a.title}" due ${a.deadline}, ${completedCount} students completed`
        );
      });
    }

    if (events.length > 0) {
      parts.push("\nUpcoming events:");
      events.slice(0, 10).forEach((e) => {
        parts.push(`- [${e.type}] "${e.title}" on ${e.date}${e.time ? ` at ${e.time}` : ""}`);
      });
    }

    systemContext = parts.join("\n");
    return systemContext;
  } catch {
    systemContext =
      "You are an AI assistant for CA1B Connect at Ateneo de Naga University. Be helpful and concise.";
    return systemContext;
  }
}

/**
 * Get the Gemini API key (custom or default).
 */
function getApiKey(): string {
  const stored = localStorage.getItem("ca1b_ai_key");
  return stored || DEFAULT_API_KEY;
}

/**
 * Send a message to Gemini and get response.
 */
export async function sendAiMessage(userMessage: string): Promise<string> {
  // Build context on first message if empty
  if (!systemContext) {
    await buildContext();
  }

  // Build messages array
  const messages: AiMessage[] = [];

  // System context as first message
  messages.push({
    role: "user",
    parts: [{ text: systemContext }]
  });

  // Add recent conversation history (last 10 exchanges)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push(msg);
  }

  // Add current user message
  messages.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  try {
    const apiKey = getApiKey();
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role,
          parts: m.parts
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that.";

    // Store in history
    conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage }]
    });
    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    return reply;
  } catch (err) {
    console.error("AI request failed:", err);
    return "Sorry, I had trouble connecting. Please check your internet connection or try again later.";
  }
}

/**
 * Clear conversation history.
 */
export function clearAiHistory() {
  conversationHistory = [];
  systemContext = "";
}