import { z } from "zod";
import { UploadTypeScheme } from "@/app/(works)/ar/data";

const NonEmptyStringScheme = z.string().trim().min(1);

const OptionalFormStringScheme = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return value;
}, NonEmptyStringScheme.optional());

const CollectionItemUploadFieldScheme = z.enum(["audioPath", "audioPathZh", "videoPath"]);

export const CollectionTargetUploadPersistenceScheme = z.object({
  collectionId: NonEmptyStringScheme,
  field: z.literal("targetsPath"),
});

export const CollectionItemUploadPersistenceScheme = z.object({
  collectionId: NonEmptyStringScheme,
  modelId: NonEmptyStringScheme,
  field: CollectionItemUploadFieldScheme,
});

export const CollectionUploadPersistenceScheme = z.union([
  CollectionTargetUploadPersistenceScheme,
  CollectionItemUploadPersistenceScheme,
]);

export type CollectionUploadPersistence = z.infer<typeof CollectionUploadPersistenceScheme>;

export const ModelUploadPersistenceScheme = z.object({
  modelId: NonEmptyStringScheme,
  field: z.literal("modelPath"),
});

export type ModelUploadPersistence = z.infer<typeof ModelUploadPersistenceScheme>;

const UploadPersistenceFieldScheme = z.enum([
  "targetsPath",
  "audioPath",
  "audioPathZh",
  "videoPath",
  "modelPath",
]);

const OptionalUploadPersistenceFieldScheme = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return value;
}, UploadPersistenceFieldScheme.optional());

const UploadPersistenceInputScheme = z
  .object({
    uploadType: UploadTypeScheme,
    collectionId: OptionalFormStringScheme,
    modelId: OptionalFormStringScheme,
    field: OptionalUploadPersistenceFieldScheme,
  })
  .superRefine((input, ctx) => {
    const hasPersistenceInput = Boolean(input.collectionId || input.modelId || input.field);
    if (!hasPersistenceInput) {
      return;
    }
    if (!input.field) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["field"],
        message: "Missing Firestore update field",
      });
      return;
    }

    if (input.field === "targetsPath") {
      if (input.uploadType !== "target") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["field"],
          message: "targetsPath can only be updated by target uploads",
        });
      }
      if (!input.collectionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["collectionId"],
          message: "Missing collectionId for target upload persistence",
        });
      }
      if (input.modelId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modelId"],
          message: "modelId is not allowed for target upload persistence",
        });
      }
      return;
    }

    if (
      input.field === "audioPath" ||
      input.field === "audioPathZh" ||
      input.field === "videoPath"
    ) {
      if (input.field === "videoPath" && input.uploadType !== "video") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["field"],
          message: "videoPath can only be updated by video uploads",
        });
      }
      if (
        (input.field === "audioPath" || input.field === "audioPathZh") &&
        input.uploadType !== "audio"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["field"],
          message: `${input.field} can only be updated by audio uploads`,
        });
      }
      if (!input.collectionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["collectionId"],
          message: "Missing collectionId for collection item upload persistence",
        });
      }
      if (!input.modelId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modelId"],
          message: "Missing modelId for collection item upload persistence",
        });
      }
      return;
    }

    if (input.field === "modelPath") {
      if (input.uploadType !== "model") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["field"],
          message: "modelPath can only be updated by model uploads",
        });
      }
      if (input.collectionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["collectionId"],
          message: "collectionId is not allowed for model upload persistence",
        });
      }
      if (!input.modelId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modelId"],
          message: "Missing modelId for model upload persistence",
        });
      }
    }
  });

export const UploadPersistenceTargetScheme = UploadPersistenceInputScheme.transform((input) => {
  if (!input.collectionId && !input.modelId && !input.field) {
    return undefined;
  }

  if (input.field === "targetsPath") {
    return {
      kind: "collection-target" as const,
      collectionId: input.collectionId!,
      field: input.field,
    };
  }

  if (input.field === "audioPath" || input.field === "audioPathZh" || input.field === "videoPath") {
    return {
      kind: "collection-item" as const,
      collectionId: input.collectionId!,
      modelId: input.modelId!,
      field: input.field,
    };
  }

  return {
    kind: "model" as const,
    modelId: input.modelId!,
    field: input.field!,
  };
});

export type UploadPersistenceTarget = z.infer<typeof UploadPersistenceTargetScheme>;
