import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import {
  MembershipAccountClaimSchema,
  MembershipExistingSubscriptionSchema,
  MembershipProfileSchema,
  MembershipPurchaseSchema,
  MembershipSubscriptionIdSchema,
  MembershipUidSchema,
  createMembershipSubscriptionView,
  type MembershipPurchase,
  type MembershipTransactionState,
  type MembershipTransition,
} from "./domain.ts";

/** Transaction boundary shared by guest claims, legacy checkout, and recurring reconciliation. */
export type MembershipStore = {
  readPurchase: (subscriptionId: string) => Promise<MembershipPurchase | null>;
  transact: (
    subscriptionId: string,
    uid: string | undefined,
    decide: (state: MembershipTransactionState) => MembershipTransition,
  ) => Promise<MembershipTransition>;
};

function readPurchase(data: unknown, subscriptionId: string): MembershipPurchase {
  const purchase = MembershipPurchaseSchema.parse(data);
  if (purchase.snapshot.subscriptionId !== subscriptionId) throw new Error("Stored membership subscription ID differs from its document path");
  return purchase;
}

/** Firebase stores private purchases outside every client-readable profile path. */
export const membershipStore: MembershipStore = {
  readPurchase: async (subscriptionId) => {
    MembershipSubscriptionIdSchema.parse(subscriptionId);
    const snap = await firebaseAdmin.db.doc(`membershipPurchases/${subscriptionId}`).get();
    return snap.exists ? readPurchase(snap.data(), subscriptionId) : null;
  },
  transact: async (subscriptionId, uid, decide) => {
    MembershipSubscriptionIdSchema.parse(subscriptionId);
    if (uid !== undefined) MembershipUidSchema.parse(uid);
    const purchaseRef = firebaseAdmin.db.doc(`membershipPurchases/${subscriptionId}`);
    return firebaseAdmin.db.runTransaction(async (transaction) => {
      const purchaseSnap = await transaction.get(purchaseRef);
      const purchase = purchaseSnap.exists ? readPurchase(purchaseSnap.data(), subscriptionId) : null;
      let state: MembershipTransactionState = { purchase, profile: null, subscriptions: [], accountClaim: null, accountPurchase: null };
      let existingSubscriptionData: Record<string, unknown> | undefined;
      if (uid !== undefined) {
        const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
        const [profileSnap, subscriptionsSnap, accountSnap] = await Promise.all([
          transaction.get(profileRef),
          transaction.get(profileRef.collection("subscriptions")),
          transaction.get(firebaseAdmin.db.doc(`membershipAccountClaims/${uid}`)),
        ]);
        const accountClaim = accountSnap.exists ? MembershipAccountClaimSchema.parse(accountSnap.data()) : null;
        if (accountClaim && accountClaim.uid !== uid) throw new Error("Stored membership account claim differs from its document path");
        let accountPurchase = null;
        if (accountClaim) {
          if (accountClaim.subscriptionId === subscriptionId) accountPurchase = purchase;
          else {
            const old = await transaction.get(firebaseAdmin.db.doc(`membershipPurchases/${accountClaim.subscriptionId}`));
            accountPurchase = old.exists ? readPurchase(old.data(), accountClaim.subscriptionId) : null;
          }
          if (accountPurchase && accountPurchase.ownership.kind !== "unclaimed" && accountPurchase.ownership.uid !== uid) throw new Error("Stored membership account claim has another owner");
        }
        const subscriptions = subscriptionsSnap.docs.map((doc) => {
          const data = doc.data();
          if (data.id !== undefined && data.id !== doc.id) throw new Error("Stored subscription ID differs from its document path");
          if (doc.id === subscriptionId) existingSubscriptionData = data;
          return MembershipExistingSubscriptionSchema.parse({
            id: doc.id,
            status: data.status,
            currentPeriodEndMs: typeof data.currentPeriodEnd === "number" ? data.currentPeriodEnd * 1000 : undefined,
          });
        });
        state = { purchase, profile: profileSnap.exists ? MembershipProfileSchema.parse(profileSnap.data()) : null, subscriptions, accountClaim, accountPurchase };
      }

      const decision = decide(state);
      if (decision.purchase) {
        const next = readPurchase(decision.purchase, subscriptionId);
        if (purchase && (next.createdAtMs !== purchase.createdAtMs || next.updatedAtMs < purchase.updatedAtMs)) throw new Error("Membership persistence timestamps changed illegally");
        transaction.set(purchaseRef, next);
      }
      if (decision.accountClaim) {
        if (!uid || decision.accountClaim.uid !== uid || decision.accountClaim.subscriptionId !== subscriptionId) throw new Error("Membership reservation write has an unexpected owner");
        transaction.set(firebaseAdmin.db.doc(`membershipAccountClaims/${uid}`), MembershipAccountClaimSchema.parse(decision.accountClaim));
      }
      if (decision.projection) {
        const { snapshot, grant } = decision.projection;
        if (!uid || decision.projection.uid !== uid || snapshot.subscriptionId !== subscriptionId) throw new Error("Membership projection write has an unexpected owner");
        const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
        if (!decision.purchase) throw new Error("Membership projection requires a canonical purchase write");
        if (existingSubscriptionData?.createdAt !== undefined && !(existingSubscriptionData.createdAt instanceof Timestamp)) throw new Error("Stored subscription creation timestamp is malformed");
        const updatedAt = FieldValue.serverTimestamp();
        const subscriptionData = {
          ...createMembershipSubscriptionView(snapshot),
          updatedAt,
          createdAt: existingSubscriptionData?.createdAt ?? updatedAt,
        };
        transaction.set(profileRef.collection("subscriptions").doc(subscriptionId), subscriptionData, { merge: true });
        if (grant !== "unchanged") {
          transaction.update(profileRef, {
            memberType: grant,
            ...(grant !== "free" ? { lastSubscriptionId: subscriptionId } : {}),
            ...(grant !== "free" && snapshot.source === "legacy" ? { lastTransactionId: snapshot.sessionId } : {}),
            updatedAt,
          });
        }
      }
      return decision;
    });
  },
};
