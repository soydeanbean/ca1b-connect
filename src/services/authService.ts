import { auth } from "../lib/firebase";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";

export async function registerUser(
  email: string,
  password: string
) {
  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  await sendEmailVerification(
    credential.user
  );

  await signOut(auth);

  return credential;
}

export function loginUser(
  email: string,
  password: string
) {
  return signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}

export function logoutUser() {
  return signOut(auth);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  return signInWithPopup(auth, provider);
}