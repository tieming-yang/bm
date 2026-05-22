import API from "@/app/api/api";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";

export async function verifyAdmin(request: NextRequest) {
  const token = API.getBearerToken(request);
  const decodedToken = await firebaseAdmin.auth.verifyIdToken(token);
  const profileSnap = await firebaseAdmin.db.doc(`profiles/${decodedToken.uid}`).get();
  
  if (!profileSnap.exists || profileSnap.data()?.role !== "admin") {
    // Return "Not Found" to obfuscate the forbidden admin resource
    throw new Error("Not Found");
  }
  return decodedToken;
}
