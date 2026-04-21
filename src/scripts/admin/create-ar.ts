import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";

import {
  ARContentTypeScheme,
  ARDataItemWriteScheme,
  type ARDataItemWrite,
} from "../../app/(works)/ar/data.ts";

dotenv.config({ path: ".env.local" });

const input = {
  collectionPath: "ar",
  data: {
    contentType: ARContentTypeScheme.Enum.character,
    title: "adam",
    //TODO: custom domain url
    targetsPath: "/characters/adam/v0/adam.mind",
    modelPath: "/characters/adam/v0/adam-lowpoly.glb",
  } satisfies ARDataItemWrite,
};

async function main() {
  const { default: firebaseAdmin } = await import("../../lib/firebase/firebase-admin.ts");

  const document = {
    ...ARDataItemWriteScheme.parse(input.data),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await firebaseAdmin.db.collection(input.collectionPath).doc().set(document, { merge: true });

  console.log(`Uploaded AR document: ${input.collectionPath}}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
