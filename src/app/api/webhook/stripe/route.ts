import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Invalid Secret" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error on Stripe Webhook";
    return NextResponse.json({ error: `Invalid signature: ${error}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { uid, email } = session.metadata ?? {};

    if (uid) {
      await firebaseAdmin.db.doc(`profiles/${uid}`).set(
        {
          joinedGloryShare: true,
          gloryShare: {
            joinedAt: FieldValue.serverTimestamp(),
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total,
            currency: session.currency,
            email: email ?? session.customer_details?.email ?? null,
          },
        },
        { merge: true }
      );
    }
  }

  return NextResponse.json({ received: true });
}
