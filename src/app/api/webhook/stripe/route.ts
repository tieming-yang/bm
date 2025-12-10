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

  console.log("📧 Incoming Event:", event.type, "-----")

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // console.log("========================session=====================")
        // console.log(session)
        // console.log("========================session=====================")
        const uid = session.metadata?.uid;
        if (!uid) {
          throw new Error(`Missing Uid in ${event.type}`)
        }

        const memberDetails = {
          name: session.customer_details?.name ?? null,
          phone: session.customer_details?.phone ?? null,
          address: {
            city: session.customer_details?.address?.city ?? null,
            country: session.customer_details?.address?.country ?? null,
            line1: session.customer_details?.address?.line1 ?? null,
            line2: session.customer_details?.address?.line2 ?? null,
            postalCode: session.customer_details?.address?.postal_code ?? null,
            state: session.customer_details?.address?.state ?? null,
          }
        }
        const transactionData = {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          customerId: session.customer,
          paymentStatus: session.payment_status,
          metadata: session.metadata ?? {},
          amountTotal: session.amount_total,
          currency: session.currency,
        }

        const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
        const transactionRef = profileRef.collection("transactions").doc(session.id);

        if (session.mode === "payment") {
          await Promise.all([
            profileRef.set(
              {
                memberType: MemberType.LiftTime,
                lastTransactionId: transactionRef.id,
                memberDetails,
                updatedAt: FieldValue.serverTimestamp()
              },
              { merge: true }
            ),
            transactionRef.set({
              ...transactionData,
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
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

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const subscriptionItem = subscription.items.data[0]

          const subscriptionRef = profileRef.collection("subscriptions").doc(subscriptionId)

          await Promise.all([
            profileRef.set(
              {
                memberType: session.amount_total === 770 ? MemberType.Monthly : MemberType.Yearly,
                lastTransactionId: transactionRef.id,
                lastSubscriptionId: subscriptionId,
                memberDetails,
                updatedAt: FieldValue.serverTimestamp()
              },
              { merge: true }
            ),
            transactionRef.set({
              ...transactionData,
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
            }),
            subscriptionRef.set({
              id: subscriptionId,
              status: subscription.status,
              startDate: subscription.start_date,
              endAt: subscription.ended_at,
              currentPeriodStart: subscriptionItem.current_period_start,
              currentPeriodEnd: subscriptionItem.current_period_end,
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
            }, { merge: true })
          ]);
        }
        break;
      }

      /**
       * Renew
       */
      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_cycle') {
          if (invoice.lines.data.length > 1) {
            throw new Error("Invoice contains multiple items")
          }

          const lineItem = invoice.lines.data[0] as Stripe.InvoiceLineItem;
          const subscriptionId = lineItem.parent?.subscription_item_details?.subscription
          if (!subscriptionId) {
            throw new Error("Missing subscription id in invoice")
          }
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const uid = invoice.parent?.subscription_details?.metadata?.uid ?? subscription.metadata.uid
          if (!uid) {
            throw new Error("Missing uid in subscription")
          }

          const subscriptionItem = subscription.items.data[0]

          const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
          const subscriptionRef = profileRef.collection("subscriptions").doc(subscriptionId)

          await subscriptionRef.set({
            status: subscription.status,
            startDate: subscription.start_date,
            endAt: subscription.ended_at,
            currentPeriodStart: subscriptionItem.current_period_start,
            currentPeriodEnd: subscriptionItem.current_period_end,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true })
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const cancelledSubscription = event.data.object;
        const { id: subscriptionId, metadata, status, start_date, ended_at, canceled_at } = cancelledSubscription
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
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          ),
          subscriptionRef.set({
            status: status,
            canceledAt: canceled_at,
            startDate: start_date,
            endAt: ended_at,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true })
        ]);
        break;
      }

      default: {
        // console.log(" === event type ===")
        // console.log("| ", event.type, " |")
        // console.log(" === event type ===")
      }

    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ received: true, error: error }, { status: 500 })
  }


  return NextResponse.json({ received: true }, { status: 200 });
}
