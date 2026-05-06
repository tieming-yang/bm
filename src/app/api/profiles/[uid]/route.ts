import API from "@/app/api/api";
import { FamilyProfileUpdateSchema } from "@/app/(works)/school/summer/2026/domain";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

type PatchProfileRouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(request: NextRequest, ctx: PatchProfileRouteContext) {
  const { uid } = await ctx.params;

  try {
    const token = API.getBearerToken(request);
    const decodedToken = await firebaseAdmin.auth.verifyIdToken(token);

    if (decodedToken.uid !== uid) {
      API.throwAPIError(403, "Forbidden");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      API.throwAPIError(400, "Invalid JSON body");
    }

    const parsed = FamilyProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid body parameters",
          issues: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      API.throwAPIError(404, "Profile not found");
    }

    await profileRef.set(
      {
        isEbVolunteer: parsed.data.isEbVolunteer,
        savedChildren: parsed.data.savedChildren,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    const { status, message } = API.getErrorInfo(error);

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ status: 200 });
}
