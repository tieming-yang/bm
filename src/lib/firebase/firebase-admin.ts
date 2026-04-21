// src/lib/firebase/firebase-admin.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initFirebaseAdmin() {
  const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!rawCredentials) throw new Error("Missing Firebase Admin Service Account");

  const serviceAccount = JSON.parse(rawCredentials);
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
    });

  const db = getFirestore(app);

  const auth = getAuth(app);

  return { app, db, auth };
}

const firebaseAdmin = initFirebaseAdmin();

export { initFirebaseAdmin };
export default firebaseAdmin;
