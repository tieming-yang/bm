//? https://docs.stripe.com/checkout/quickstart?client=next

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const headersList = await headers();
    const origin = headersList.get("origin") ?? headersList.get("referer") ?? "";
    if (!origin) throw new Error("Missing request origin");

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: "price_1SRZGzCSXuz1o7AS6iBEbC0m",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/glory-share/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/glory-share?canceled=true`,
      automatic_tax: { enabled: true },
    });
    if (!session.url) throw new Error("Failed to create checkout session");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
