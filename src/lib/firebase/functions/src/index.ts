/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

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
