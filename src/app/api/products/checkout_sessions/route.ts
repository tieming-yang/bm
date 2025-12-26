//? https://docs.stripe.com/checkout/quickstart?client=next

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";
import Price from "@/models/prices";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const { uid, email, priceId, couponId } = await request.json();

  if (!priceId || !uid) {
    return NextResponse.json({ error: "Missing required fields: uid and priceId" }, { status: 400 });
  }

  let mode: Stripe.Checkout.Session.Mode = "payment"

  try {
    const headersList = await headers();
    const origin = headersList.get("origin") ?? headersList.get("referer") ?? "";
    if (!origin) throw new Error("Missing request origin");

    const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${origin}/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?canceled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        uid,
        email,
        priceId
      }
    }

    if (couponId !== null) {
      sessionCreateParams["discounts"] = [
        {
          coupon: couponId
        }
      ]
    }

    const session = await stripe.checkout.sessions.create(sessionCreateParams);
    if (!session.url) throw new Error("Failed to create checkout session");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.log({ err })
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
