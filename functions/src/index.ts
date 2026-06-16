/**
 * CA1B Connect - Firebase Functions
 * 
 * Note: AI features have been moved to Vercel API routes (api/ai/)
 * for compatibility with Firebase free tier (Spark plan).
 * See /api/ai/ directory in the project root.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

initializeApp();

setGlobalOptions({ maxInstances: 10 });
