import { NextRequest, NextResponse } from "next/server";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { MemberType } from "@/models/profiles";

const ADMIN_KEY = "NAEBO777!!!"

export async function POST(req: NextRequest) {
  const { adminId, uid } = await req.json();
  if (adminId !== ADMIN_KEY) return NextResponse.json({ error: "No Uid" }, { status: 401 })

  if (!uid)
    return NextResponse.json({ error: "No Uid" }, { status: 400 })

  try {
    await firebaseAdmin.db.doc(`profiles/${uid}`).update({
      memberType: MemberType.Free,
      gloryShare: FieldValue.delete(),
      customerDetails: FieldValue.delete(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 })
  }

  return NextResponse.json({ success: true });
}
