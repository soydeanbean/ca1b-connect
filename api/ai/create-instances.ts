// api/ai/create-instances.ts
// Vercel Serverless Function — handles AI Create Instances
// No Firebase Cloud Functions needed — runs on Vercel free tier

import type { VercelRequest, VercelResponse } from "@vercel/node";

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

const SYSTEM_PROMPT = `You are an AI assistant for a class management system called CA1B Connect.
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
- Extract dates in YYYY-MM-DD format
- Extract times in HH:MM format (24-hour)
- For announcements, determine if it's major (urgent/important to all) or minor (general info)
- If input doesn't match any category, default to "announcement" with category "minor"`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({ error: "Prompt too long. Maximum 5000 characters." });
    }

    // Check Firebase auth by verifying the Authorization header
    // Vercel doesn't validate Firebase auth automatically, but the frontend
    // sends the Firebase ID token. We just proxy to Gemini.

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText.slice(0, 1000));

      if (response.status === 429 || errText.includes("RATE_LIMIT") || errText.includes("quota")) {
        return res.status(429).json({ error: "AI rate limit reached. Gemini free tier has daily limits. Please try again tomorrow." });
      }
      if (response.status === 403 || errText.includes("API_KEY") || errText.includes("NOT_FOUND")) {
        return res.status(500).json({ error: "AI service configuration error — check Vercel environment variable GEMINI_API_KEY." });
      }
      if (response.status === 400 && errText.includes("SAFETY")) {
        return res.status(400).json({ error: "AI blocked due to safety concerns. Please rephrase." });
      }

      return res.status(500).json({ error: `AI service error (${response.status}). Try again later.` });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({ error: "AI returned an empty response." });
    }

    // Parse JSON from response
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```(?:json)?\n?/g, "").trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.type) {
      return res.status(500).json({ error: "AI response missing type field." });
    }

    // Validate and normalize
    const validTypes = ["assignment", "activity", "project", "announcement"];
    if (!validTypes.includes(parsed.type)) {
      parsed.type = "announcement";
      parsed.category = "minor";
    }

    // Validate subject code for non-announcements
    if (parsed.type !== "announcement" && parsed.subjectCode && !SUBJECT_CODES.includes(parsed.subjectCode)) {
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

    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("AI Create Instances error:", error);
    return res.status(500).json({ error: error.message || "AI analysis failed." });
  }
}