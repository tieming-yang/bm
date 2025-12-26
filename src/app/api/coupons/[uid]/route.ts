import { NextRequest, NextResponse } from "next/server";
import API from "@/app/api/api";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import Profile from "@/models/profiles";
import { Coupon, MemberType } from "@/models/coupons";
import Config from "@/models/config";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/coupons/[uid]">) {
  const { uid } = await ctx.params
  if (!uid) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const token = API.getBearerToken(request)
    const decodedToken = await firebaseAdmin.auth.verifyIdToken(token)
    if (decodedToken.uid !== uid) {
      API.throwAPIError()
    }

    const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`)
    const profileSnap = await profileRef.get()
    const profile = profileSnap.data() as Profile;
    const { accountType, memberType } = profile
    if (memberType === "free") return NextResponse.json({ couponId: null })
    if (accountType === "organization" && memberType !== "lifeTime") {
      console.log("we should return here")
      API.throwAPIError()
    }

    const couponsRef = firebaseAdmin.db.doc(`coupons/${accountType}`)
    const couponsSnap = await couponsRef.get()
    const coupons = couponsSnap.data() as Coupon
    let couponId;

    if (Config.isProd) {
      couponId = coupons.memberType[memberType].prodCouponId
    } else {
      couponId = coupons.memberType[memberType].testCouponId
    }


    return NextResponse.json({ couponId })
  } catch (error) {
    const { status, message } = API.getErrorInfo(error);

    return NextResponse.json({ error: message }, { status })
  }

}