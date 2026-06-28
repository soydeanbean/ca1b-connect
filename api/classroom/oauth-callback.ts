// api/classroom/oauth-callback.ts
// Vercel Serverless Function — Google OAuth callback
// Exchanges code for tokens, redirects to frontend with tokens in URL

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
      return res.writeHead(302, { Location: "/settings?classroom=error&message=Missing%20parameters" }).end();
    }

    // Decode state to get userId
    let userId = "";
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      userId = stateData.userId || "";
    } catch {
      return res.writeHead(302, { Location: "/settings?classroom=error&message=Invalid%20state" }).end();
    }

    if (!userId) {
      return res.writeHead(302, { Location: "/settings?classroom=error&message=User%20not%20identified" }).end();
    }

    const CLIENT_ID = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.writeHead(302, { Location: "/settings?classroom=error&message=OAuth%20not%20configured" }).end();
    }

    // Exchange code for tokens
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: `https://${process.env.VERCEL_URL || "ca1b-connect.vercel.app"}/api/classroom/oauth-callback`,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || "Token exchange failed";
      return res.writeHead(302, { Location: `/settings?classroom=error&message=${encodeURIComponent(errMsg)}` }).end();
    }

    // Build encoded token payload
    const tokenPayload = JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
      expiryDate: Date.now() + (tokenData.expires_in || 3600) * 1000
    });
    const tokenBase64 = Buffer.from(tokenPayload).toString("base64");

    // 302 Redirect to the SPA with tokens
    const redirectUrl = `/settings?classroom=success&tokens=${encodeURIComponent(tokenBase64)}&uid=${encodeURIComponent(userId)}`;
    return res.writeHead(302, { Location: redirectUrl }).end();
  } catch (error: any) {
    return res.writeHead(302, { Location: `/settings?classroom=error&message=${encodeURIComponent(error.message)}` }).end();
  }
}