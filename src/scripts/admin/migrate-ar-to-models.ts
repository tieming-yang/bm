import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

async function main() {
  const { default: firebaseAdmin } = await import("../../lib/firebase/firebase-admin.ts");
  const snap = await firebaseAdmin.db.collection("ar").orderBy("title", "asc").get();
  const batch = firebaseAdmin.db.batch();

  snap.docs.forEach((doc, index) => {
    const data = doc.data();
    const modelRef = firebaseAdmin.db.collection("models").doc();

    batch.set(modelRef, {
      title: data.title,
      modelPath: data.modelPath,
      contentType: data.contentType,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`Updated ${snap.size} AR documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
