// api/classroom/oauth-init.ts
// Vercel Serverless Function — Initiate Google OAuth flow for Classroom
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const CLIENT_ID = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
    // Use explicit redirect URI from env var, or fall back to Vercel URL, or localhost
    const REDIRECT_URI = process.env.GOOGLE_CLASSROOM_REDIRECT_URI
      || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/classroom/oauth-callback`
        : "http://localhost:5173/api/classroom/oauth-callback");

    if (!CLIENT_ID) {
      return res.status(500).json({ error: "Google Classroom OAuth not configured." });
    }

    const scopes = [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.readonly",
      "https://www.googleapis.com/auth/classroom.announcements.readonly",
      "https://www.googleapis.com/auth/classroom.topics.readonly",
      "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly"
    ];

    const state = Buffer.from(
      JSON.stringify({
        nonce: Math.random().toString(36).substring(2),
        userId: req.query.uid as string || "",
        redirectTo: req.query.redirect as string || "/settings"
      })
    ).toString("base64");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return res.status(200).json({
      success: true,
      authUrl: authUrl.toString()
    });
  } catch (error: any) {
    console.error("OAuth init error:", error);
    return res.status(500).json({ error: error.message || "Failed to initiate OAuth." });
  }
}