import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhNUpANiph4TBFkyk8mKsMm7zdHmJgu40",
  authDomain: "ca1b-connect.firebaseapp.com",
  projectId: "ca1b-connect",
  storageBucket: "ca1b-connect.firebasestorage.app",
  messagingSenderId: "933169675360",
  appId: "1:933169675360:web:3fb0117b8b3021ac315705",
  measurementId: "G-0ER6TCQYN7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);