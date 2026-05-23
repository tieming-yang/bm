import dotenv from "dotenv";
import path from "path";

// Load local environment variables from .env.local first
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { default: firebaseAdmin } = await import("../../lib/firebase/firebase-admin.js");

  console.log("Fetching existing models to build path-to-ID map...");
  const modelsSnap = await firebaseAdmin.db.collection("models").get();
  
  const pathToModelId = new Map<string, string>();
  modelsSnap.forEach((doc) => {
    const data = doc.data();
    if (data.modelPath) {
      pathToModelId.set(data.modelPath, doc.id);
    }
  });
  console.log(`Loaded ${pathToModelId.size} model paths with their active document IDs.`);

  const collectionId = "IdUvsnz7gYqCAoddgSgY";
  console.log(`\nFetching collection "${collectionId}"...`);
  const docRef = firebaseAdmin.db.collection("ar").doc(collectionId);
  const snap = await docRef.get();

  if (!snap.exists) {
    console.error(`Collection with ID "${collectionId}" not found in Firestore.`);
    return;
  }

  const data = snap.data();
  const items = data?.items || [];
  console.log(`Found ${items.length} items. Checking for misaligned model IDs...`);

  let modified = false;
  const updatedItems = items.map((item: any, idx: number) => {
    const correctId = pathToModelId.get(item.modelPath);
    if (correctId) {
      if (item.modelId !== correctId) {
        console.log(`Item [${idx}] "${item.title}": Updating modelId from "${item.modelId}" -> "${correctId}"`);
        modified = true;
        return {
          ...item,
          modelId: correctId,
        };
      }
    } else {
      console.warn(`⚠️ Warning: No active model in database matching path "${item.modelPath}" for item "${item.title}"`);
    }
    return item;
  });

  if (modified) {
    console.log("\nUpdating collection document in Firestore with synchronized modelIds...");
    await docRef.update({
      items: updatedItems,
    });
    console.log("Success! collection-01 has been fully synchronized with active model IDs.");
  } else {
    console.log("\nNo changes needed. All referenced modelIds are already fully synchronized.");
  }
}

main().catch(console.error);
