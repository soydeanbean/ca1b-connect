// api/ai/ask-with-context.ts
// Vercel Serverless Function — AI Q&A with class data context
// Free tier: Gemini API + Vercel

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, classData } = req.body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({ error: "Question is required." });
    }

    if (question.length > 2000) {
      return res.status(400).json({ error: "Question too long. Maximum 2000 characters." });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured." });
    }

    // Get current PH time
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const phDateStr = phTime.toLocaleDateString("en-CA"); // YYYY-MM-DD format
    const phTimeStr = phTime.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
    const phDay = phTime.toLocaleDateString("en-PH", { weekday: "long", timeZone: "Asia/Manila" });

    const SYSTEM_PROMPT = `You are a helpful AI assistant for CA1B Connect, a class management system for a Philippine high school class.

CURRENT DATE AND TIME (Philippines GMT+8):
- Date: ${phDateStr}
- Day: ${phDay}
- Time: ${phTimeStr}

CLASS DATA (real data from the database):
${classData || "No class data available."}

INSTRUCTIONS:
- Answer questions using the CLASS DATA provided above. Be specific and reference actual subject codes, dates, and titles.
- If the user asks about "today" or "tomorrow", use the CURRENT DATE above.
- If the data doesn't contain the answer, say "I don't have that information in the database yet."
- Be concise but helpful.
- Use Philippines time (GMT+8) for all date/time references.`;

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
              parts: [{ text: question }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText.slice(0, 500));

      if (response.status === 429 || errText.includes("RATE_LIMIT") || errText.includes("quota")) {
        return res.status(429).json({ error: "AI rate limit reached. Please try again tomorrow." });
      }
      if (response.status === 403 || errText.includes("API_KEY")) {
        return res.status(500).json({ error: "AI service configuration error." });
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

    return res.status(200).json({ success: true, answer: text.trim() });
  } catch (error: any) {
    console.error("AI Ask with Context error:", error);
    return res.status(500).json({ error: error.message || "AI request failed." });
  }
}