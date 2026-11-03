import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Profile, { AccountType, MemberType } from "@/models/profiles";
import Stripe from "stripe";
import { z } from "zod";
import { createMembershipEffects } from "@/lib/membership/runtime";
import { readLegacySessionOwner } from "@/lib/membership/provider";
import { MembershipSubscriptionIdSchema } from "@/lib/membership/domain";
import { synchronizeRecurringMembership } from "@/lib/membership/workflow";
import { recordLegacyRecurringReceipt } from "@/lib/membership/legacy-receipt";

const InvoiceSubscriptionSchema = z.object({
  object: z.literal("invoice"),
  parent: z.object({
    type: z.literal("subscription_details"),
    subscription_details: z.object({ subscription: MembershipSubscriptionIdSchema }),
  }).nullish(),
  subscription: MembershipSubscriptionIdSchema.nullish(),
});

async function reconcileRecurringEvent(subscriptionId: string, event: Stripe.Event) {
  const effects = createMembershipEffects();
  const routing = await effects.provider.readSubscriptionRouting(subscriptionId);
  if (!routing) throw new Error("Membership event subscription is missing");
  const result = await effects.provider.readSubscriptionSnapshot(subscriptionId, { id: event.id, createdMs: event.created * 1000 });
  if (result.kind !== "snapshot") {
    if (result.kind === "not_found") throw new Error("Membership event checkout is missing");
    return;
  }
  // Initial legacy invoice events can precede checkout completion attaching its UID.
  if (routing.source === "legacy" && !routing.ownerUid) return;
  const outcome = await synchronizeRecurringMembership(result.snapshot, routing.ownerUid, effects);
  if (outcome.kind === "profile_pending" || outcome.kind === "not_found" ||
    (outcome.kind === "payment_pending" && result.snapshot.paymentState === "paid")) throw new Error("Membership is not ready for recurring reconciliation");
  console.info("membership.webhook.reconciled", { eventType: event.type, outcome: outcome.kind });
}

/** Verify Stripe's signature before routing recurring membership or legacy one-time purchases. */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Invalid Secret" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  console.log("📧 Incoming Event from Stripe:", event.type, "↓↓↓↓↓↓↓↓")

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        if (session.mode === "subscription") {
          const effects = createMembershipEffects();
          const result = await effects.provider.readSessionSnapshot(session.id, { id: event.id, createdMs: event.created * 1000 });
          if (result.kind === "snapshot") {
            const legacyUid = readLegacySessionOwner(session) ?? undefined;
            const outcome = await synchronizeRecurringMembership(result.snapshot, legacyUid, effects);
            if (outcome.kind === "profile_pending" || outcome.kind === "not_found" ||
              (outcome.kind === "payment_pending" && result.snapshot.paymentState === "paid")) throw new Error("Membership is not ready for checkout reconciliation");
            if (legacyUid && ["claimed", "already_claimed", "payment_inactive"].includes(outcome.kind)) {
              await recordLegacyRecurringReceipt(session, result.snapshot, legacyUid);
            }
            console.info("membership.webhook.reconciled", { eventType: event.type, outcome: outcome.kind });
          } else if (result.kind === "not_found") {
            throw new Error("Membership checkout was not found");
          }
          break;
        }
        if (event.type !== "checkout.session.completed") break;
        // console.log("========================session=====================")
        // console.log(session)
        // console.log("========================session=====================")
        const uid = session.metadata?.uid;
        const email = session.metadata?.email;
        if (!uid || !email) {
          throw new Error(`Missing Uid or Email in ${event.type}`)
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
          },
          emergencyContact: {
            firstName: null,
            lastName: null,
            phoneNumber: null,
          },
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
          //TODO: Separate membership and product
          const updates = {
            memberType: MemberType.LiftTime,
            lastTransactionId: transactionRef.id,
            memberDetails,
            updatedAt: FieldValue.serverTimestamp()
          } as Profile

          if (session.amount_total === 388850 || session.amount_total === 777700) {
            updates["accountType"] = AccountType.Organization
            updates["organizationEmail"] = email
            updates["organizationEmailUpdateCount"] = 0
          }

          await Promise.all([
            profileRef.set(
              updates
              ,
              { merge: true }
            ),
            transactionRef.set({
              ...transactionData,
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
            }),
          ]);
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = InvoiceSubscriptionSchema.parse(event.data.object);
        const subscriptionId = invoice.parent?.subscription_details.subscription ?? invoice.subscription;
        if (!subscriptionId) break;
        if (invoice.parent?.subscription_details.subscription && invoice.subscription && invoice.parent.subscription_details.subscription !== invoice.subscription) {
          throw new Error("Stripe invoice subscription references disagree");
        }
        await reconcileRecurringEvent(subscriptionId, event);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscriptionId = MembershipSubscriptionIdSchema.parse(event.data.object.id);
        await reconcileRecurringEvent(subscriptionId, event);
        break;
      }

      default: {
        // console.log(" === event type ===")
        // console.log("| ", event.type, " |")
        // console.log(" === event type ===")
      }

    }
  } catch (error) {
    console.error("membership.webhook.failed", { eventType: event.type, errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ received: false, error: "Unable to process Stripe event" }, { status: 500 })
  }


  return NextResponse.json({ received: true }, { status: 200 });
}
