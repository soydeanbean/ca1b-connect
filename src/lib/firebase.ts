import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase Web SDK config values are public by design.
// Firebase security is enforced via Security Rules, not by hiding these identifiers.
// These can be overridden via VITE_FIREBASE_* env vars for different environments.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAhNUpANiph4TBFkyk8mKsMm7zdHmJgu40",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ca1b-connect.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ca1b-connect",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ca1b-connect.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "933169675360",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:933169675360:web:3fb0117b8b3021ac315705",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0ER6TCQYN7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-southeast1");
