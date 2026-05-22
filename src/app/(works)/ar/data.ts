import firebase from "../../../lib/firebase/firebase.ts";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { z } from "zod";

export const ModelContentTypeScheme = z.enum(["character"]);
export type ModelContentType = z.infer<typeof ModelContentTypeScheme>;

export const UploadTypeScheme = z.enum(["model", "audio", "video", "target"]);
export type UploadType = z.infer<typeof UploadTypeScheme>;

// Cross-compatible Firestore Timestamp checker that types as Timestamp
const FirestoreTimestampScheme = z.custom<Timestamp>(
  (val) => val && typeof val === "object" && "seconds" in val && "nanoseconds" in val,
  { message: "Expected Firestore Timestamp" }
);

export const ModelScheme = z.object({
  id: z.string(),
  contentType: ModelContentTypeScheme,
  title: z.string(),
  titleZh: z.string().optional(),
  modelPath: z.string(),
  targetIndex: z.number().optional(), // for mapping to target
  targetsPath: z.string().optional(),
  createdAt: FirestoreTimestampScheme,
  updatedAt: FirestoreTimestampScheme,
});
export type Model = z.infer<typeof ModelScheme>;

export const ModelWriteScheme = ModelScheme.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ModelWrite = z.infer<typeof ModelWriteScheme>;

export const ARScheme = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  version: z.string(),
  targetsPath: z.string(),
  items: z.array(
    z.object({
      modelId: z.string(),
      title: z.string(),
      titleZh: z.string().optional(),
      modelPath: z.string(),
      videoPath: z.string().optional(),
      audioPath: z.string().optional(),
      audioPathZh: z.string().optional(),
    })
  ),
  createdAt: FirestoreTimestampScheme,
  updatedAt: FirestoreTimestampScheme,
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
