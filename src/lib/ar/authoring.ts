import { z } from "zod";
import type { ARWrite, ModelWrite } from "@/app/(works)/ar/data";

export const ARProjectFormSchema = z.object({
  title: z.string().refine((value) => Boolean(value.trim())),
  version: z.string().min(1),
  targetsPath: z.string().min(1),
});

export const ARModelFormSchema = z.object({
  title: z.string().refine((value) => Boolean(value.trim())),
  titleZh: z.string().min(1),
  modelPath: z.string().min(1),
});

/** Validate form state rather than mounted DOM controls, including collapsed sections. */
export function projectFormErrors(value: ARWrite) {
  const result = ARProjectFormSchema.safeParse(value);
  const fields = result.success ? {} : result.error.flatten().fieldErrors;
  return { title: Boolean(fields.title), version: Boolean(fields.version), targetsPath: Boolean(fields.targetsPath) };
}

/** Model names and the file are required before either create or update. */
export function modelFormErrors(value: ModelWrite) {
  const result = ARModelFormSchema.safeParse(value);
  const fields = result.success ? {} : result.error.flatten().fieldErrors;
  return { title: Boolean(fields.title), titleZh: Boolean(fields.titleZh), modelPath: Boolean(fields.modelPath) };
}

/** Normalize optional presentation fields without changing persisted identifiers or URLs. */
export function projectFormValue(value: ARWrite): ARWrite {
  return {
    title: value.title,
    description: value.description,
    version: value.version,
    targetsPath: value.targetsPath,
    items: value.items.map((item) => ({
      modelId: item.modelId,
      title: item.title,
      titleZh: item.titleZh || "",
      modelPath: item.modelPath,
      videoPath: item.videoPath || "",
      audioPath: item.audioPath || "",
      audioPathZh: item.audioPathZh || "",
    })),
  };
}

/** Only values edited by the model dialog participate in its discard decision. */
export function modelFormValue(value: ModelWrite): ModelWrite {
  return { contentType: value.contentType, title: value.title, titleZh: value.titleZh || "", modelPath: value.modelPath };
}

export type ARItemMediaField = "audioPath" | "audioPathZh" | "videoPath";

/** A late media result follows the stable character ID and cannot resurrect a removed item. */
export function applyItemMedia(value: ARWrite, modelId: string, field: ARItemMediaField, path: string): ARWrite {
  if (!value.items.some((item) => item.modelId === modelId)) return value;
  return { ...value, items: value.items.map((item) => item.modelId === modelId ? { ...item, [field]: path } : item) };
}
