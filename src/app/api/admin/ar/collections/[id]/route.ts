import { NextRequest, NextResponse } from "next/server";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "../../auth";
import API from "@/app/api/api";
import { ARWriteScheme } from "@/app/(works)/ar/data";

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

    const docRef = firebaseAdmin.db.collection("ar").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
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
