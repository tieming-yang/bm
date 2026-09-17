import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyAdmin } from "../auth";
import API from "@/app/api/api";
import {
  ARWriteScheme,
  ModelWriteScheme,
  UploadTypeScheme,
  type UploadType,
} from "@/app/(works)/ar/data";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { UploadPersistenceTargetScheme, type UploadPersistenceTarget } from "./schema";

const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_TOKEN = process.env.CLOUDFLARE_R2_TOKEN;

if (!R2_ACCESS_KEY_ID) {
  throw new Error("Missing environment variable: CLOUDFLARE_R2_ACCESS_KEY_ID");
}
if (!R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing environment variable: CLOUDFLARE_R2_SECRET_ACCESS_KEY");
}
if (!R2_ENDPOINT) {
  throw new Error("Missing environment variable: CLOUDFLARE_R2_ENDPOINT");
}
if (!R2_BUCKET_NAME) {
  throw new Error("Missing environment variable: CLOUDFLARE_R2_BUCKET_NAME");
}
if (!R2_TOKEN) {
  throw new Error("Missing environment variable: CLOUDFLARE_R2_TOKEN");
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function createStatusError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function getStatusErrorCode(error: unknown) {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return undefined;
}

function formatZodIssues(error: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

function parsePersistenceTarget(uploadType: UploadType, formData: FormData) {
  const parsed = UploadPersistenceTargetScheme.safeParse({
    uploadType,
    collectionId: formData.get("collectionId"),
    modelId: formData.get("modelId"),
    field: formData.get("field"),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: `Invalid upload persistence parameters: ${formatZodIssues(parsed.error)}` },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true as const,
    target: parsed.data,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function deleteUploadedObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
}

async function persistUploadedPath(target: NonNullable<UploadPersistenceTarget>, path: string) {
  if (target.kind === "model") {
    const docRef = firebaseAdmin.db.collection("models").doc(target.modelId);
    await firebaseAdmin.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        throw createStatusError(`Model not found: ${target.modelId}`, 404);
      }
      const parsedModel = ModelWriteScheme.safeParse(snap.data());
      if (!parsedModel.success) {
        throw createStatusError(`Malformed model document: ${target.modelId}`, 500);
      }
      tx.update(docRef, {
        [target.field]: path,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return;
  }

  const docRef = firebaseAdmin.db.collection("ar").doc(target.collectionId);
  await firebaseAdmin.db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw createStatusError(`Collection not found: ${target.collectionId}`, 404);
    }

    const parsedCollection = ARWriteScheme.safeParse(snap.data());
    if (!parsedCollection.success) {
      throw createStatusError(`Malformed collection document: ${target.collectionId}`, 500);
    }

    if (target.kind === "collection-target") {
      tx.update(docRef, {
        [target.field]: path,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const itemIndexes = parsedCollection.data.items.reduce<number[]>((indexes, item, index) => {
      if (item.modelId === target.modelId) {
        indexes.push(index);
      }
      return indexes;
    }, []);
    if (itemIndexes.length === 0) {
      throw createStatusError(`Collection item not found for modelId: ${target.modelId}`, 404);
    }
    if (itemIndexes.length > 1) {
      throw createStatusError(`Duplicate collection item modelId: ${target.modelId}`, 500);
    }

    const [itemIndex] = itemIndexes;
    const nextItems = parsedCollection.data.items.map((item, index) =>
      index === itemIndex ? { ...item, [target.field]: path } : item
    );

    tx.update(docRef, {
      items: nextItems,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type");
    const folder = formData.get("folder");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }

    const typeParsed = UploadTypeScheme.safeParse(type);
    if (!typeParsed.success) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }

    const uploadType = typeParsed.data;
    const parsedPersistenceTarget = parsePersistenceTarget(uploadType, formData);
    if (!parsedPersistenceTarget.ok) {
      return parsedPersistenceTarget.response;
    }
    const persistenceTarget = parsedPersistenceTarget.target;

    if (!folder || typeof folder !== "string" || !folder.trim()) {
      return NextResponse.json(
        { error: "Missing folder name (character/collection name)" },
        { status: 400 }
      );
    }

    // Sanitize folder name: lowercase and replace non-alphanumeric/dashes/underscores with underscores
    const sanitizedFolder = folder
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "_");
    if (!sanitizedFolder) {
      return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
    }

    // Check size limits:
    // GLB models and videos: 100MB
    // Audio and targets: 20MB
    const limit =
      uploadType === "model" || uploadType === "video" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;

    if (file.size > limit) {
      const limitMB = limit / (1024 * 1024);
      return NextResponse.json(
        { error: `File size exceeds the limit of ${limitMB}MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename: remove non-alphanumeric chars except dots, dashes, and underscores
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Convention:
    // Models, Audio, Video: characters/$characterName/v0/$filename
    // Targets: targets/$collectionTitle/v0/$filename
    const key =
      uploadType === "target"
        ? `targets/${sanitizedFolder}/v0/${sanitizedFilename}`
        : `characters/${sanitizedFolder}/v0/${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    });

    try {
      await s3Client.send(command);
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to upload file to R2: ${getErrorMessage(error)}` },
        { status: 502 }
      );
    }

    if (persistenceTarget) {
      try {
        await persistUploadedPath(persistenceTarget, `/${key}`);
      } catch (error) {
        const status = getStatusErrorCode(error) ?? 500;
        const firestoreMessage = getErrorMessage(error);

        try {
          await deleteUploadedObject(key);
          return NextResponse.json(
            {
              error: `Failed to update Firestore after R2 upload: ${firestoreMessage}. Uploaded file was removed from R2.`,
            },
            { status }
          );
        } catch (cleanupError) {
          return NextResponse.json(
            {
              error: `Failed to update Firestore after R2 upload: ${firestoreMessage}. Failed to remove uploaded file from R2: ${getErrorMessage(
                cleanupError
              )}`,
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ path: `/${key}`, persisted: Boolean(persistenceTarget) });
  } catch (error: any) {
    const statusCode = getStatusErrorCode(error);
    if (statusCode) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: statusCode });
    }
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}
