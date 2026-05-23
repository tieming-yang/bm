import { NextRequest, NextResponse } from "next/server";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "../../auth";
import API from "@/app/api/api";
import { ARWriteScheme } from "@/app/(works)/ar/data";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

function bumpMajorVersion(versionStr: string): string {
  const clean = (versionStr || "1.0").trim();
  const match = clean.match(/^([^\d]*)(\d+)(.*)$/);
  if (!match) {
    return "1.0";
  }
  const prefix = match[1];
  const major = parseInt(match[2], 10);
  const rest = match[3];

  const nextMajor = major + 1;
  if (/^\.\d+/.test(rest)) {
    return `${prefix}${nextMajor}.0`;
  }
  return `${prefix}${nextMajor}${rest}`;
}

function serializeTimestamps(data: any) {
  if (!data) return data;
  const result = { ...data };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val && typeof val === "object") {
      if (
        typeof val.toDate === "function" ||
        ("_seconds" in val && "_nanoseconds" in val) ||
        ("seconds" in val && "nanoseconds" in val)
      ) {
        result[key] = {
          seconds: val.seconds ?? val._seconds,
          nanoseconds: val.nanoseconds ?? val._nanoseconds,
        };
      }
    }
  }
  return result;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  try {
    await verifyAdmin(request);

    const docRef = firebaseAdmin.db.collection("ar").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const data = snap.data();
    return NextResponse.json({
      id: snap.id,
      ...serializeTimestamps(data),
    });
  } catch (error: any) {
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  try {
    await verifyAdmin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ARWriteScheme.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid collection parameters",
          issues: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const docRef = firebaseAdmin.db.collection("ar").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const currentVersion = snap.data()?.version || "1.0";
    const nextVersion = bumpMajorVersion(currentVersion);

    await docRef.update({
      ...parsed.data,
      version: nextVersion,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  try {
    await verifyAdmin(request);

    const docRef = firebaseAdmin.db.collection("ar").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const data = snap.data();
    const targetsPath = data?.targetsPath;

    // Delete the target .mind file from R2 if present
    if (targetsPath && typeof targetsPath === "string") {
      const key = targetsPath.startsWith("/") ? targetsPath.slice(1) : targetsPath;
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}
