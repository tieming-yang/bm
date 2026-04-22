import firebase from "../../../lib/firebase/firebase.ts";
import { collection, FieldValue, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { z } from "zod";

export const ARContentTypeScheme = z.enum(["character"]);
export type ARContentTypeScheme = z.infer<typeof ARContentTypeScheme>;

const FirestoreFieldValueScheme = z.custom<FieldValue>((value) => value instanceof FieldValue, {
  message: "Expected Firestore FieldValue",
});

export const ARDataItemScheme = z.object({
  id: z.string(),
  contentType: ARContentTypeScheme,
  title: z.string(),
  targetsPath: z.string(),
  modelPath: z.string(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type ARDataItem = z.infer<typeof ARDataItemScheme>;

export const ARDataItemWriteScheme = ARDataItemScheme.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ARDataItemWrite = z.infer<typeof ARDataItemWriteScheme>;

export async function readARData(): Promise<ARDataItem[]> {
  const snap = await getDocs(query(collection(firebase.db, "ar"), orderBy("title", "asc")));

  return snap.docs.map((doc) =>
    ARDataItemScheme.parse({
      id: doc.id,
      ...doc.data(),
    })
  );
}
