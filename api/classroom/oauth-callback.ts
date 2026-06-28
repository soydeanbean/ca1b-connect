// api/classroom/oauth-callback.ts
// Vercel Serverless Function — Google OAuth callback
// Exchanges code for tokens, redirects to frontend with tokens in URL

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
      return res.status(400).send('<html><body><p>Missing parameters. <a href="/settings">Go back</a></p></body></html>');
    }

    // Decode state to get userId
    let userId = "";
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      userId = stateData.userId || "";
    } catch {
      return res.status(400).send('<html><body><p>Invalid state. <a href="/settings">Go back</a></p></body></html>');
    }

    if (!userId) {
      return res.status(400).send('<html><body><p>User not identified. <a href="/settings">Go back</a></p></body></html>');
    }

    const CLIENT_ID = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
    const REDIRECT_URI = `https://${process.env.VERCEL_URL || "ca1b-connect.vercel.app"}/api/classroom/oauth-callback`;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).send('<html><body><p>OAuth not configured. <a href="/settings">Go back</a></p></body></html>');
    }

    // Exchange code for tokens
    let accessToken = "", refreshToken = "", expiresIn = 3600;
    try {
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenResp.json();
      if (tokenResp.ok) {
        accessToken = tokenData.access_token || "";
        refreshToken = tokenData.refresh_token || "";
        expiresIn = tokenData.expires_in || 3600;
      } else {
        return res.status(500).send(`<html><body><p>Token exchange failed: ${tokenData.error_description || tokenData.error}. <a href="/settings">Go back</a></p></body></html>`);
      }
    } catch (e: any) {
      return res.status(500).send(`<html><body><p>Token exchange error: ${e.message}. <a href="/settings">Go back</a></p></body></html>`);
    }

    // Build token payload and encode for URL
    const tokenPayload = JSON.stringify({
      accessToken,
      refreshToken,
      expiryDate: Date.now() + expiresIn * 1000
    });
    const tokenBase64 = Buffer.from(tokenPayload).toString("base64");

    // Return HTML that redirects to the SPA
    const html = `<!DOCTYPE html>
<html>
<head><title>Connecting Classroom...</title></head>
<body>
  <p>Connecting Google Classroom... Please wait.</p>
  <script>
    window.location.href = "/settings?classroom=success&tokens=${encodeURIComponent(tokenBase64)}&uid=${encodeURIComponent(userId)}";
  </script>
</body>
</html>`;

    return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (error: any) {
    return res.status(500).send(`<html><body><p>Error: ${error.message}. <a href="/settings">Go back</a></p></body></html>`);
  }
}