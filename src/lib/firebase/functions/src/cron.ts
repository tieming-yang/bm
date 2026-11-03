import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

/** Expire only the recurring subscription still referenced at transaction commit. */
export const checkSubscriptionExpiry = onSchedule(
  {schedule: "every 24 hours", timeZone: "Etc/UTC"},
  async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const profiles = await db.collection("profiles").get();
    const tasks = profiles.docs.map((profileDoc) => db.runTransaction(async (transaction) => {
      const current = await transaction.get(profileDoc.ref);
      if (!current.exists) return;
      const memberType = current.get("memberType");
      if (memberType === undefined || memberType === "free" || memberType === "lifeTime") return;
      if (memberType !== "monthly" && memberType !== "yearly") {
        throw new Error("Invalid recurring profile member type");
      }
      const lastSubscriptionId = current.get("lastSubscriptionId");
      if (typeof lastSubscriptionId !== "string" || !/^sub_[A-Za-z0-9]+$/.test(lastSubscriptionId)) {
        throw new Error("Recurring profile has an invalid subscription reference");
      }
      const subSnap = await transaction.get(profileDoc.ref.collection("subscriptions").doc(lastSubscriptionId));
      if (!subSnap.exists) return;

      const currentPeriodEnd = subSnap.get("currentPeriodEnd");
      const status = subSnap.get("status");
      const entitlementPolicy = subSnap.get("entitlementPolicy");
      if (entitlementPolicy !== undefined && entitlementPolicy !== "paid_period_v1") {
        throw new Error("Subscription has an invalid entitlement policy");
      }
      if (!Number.isSafeInteger(currentPeriodEnd) || currentPeriodEnd < 0) {
        throw new Error("Subscription has an invalid current period end");
      }
      if (!["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"].includes(status)) {
        throw new Error("Subscription has an invalid status");
      }

      // New projections end at proven payment coverage, including failed renewals.
      if ((entitlementPolicy === "paid_period_v1" || status === "canceled") && currentPeriodEnd <= nowSeconds) {
        transaction.set(profileDoc.ref, {memberType: "free", updatedAt: FieldValue.serverTimestamp()}, {merge: true});
      }
    }));

    const results = await Promise.allSettled(tasks);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
);
