import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { MembershipSubscriptionIdSchema, type MembershipSnapshot } from "./domain.ts";
import { deriveLegacyMemberDetails, deriveLegacyRecurringReceipt, validateLegacyReceiptReplay } from "./legacy-receipt-policy.ts";

/** Preserve legacy receipt/contact behavior without adding another membership-grant writer. */
export async function recordLegacyRecurringReceipt(
  sessionInput: unknown,
  snapshot: MembershipSnapshot,
  uid: string,
): Promise<"written" | "ignored"> {
  const receipt = deriveLegacyRecurringReceipt(sessionInput, snapshot, uid);
  if (!receipt) return "ignored";
  const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
  const receiptRef = profileRef.collection("transactions").doc(receipt.transaction.sessionId);
  return firebaseAdmin.db.runTransaction(async (transaction) => {
    const [profileSnap, receiptSnap] = await Promise.all([transaction.get(profileRef), transaction.get(receiptRef)]);
    if (!profileSnap.exists) return "ignored";
    const profile = profileSnap.data()!;
    if (profile.lastSubscriptionId === undefined) return "ignored";
    const activeSubscriptionId = MembershipSubscriptionIdSchema.parse(profile.lastSubscriptionId);
    if (activeSubscriptionId !== snapshot.subscriptionId) return "ignored";

    const existing = receiptSnap.exists ? receiptSnap.data()! : undefined;
    if (existing) {
      validateLegacyReceiptReplay(existing, receipt);
      if (!(existing.createdAt instanceof Timestamp) || !(existing.updatedAt instanceof Timestamp) ||
        existing.updatedAt.toMillis() < existing.createdAt.toMillis()) {
        throw new Error("Legacy receipt timestamps are malformed or moved backwards");
      }
    }
    transaction.set(receiptRef, {
      ...receipt.transaction,
      createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(profileRef, {
      memberDetails: deriveLegacyMemberDetails(receipt, profile),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return "written";
  });
}
