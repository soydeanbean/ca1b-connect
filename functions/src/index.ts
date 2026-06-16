/**
 * CA1B Connect - Firebase Cloud Functions
 * 
 * AI-powered features using Gemini API
 */

import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
// Initialize Firebase Admin
initializeApp();

setGlobalOptions({ maxInstances: 10 });

const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SUBJECTS_LIST = [
  { code: "HRGP001", name: "Homeroom Guidance Program I" },
  { code: "CORS001", name: "Effective Communication" },
  { code: "CORS002", name: "Mabisang Komunikasyon" },
  { code: "CORS003", name: "Life and Career Skills" },
  { code: "CORS004", name: "Pag-aaral ng Kasaysayan at Lipunang Pilipino (PKLP)" },
  { code: "CORS005", name: "General Mathematics" },
  { code: "CORS006", name: "General Science" },
  { code: "CTES004", name: "Computer Systems Servicing" },
  { code: "FLPS001", name: "Introduction to Christian Faith" },
  { code: "SRPS001", name: "SHS Reading Program I" }
];

const SUBJECT_CODES = SUBJECTS_LIST.map(s => s.code);

// ─── Helper: Verify authenticated user ───
function assertAuth(context: any): string {
  if (!context.auth) {
    throw new Error("Authentication required.");
  }
  return context.auth.uid;
}

// ─── SYSTEM PROMPT for Create Instances ───
const CREATE_INSTANCES_SYSTEM_PROMPT = `You are an AI assistant for a class management system called CA1B Connect.
Your task is to analyze user input (an announcement or activity text) and classify it into ONE of these categories:
1. Assignment
2. Activity
3. Project
4. Announcement

AVAILABLE SUBJECTS (use the code for subject field):
${SUBJECTS_LIST.map(s => `- ${s.code}: ${s.name}`).join("\n")}

## If Assignment / Activity / Project:
Return STRICT JSON with this structure:
{
  "type": "assignment" | "activity" | "project",
  "title": "extracted title",
  "subjectCode": "best matching subject code from the list above",
  "subjectName": "full subject name",
  "description": "extracted description or instructions",
  "dueDate": "YYYY-MM-DD format if found, otherwise empty string",
  "dueTime": "HH:MM format if found, otherwise empty string"
}

## If Announcement:
Return STRICT JSON with this structure:
{
  "type": "announcement",
  "category": "major" | "minor",
  "title": "extracted title",
  "content": "full announcement message",
  "urgency": "high" | "medium" | "low",
  "targetSubjectCode": "subject code if applicable, otherwise empty string",
  "targetSubjectName": "subject name if applicable, otherwise empty string"
}

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences, no extra text
- For assignments/activities/projects, always pick the most relevant subject from the list
- If no subject matches, use the closest one or empty string
- Extract dates in YYYY-MM-DD format
- Extract times in HH:MM format (24-hour)
- For announcements, determine if it's major (urgent/important to all) or minor (general info)
- If the input doesn't clearly match any category, default to "announcement" with category "minor"`;

// ─── SYSTEM PROMPT for Ask Question ───
const ASK_QUESTION_SYSTEM_PROMPT = `You are a helpful AI assistant for CA1B Connect, a class management system.
Answer the user's question directly, concisely, and accurately.
Keep responses short and to the point. Do not add unnecessary explanations.
If you don't know the answer, say so honestly.`;

// ─── Callable: aiCreateInstances ───
export const aiCreateInstances = onCall(
  { cors: true, maxInstances: 5 },
  async (request) => {
    const uid = assertAuth(request.auth);
    const { prompt } = request.data;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("Prompt is required.");
    }

    if (prompt.length > 5000) {
      throw new Error("Prompt is too long. Maximum 5000 characters.");
    }

    logger.info(`aiCreateInstances called by user ${uid}`, { promptLength: prompt.length });

    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction: CREATE_INSTANCES_SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      });

      const text = response.text || "";
      logger.info("AI response received", { textLength: text.length });

      // Parse JSON from response - handle potential markdown fences
      let jsonStr = text.trim();
      
      // Remove markdown code fences if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```(?:json)?\n?/g, "").trim();
      }

      const parsed = JSON.parse(jsonStr);

      // Validate the parsed result
      if (!parsed.type) {
        throw new Error("AI response missing 'type' field");
      }

      // Normalize and validate
      const validTypes = ["assignment", "activity", "project", "announcement"];
      if (!validTypes.includes(parsed.type)) {
        parsed.type = "announcement";
        parsed.category = "minor";
      }

      // For assignments/activities/projects, validate subject
      if (parsed.type !== "announcement") {
        if (parsed.subjectCode && !SUBJECT_CODES.includes(parsed.subjectCode)) {
          // Try to find closest match
          const closest = SUBJECTS_LIST.find(s => 
            s.name.toLowerCase().includes(parsed.subjectCode.toLowerCase()) ||
            parsed.subjectCode.toLowerCase().includes(s.code.toLowerCase())
          );
          if (closest) {
            parsed.subjectCode = closest.code;
            parsed.subjectName = closest.name;
          } else {
            parsed.subjectCode = "";
            parsed.subjectName = "";
          }
        }
      }

      return { success: true, data: parsed };
    } catch (error: any) {
      logger.error("AI Create Instances failed", error);
      
      // Check for specific error types
      if (error.message?.includes("SAFETY") || error.message?.includes("safety")) {
        throw new Error("AI blocked the request due to safety concerns. Please rephrase your input.");
      }
      
      if (error.message?.includes("quota") || error.message?.includes("QUOTA")) {
        throw new Error("AI service quota exceeded. Please try again later.");
      }

      throw new Error(`AI analysis failed: ${error.message || "Unknown error"}`);
    }
  }
);

// ─── Callable: aiAskQuestion ───
export const aiAskQuestion = onCall(
  { cors: true, maxInstances: 10 },
  async (request) => {
    const uid = assertAuth(request.auth);
    const { question } = request.data;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      throw new Error("Question is required.");
    }

    if (question.length > 2000) {
      throw new Error("Question is too long. Maximum 2000 characters.");
    }

    logger.info(`aiAskQuestion called by user ${uid}`, { questionLength: question.length });

    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: question }] }
        ],
        config: {
          systemInstruction: ASK_QUESTION_SYSTEM_PROMPT,
          temperature: 0.3,
          maxOutputTokens: 512,
        }
      });

      const text = response.text || "";
      logger.info("AI question response received", { textLength: text.length });

      return { success: true, answer: text.trim() };
    } catch (error: any) {
      logger.error("AI Ask Question failed", error);
      
      if (error.message?.includes("SAFETY") || error.message?.includes("safety")) {
        throw new Error("AI blocked the question due to safety concerns. Please rephrase.");
      }

      throw new Error(`AI request failed: ${error.message || "Unknown error"}`);
    }
  }
);