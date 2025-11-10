//? https://docs.stripe.com/checkout/quickstart?client=next

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { GLORY_SHARE_PRICE, GLORY_SHARE_PRICE_TEST, stripe } from "@/lib/stripe";
import { fetchRemoteFlag } from "@/lib/firebase/remote-config";

export async function POST(request: NextRequest) {
  const { uid, email } = await request.json();

  try {
    const headersList = await headers();
    const origin = headersList.get("origin") ?? headersList.get("referer") ?? "";
    if (!origin) throw new Error("Missing request origin");
    const isGloryShareTestPrice = await fetchRemoteFlag("isGloryShareTestPrice");

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: isGloryShareTestPrice ? GLORY_SHARE_PRICE_TEST : GLORY_SHARE_PRICE,
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
