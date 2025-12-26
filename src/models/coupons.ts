import Auth from "./auth";
import Config from "./config";

export interface Coupon {
  memberType: MemberType;
}

export interface MemberType {
  free: null;
  lifeTime: LifeTime;
  monthly: LifeTime;
  yearly: LifeTime;
}

export interface LifeTime {
  prodCouponId: string;
  testCouponId: string;
}


const Coupon = {
  get: async (uid: string): Promise<string> => {
    if (!Auth.user) {
      throw new Error("No user");
    }

    const token = await Auth.user.getIdToken();
    const couponRawResponse = await fetch(`/api/coupons/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const couponResponse = await couponRawResponse.json().catch(() => ({}));
    if (!couponRawResponse.ok) {
      throw new Error(couponResponse?.error ?? "Faild to get coupon id");
    }
    if (!couponResponse.couponId) throw new Error("Missing ConponId");

    return couponResponse.couponId;
  }
}

export default Coupon;
