/**
 * CA1B Connect - Firebase Functions
 * 
 * Note: AI features have been moved to Vercel API routes (api/ai/)
 * for compatibility with Firebase free tier (Spark plan).
 * See /api/ai/ directory in the project root.
 * 
 * All features are designed to work on the Firebase Spark (free) plan.
 * The Spark plan supports Firestore triggers, Auth, and Hosting.
 * 
 * ⚠️ Push notification triggers via Cloud Functions require Blaze plan,
 * so they have been removed. Instead, the client-side (browser) handles
 * in-app notifications via Firestore listeners (NotificationContext.tsx).
 * This is 100% free and works on Spark plan.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

initializeApp();

setGlobalOptions({ maxInstances: 10 });
