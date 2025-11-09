import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!GOOGLE_APPLICATION_CREDENTIALS) throw new Error("Mssing Firebase Admin Service Account");

const serviceAccount = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS);

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

const db = getFirestore(app);
const auth = getAuth(app);

export default { app, db, auth };
