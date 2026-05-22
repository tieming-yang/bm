import { NextRequest, NextResponse } from "next/server";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "../auth";
import API from "@/app/api/api";
import { ModelWriteScheme } from "@/app/(works)/ar/data";

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

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const snapshot = await firebaseAdmin.db
      .collection("models")
      .orderBy("createdAt", "desc")
      .get();

    const models = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...serializeTimestamps(data),
      };
    });

    return NextResponse.json(models);
  } catch (error: any) {
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}

export async function POST(request: NextRequest) {
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

    const docRef = await firebaseAdmin.db.collection("models").add({
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error: any) {
    if (error.message === "Not Found") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: error.message || message }, { status });
  }
}
