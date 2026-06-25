// api/classroom/oauth-callback.ts
// Vercel Serverless Function — Google OAuth callback handler
// Exchanges code for tokens, returns HTML page that stores tokens client-side

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(
        "/settings?classroom=error&message=" + encodeURIComponent("Access denied. Please try again.")
      );
    }

    if (!code || typeof code !== "string") {
      return res.redirect(
        "/settings?classroom=error&message=" + encodeURIComponent("No authorization code received.")
      );
    }

    // Decode state to get userId
    let userId = "";
    try {
      const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
      userId = stateData.userId || "";
    } catch {
      return res.redirect(
        "/settings?classroom=error&message=" + encodeURIComponent("Invalid state parameter.")
      );
    }

    if (!userId) {
      return res.redirect(
        "/settings?classroom=error&message=" + encodeURIComponent("User not identified. Please sign in again.")
      );
    }

    const CLIENT_ID = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_CLASSROOM_REDIRECT_URI
      || (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/classroom/oauth-callback`
        : "http://localhost:5173/api/classroom/oauth-callback");

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.redirect(
        "/settings?classroom=error&message=" + encodeURIComponent("OAuth not configured on server.")
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange error:", tokenData);
      return res.redirect(
        "/settings?classroom=error&message=" + encodeURIComponent(
          "Token exchange failed: " + (tokenData.error_description || tokenData.error || "unknown")
        )
      );
    }

    const tokenPayload = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
      scope: tokenData.scope || "",
      tokenType: tokenData.token_type || "Bearer",
      expiryDate: Date.now() + (tokenData.expires_in || 3600) * 1000
    };

    const tokenBase64 = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    // Return an HTML page that uses JavaScript to redirect to the SPA
    // This ensures the SPA loads properly and can read the URL params
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <script>
    // Use window.location to redirect to the SPA with the tokens
    window.location.href = "/settings?classroom=success&tokens=${encodeURIComponent(tokenBase64)}&uid=${encodeURIComponent(userId)}";
  </script>
</head>
<body>
  <p>Redirecting to CA1B Connect...</p>
  <noscript>
    <meta http-equiv="refresh" content="0;url=/settings?classroom=success&tokens=${encodeURIComponent(tokenBase64)}&uid=${encodeURIComponent(userId)}">
  </noscript>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return res.redirect(
      "/settings?classroom=error&message=" + encodeURIComponent(error.message || "OAuth callback failed.")
    );
  }
}