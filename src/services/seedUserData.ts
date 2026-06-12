import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function seedUserData(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return;

  await setDoc(ref, {
    role: "student",
    createdAt: new Date(),
  });

  console.log("User seeded");
}