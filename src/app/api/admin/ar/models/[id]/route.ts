import { NextRequest, NextResponse } from "next/server";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "../../auth";
import API from "@/app/api/api";
import { ModelWriteScheme } from "@/app/(works)/ar/data";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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

async function deleteFolderFromR2(sanitizedTitle: string) {
  const prefix = `characters/${sanitizedTitle}/`;
  
  const listCommand = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
  });
  
  const listedObjects = await s3Client.send(listCommand);
  
  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    return;
  }
  
  const deleteParams = {
    Bucket: R2_BUCKET_NAME,
    Delete: {
      Objects: listedObjects.Contents.map(({ Key }) => ({ Key: Key! })),
    },
  };
  
  const deleteCommand = new DeleteObjectsCommand(deleteParams);
  await s3Client.send(deleteCommand);
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    const parsed = ModelWriteScheme.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid model parameters",
          issues: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const docRef = firebaseAdmin.db.collection("models").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    await docRef.update({
      ...parsed.data,
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

    const docRef = firebaseAdmin.db.collection("models").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const modelData = snap.data();
    const title = modelData?.title || "";
    if (!title) {
      return NextResponse.json({ error: "Model title not found" }, { status: 400 });
    }

    // Check if the model is used in any collection (by ID or model path)
    const collectionsSnap = await firebaseAdmin.db.collection("ar").get();
    const isReferenced = collectionsSnap.docs.some((doc) => {
      const items = doc.data().items || [];
      return items.some((item: any) => 
        item.modelId === id || 
        (item.modelPath && item.modelPath === modelData?.modelPath)
      );
    });

    if (isReferenced) {
      return NextResponse.json(
        { error: "此模型已被專案使用，無法刪除。" },
        { status: 400 }
      );
    }

    // Delete character directory/assets in R2
    const sanitizedTitle = title.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "_");
    if (sanitizedTitle) {
      await deleteFolderFromR2(sanitizedTitle);
    }

    // Delete model document
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
