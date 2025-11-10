//? https://docs.stripe.com/checkout/quickstart?client=next

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { GLORY_SHARE_PRICE, GLORY_SHARE_PRICE_TEST, stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const { uid, email } = await request.json();

  try {
    const headersList = await headers();
    const origin = headersList.get("origin") ?? headersList.get("referer") ?? "";
    if (!origin) throw new Error("Missing request origin");

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: GLORY_SHARE_PRICE_TEST,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/glory-share/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/glory-share?canceled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        uid,
        email,
      },
    });
    if (!session.url) throw new Error("Failed to create checkout session");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
