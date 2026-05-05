import firebase from "../../../lib/firebase/firebase.ts";
import { collection, FieldValue, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { z } from "zod";

export const ModelContentTypeScheme = z.enum(["character"]);
export type ModelContentType = z.infer<typeof ModelContentTypeScheme>;

const FirestoreFieldValueScheme = z.custom<FieldValue>((value) => value instanceof FieldValue, {
  message: "Expected Firestore FieldValue",
});

export const ModelScheme = z.object({
  id: z.string(),
  contentType: ModelContentTypeScheme,
  title: z.string(),
  zhTitle: z.string().optional(),
  modelPath: z.string(),
  targetIndex: z.number().optional(), // for mapping to target
  targetsPath: z.string().optional(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Model = z.infer<typeof ModelScheme>;

export const ModelWriteScheme = ModelScheme.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ModelWrite = z.infer<typeof ModelWriteScheme>;

const ARScheme = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  version: z.string(),
  targetsPath: z.string(),
  items: z.array(
    z.object({
      modelId: z.string(),
      title: z.string(),
      modelPath: z.string(),
    })
  ),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type AR = z.infer<typeof ARScheme>;
export const ARWriteScheme = ARScheme.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ARWrite = z.infer<typeof ARWriteScheme>;

export async function readAR(): Promise<AR[]> {
  const snap = await getDocs(collection(firebase.db, "ar"));

  return snap.docs.map((doc) =>
    ARScheme.parse({
      id: doc.id,
      ...doc.data(),
    })
  );
}
