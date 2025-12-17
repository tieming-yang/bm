import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

export const checkSubscriptionExpiry = onSchedule(
  {schedule: "every 24 hours", timeZone: "Etc/UTC"},
  async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const profiles = await db.collection("profiles").get();
    const tasks = profiles.docs.map(async (profileDoc) => {
      const lastSubscriptionId = profileDoc.get("lastSubscriptionId");
      if (!lastSubscriptionId) return;

      const subSnap = await profileDoc.ref
        .collection("subscriptions")
        .doc(lastSubscriptionId)
        .get();
      if (!subSnap.exists) return;

      const currentPeriodEnd = subSnap.get("currentPeriodEnd");
      const status = subSnap.get("status");
      if (typeof currentPeriodEnd !== "number" || status !== "canceled") return;

      if (currentPeriodEnd <= nowSeconds) {
        await Promise.all([
          profileDoc.ref.set(
            {memberType: "free", updatedAt: Timestamp.now()},
            {merge: true}
          ),
        ]);
      }
    });

    await Promise.allSettled(tasks);
  }
);
