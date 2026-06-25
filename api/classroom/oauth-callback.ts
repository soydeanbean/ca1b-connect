// api/classroom/oauth-callback.ts
// Vercel Serverless Function — Google OAuth callback handler
// Receives auth code, exchanges for tokens, stores in Firestore
import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";

// Initialize Firebase Admin with explicit service account from env vars
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || "ca1b-connect",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId
    });
  } else {
    // Fallback: try application default (works locally, may fail on Vercel)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: serviceAccount.projectId
    });
  }
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

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
    // Compute redirect URI the same way as oauth-init.ts
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
        "/settings?classroom=error&message=" + encodeURIComponent("Failed to get access token: " + (tokenData.error_description || tokenData.error || "unknown"))
      );
    }

    // Store tokens in Firestore
    await db
      .collection("userPreferences")
      .doc(userId)
      .collection("classroomTokens")
      .doc("oauth")
      .set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        scope: tokenData.scope || "",
        tokenType: tokenData.token_type || "Bearer",
        expiryDate: Date.now() + (tokenData.expires_in || 3600) * 1000,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Enable classroom sync in user settings
    await db.collection("userPreferences").doc(userId).set({
      classroomSyncEnabled: true,
      lastClassroomSync: null,
      classroomSyncCount: 0
    }, { merge: true });

    return res.redirect("/settings?classroom=success");
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return res.redirect(
      "/settings?classroom=error&message=" + encodeURIComponent(error.message || "OAuth callback failed.")
    );
  }
}
