import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyAdmin } from "../auth";
import API from "@/app/api/api";
import { UploadTypeScheme } from "@/app/(works)/ar/data";

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

    if (!folder || typeof folder !== "string" || !folder.trim()) {
      return NextResponse.json(
        { error: "Missing folder name (character/collection name)" },
        { status: 400 }
      );
    }

    // Sanitize folder name: lowercase and replace non-alphanumeric/dashes/underscores with underscores
    const sanitizedFolder = folder.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "_");
    if (!sanitizedFolder) {
      return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
    }

    // Check size limits:
    // GLB models and videos: 100MB
    // Audio and targets: 20MB
    const limit =
      uploadType === "model" || uploadType === "video"
        ? 100 * 1024 * 1024
        : 20 * 1024 * 1024;

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

    await s3Client.send(command);

    return NextResponse.json({ path: `/${key}` });
  } catch (error: any) {
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}
