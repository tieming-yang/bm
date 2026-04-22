import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";

import {
  ARContentTypeScheme,
  ARDataItemWriteScheme,
  type ARDataItemWrite,
} from "../../app/(works)/ar/data.ts";

dotenv.config({ path: ".env.local" });
const NAME = "sarah";
const input = {
  collectionPath: "ar",
  data: {
    contentType: ARContentTypeScheme.Enum.character,
    title: NAME[0].toUpperCase() + NAME.slice(1),
    //TODO: custom domain url
    targetsPath: `/characters/${NAME}/v0/${NAME}.mind`,
    modelPath: `/characters/${NAME}/v0/${NAME}-lowpoly.glb`,
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

  console.log(`Uploaded AR document: ${input.collectionPath}, ${NAME}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
