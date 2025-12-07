import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { MemberType } from "@/models/profiles";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Invalid Secret" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(signature);
    const error = err instanceof Error ? err.message : "Error on Stripe Webhook";
    return NextResponse.json({ error: `Invalid signature: ${error}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { uid, email } = session.metadata ?? {};
    if (!uid) {
      return NextResponse.json({ error: "No Uid" }, { status: 400 })
    }

    try {
      await firebaseAdmin.db.doc(`profiles/${uid}`).set(
        {
          memberType: MemberType.LiftTime,
          gloryShare: {
            joinedAt: FieldValue.serverTimestamp(),
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total,
            currency: session.currency,
            email: email ?? session.customer_details?.email ?? null,
          },
          customerDetails: {
            name: session.customer_details?.name,
            phone: session.customer_details?.phone,
            address: {
              city: session.customer_details?.address?.city ?? null,
              country: session.customer_details?.address?.country ?? null,
              line1: session.customer_details?.address?.line1 ?? null,
              line2: session.customer_details?.address?.line2 ?? null,
              postalCode: session.customer_details?.address?.postal_code ?? null,
              state: session.customer_details?.address?.state ?? null,
            }
          }
        },
        { merge: true }
      );
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: error }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true });
}
