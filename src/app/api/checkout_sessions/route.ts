//? https://docs.stripe.com/checkout/quickstart?client=next

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";
import Price from "@/models/prices";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const { uid, email, priceId } = await request.json();
  if (!priceId || !uid) {
    return NextResponse.json({ error: "Missing required fields: uid and priceId" }),
      { status: 400 }
  }

  let mode;

  switch (priceId) {
    case Price.LIFE_TIME_PRICE_ID || Price.LIFE_TIME_PRICE_ID_TEST:
      mode = "payment"
      break;

    case Price.MONTHLY_PRICE_ID_TEST:
      mode = "subscription"
      break;
    default:
      return NextResponse.json({ error: "Unknown Price Id" }),
        { status: 400 }
  }

  try {
    const headersList = await headers();
    const origin = headersList.get("origin") ?? headersList.get("referer") ?? "";
    if (!origin) throw new Error("Missing request origin");

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as Stripe.Checkout.Session.Mode,
      success_url: `${origin}/glory-share/join/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/glory-share/join?canceled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        uid,
        email,
        priceId
      },
    });
    if (!session.url) throw new Error("Failed to create checkout session");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
