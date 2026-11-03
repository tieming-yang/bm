import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

const app = getApps().length ? getApps()[0] : initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

/** Fill missing defaults from current state so delayed trigger retries preserve paid access. */
export const onProfileCreated = onDocumentCreated("profiles/{uid}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(snap.ref);
    if (!latest.exists) return;
    const current = latest.data();
    if (!current) throw new Error("Existing profile has no data");
    const updates: Record<string, unknown> = {};

    if (!("memberType" in current)) updates.memberType = "free";
    if (!("accountType" in current)) updates.accountType = "personal";
    if (!("role" in current)) updates.role = "user";
    if (!("savedChildren" in current)) updates.savedChildren = [];
    if (!("isEbVolunteer" in current)) updates.isEbVolunteer = null;
    if (!("memberDetails" in current)) {
      updates.memberDetails = {
        name: null,
        phone: null,
        address: {
          city: null,
          country: null,
          line1: null,
          line2: null,
          postalCode: null,
          state: null,
        },
        emergencyContact: {
          firstName: null,
          lastName: null,
          phoneNumber: null,
        },
      };
    }
    if (!("createdAt" in current)) updates.createdAt = latest.createTime ?? Timestamp.now();

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = FieldValue.serverTimestamp();
      transaction.set(snap.ref, updates, { merge: true });
    }
  });
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
