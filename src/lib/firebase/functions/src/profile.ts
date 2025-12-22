import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

const app = getApps().length ? getApps()[0] : initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

export const onProfileCreated = onDocumentCreated("profiles/{uid}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const current = snap.data() || {};
  const updates: Record<string, unknown> = {};

  if (!current.memberType) updates.memberType = "free";
  if (!current.accountType) updates.accountType = "personal";
  if (!current.role) updates.role = "user";
  if (!current.createdAt) updates.createdAt = Timestamp.now();
  updates.updatedAt = FieldValue.serverTimestamp();

  if (Object.keys(updates).length > 0) {
    await snap.ref.set(updates, { merge: true });
  }
});

export const onProfileDeleted = onDocumentDeleted("profiles/{uid}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const { uid } = event.params as { uid: string };

  await Promise.allSettled([
    // Remove any subcollections under this profile (subscriptions, transactions, etc.)
    db.recursiveDelete(snap.ref),
    // Delete the auth user
    auth.deleteUser(uid),
  ]);
  logger.info(`Deleted ${uid} and subcollections and auth user`, { structuredData: true });
});
