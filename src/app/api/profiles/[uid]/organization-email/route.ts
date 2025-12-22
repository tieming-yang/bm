import { ApiError } from "@/app/api/api";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import Profile from "@/models/profiles";
import { NextRequest, NextResponse } from "next/server";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")
  if (!authorization) {
    throw new ApiError(401, "Missing Authorization header")
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new ApiError(401, "Invalid Authorization header")
  }

  return match[1]
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/profiles/[uid]/organization-email">) {
  const { uid } = await ctx.params
  let body;
  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { newOrganizationEmail } = body
  if (!newOrganizationEmail) {
    return NextResponse.json(
      { error: "Invalid body parameters" },
      { status: 422 }
    )
  }

  try {
    const token = getBearerToken(request)
    const decodedToken = await firebaseAdmin.auth.verifyIdToken(token)
    if (decodedToken.uid !== uid) {
      throw new ApiError(403, "Forbidden")
    }

    const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`)
    await firebaseAdmin.db.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef)
      if (!snap.exists) {
        throw new ApiError(404, "Profile not found")
      }

      const profile = snap.data() as Profile;
      const { organizationEmailUpdateCount } = profile

      if (organizationEmailUpdateCount === undefined || organizationEmailUpdateCount >= 1) {
        throw new ApiError(409, "Invalid Operaion")
      }

      tx.update(profileRef, {
        organizationEmail: newOrganizationEmail,
        organizationEmailUpdateCount: 1,
      })
    })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500
    const message = error instanceof ApiError ? error.message : "Internal Server Error"

    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json({ status: 200 })
}
