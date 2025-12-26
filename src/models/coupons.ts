import Config from "./config";

export interface Coupon {
  memberType: MemberType;
}

export interface MemberType {
  free:     null;
  lifeTime: LifeTime;
  monthly:  LifeTime;
  yearly:   LifeTime;
}

export interface LifeTime {
  prodCouponId: string;
  testCouponId: string;
}


const Coupon = {
  get: async (uid: string): Promise<string> => {

    const res = await fetch(`${Config.baseUrl}/api/coupons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid }),
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("Failed to fetch products from API");
    }

    return res.json();
  }
}