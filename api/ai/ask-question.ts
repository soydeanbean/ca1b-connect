// api/ai/ask-question.ts
// Vercel Serverless Function — handles AI Ask Question
// No Firebase Cloud Functions needed — runs on Vercel free tier

import type { VercelRequest, VercelResponse } from "@vercel/node";

const SYSTEM_PROMPT = `You are a helpful AI assistant for CA1B Connect, a class management system.
Answer the user's question directly, concisely, and accurately.
Keep responses short and to the point. Do not add unnecessary explanations.
If you don't know the answer, say so honestly.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question } = req.body;

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
            maxOutputTokens: 512,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);

      if (response.status === 429) {
        return res.status(429).json({ error: "AI service is currently busy. Please try again later." });
      }
      if (response.status === 400 && errText.includes("SAFETY")) {
        return res.status(400).json({ error: "AI blocked the question due to safety concerns. Please rephrase." });
      }

      return res.status(500).json({ error: "AI service error." });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({ error: "AI returned an empty response." });
    }

    return res.status(200).json({ success: true, answer: text.trim() });
  } catch (error: any) {
    console.error("AI Ask Question error:", error);
    return res.status(500).json({ error: error.message || "AI request failed." });
  }
}