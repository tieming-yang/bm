import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { MemberType } from "@/models/profiles";
import Stripe from "stripe";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // console.log("========================session=====================")
        // console.log(session)
        // console.log("========================session=====================")
        const uid = session.metadata?.uid;
        if (!uid) {
          throw new Error("Missing Uid in checkout session")
        }

        const memberDetails = {
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
        const commonData = {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          customerId: session.customer,
          paymentStatus: session.payment_status,
          metadata: session.metadata ?? {},
          createdAt: FieldValue.serverTimestamp(),
          amountTotal: session.amount_total,
          currency: session.currency
        }

        const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
        const transactionRef = profileRef.collection("transactions").doc(session.id);

        if (session.mode === "payment") {
          await Promise.all([
            profileRef.set(
              {
                memberType: MemberType.LiftTime,
                joinedAt: FieldValue.serverTimestamp(),
                lastTransactionId: transactionRef.id,
                memberDetails,
              },
              { merge: true }
            ),
            transactionRef.set({
              ...commonData,
            }),
          ]);
        } else if (session.mode === "subscription") {
          const subscriptionId = session.subscription as string
          if (!subscriptionId) {
            throw new Error("Missing subscription id in session")
          }

          await stripe.subscriptions.update(subscriptionId, {
            metadata: {
              uid: uid,
            }
          });

          const subscriptionRef = profileRef.collection("subscriptions").doc(subscriptionId)

          await Promise.all([
            profileRef.set(
              {
                memberType: session.amount_total === 770 ? MemberType.Monthly : MemberType.Yearly,
                joinedAt: FieldValue.serverTimestamp(),
                lastTransactionId: transactionRef.id,
                lastSubscriptionId: subscriptionId,
                memberDetails,
              },
              { merge: true }
            ),
            transactionRef.set({
              ...commonData,
            }),
            subscriptionRef.set({
              subscriptionId,
            })
          ]);
        }
        break;
      }


      case "invoice.paid": {
        const invoice = event.data.object;
        // Check if this is a renewal (not the first payment)
        console.log("========================invoice=====================")
        console.log("invoice", invoice)
        console.log("========================invoice=====================")
        if (invoice.billing_reason === 'subscription_cycle') {
          if (invoice.lines.data.length > 1) {
            throw new Error("Invoice contains multiple items")
          }
          const lineItem = invoice.lines.data[0] as Stripe.InvoiceLineItem;
          const subscriptionId = lineItem.parent?.subscription_item_details?.subscription
          if (!subscriptionId) {
            throw new Error("Missing subscription id in invoice")
          }
          const subscriptions = await stripe.subscriptions.retrieve(subscriptionId);
          const subscription = subscriptions.items.data[0]
          
          const uid = subscription.metadata.uid
          if (!uid) {
            throw new Error("Missing uid in subscription")
          }

          const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
          const subscriptionRef = profileRef.collection("subscriptions").doc(subscriptionId)

          await Promise.all([
            profileRef.set(
              {
                memberEndAt: lineItem.period.end
              },
              { merge: true }
            ),
            subscriptionRef.update({
              status: subscriptions.status,
              startDate: subscriptions.start_date,
              endAt: subscriptions.ended_at,
              currentPeriodStart: subscription.current_period_start,
              currentPeriodEnd: subscription.current_period_end,
            })
          ]);

        }
        break;
      }

      case 'customer.subscription.deleted': {
        const cancelledSubscription = event.data.object;
        const { id: subscriptionId, metadata, status, start_date, ended_at, cancel_at } = cancelledSubscription
        const uid = metadata.uid
        if (!uid) {
          throw new Error("Missing Uid in subscription deleted")
        }

        const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
        const subscriptionRef = profileRef.collection("subscriptions").doc(subscriptionId)

        await Promise.all([
          profileRef.set(
            {
              memberType: MemberType.Free,
            },
            { merge: true }
          ),
          subscriptionRef.update({
            status: status,
            cancelAt: cancel_at,
            startDate: start_date,
            endAt: ended_at
          })
        ]);
        break;
      }

      default: {
        console.log("========================event type=====================")
        console.log("event type", event.type)
        console.log("========================event type=====================")
        throw new Error("Unsupport Event Type")
      }

    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ received: true, error: error }, { status: 500 })
  }


  return NextResponse.json({ received: true });
}
