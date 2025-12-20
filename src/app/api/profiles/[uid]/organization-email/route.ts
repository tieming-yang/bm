import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { assertIsDefined } from "@/lib/utils";
import { AssertionError } from "assert";
import { NextRequest, NextResponse } from "next/server";

function getBearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  assertIsDefined(authorization);

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AssertionError({ message: "Invalid Authorization header" })

  return match[1]
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/profiles/[uid]/organization-email">
) {
  const { uid } = await ctx.params;
  const body = await request.json();
  const { newOrganizationEmail } = body
  const clientJWTToken = getBearerToken(request)

  const decodedToken = await firebaseAdmin.auth.verifyIdToken(clientJWTToken)

  console.log({ decodedToken })

  try {
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 400 });
  }

  return NextResponse.json({ status: 200 });
}
