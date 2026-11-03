import { NextRequest, NextResponse } from "next/server";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { Policy, Role } from "@/lib/policy";
import { stripe } from "@/lib/stripe";
import { CancellationInputSchema, SubscriptionIdSchema } from "@/lib/subscriptions/cancellation";
import { z } from "zod";

const ActorProfileSchema = z.object({ role: z.nativeEnum(Role).optional() });
const StoredSubscriptionSchema = z.object({ id: SubscriptionIdSchema.optional() });
const ProviderSubscriptionSchema = z.object({
  id: SubscriptionIdSchema,
  metadata: CancellationInputSchema,
  status: z.enum([
    "active", "canceled", "incomplete", "incomplete_expired", "past_due",
    "paused", "trialing", "unpaid",
  ]),
});

function readOwnedSubscription(value: unknown, id: string, uid: string) {
  const subscription = ProviderSubscriptionSchema.parse(value);
  if (subscription.id !== id) throw new Error("Stripe returned a different subscription ID");
  if (subscription.metadata.uid !== uid) return { status: "conflict" as const };
  return { status: "owned" as const, subscription };
}

/** Cancels only subscriptions owned by the target account, for owners or privileged staff. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/subscriptions/[id]/cancel">
) {
  let checkpoint = "authentication";
  const context: Record<string, string> = {};
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    let actor;
    try {
      actor = await firebaseAdmin.auth.verifyIdToken(token);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && typeof error.code === "string" &&
          ["auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired",
            "auth/id-token-revoked", "auth/user-disabled"].includes(error.code)) {
        return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
      }
      throw error;
    }
    context.actorUid = actor.uid;

    checkpoint = "input_validation";
    const parsedId = SubscriptionIdSchema.safeParse((await ctx.params).id);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsedInput = CancellationInputSchema.safeParse(body);
    if (!parsedId.success || !parsedInput.success) {
      return NextResponse.json({ error: "Invalid cancellation parameters" }, { status: 422 });
    }
    const id = parsedId.data;
    const { uid } = parsedInput.data;
    context.targetUid = uid;
    context.subscriptionId = id;

    checkpoint = "actor_authorization";
    if (actor.uid !== uid) {
      const actorSnap = await firebaseAdmin.db.doc(`profiles/${actor.uid}`).get();
      if (!actorSnap.exists) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const actorProfile = ActorProfileSchema.parse(actorSnap.data());
      if (!Policy.isPrivileged(actorProfile.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    checkpoint = "ownership_validation";
    // The document path is server-owned; the editable profile.uid field is not authority.
    const subscriptionSnap = await firebaseAdmin.db.doc(`profiles/${uid}/subscriptions/${id}`).get();
    if (!subscriptionSnap.exists) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    const storedSubscription = StoredSubscriptionSchema.parse(subscriptionSnap.data());
    if (storedSubscription.id !== undefined && storedSubscription.id !== id) {
      throw new Error("Stored subscription ID does not match its document path");
    }

    checkpoint = "provider_ownership_validation";
    const ownership = readOwnedSubscription(await stripe.subscriptions.retrieve(id), id, uid);
    if (ownership.status === "conflict") {
      return NextResponse.json({ error: "Subscription ownership mismatch" }, { status: 409 });
    }
    if (ownership.subscription.status === "canceled") {
      console.info("Subscription cancellation", { ...context, checkpoint: "completed", outcome: "already_canceled" });
      return NextResponse.json({ status: 200, outcome: "already_canceled" });
    }

    checkpoint = "provider_cancellation";
    console.info("Subscription cancellation", { ...context, checkpoint });
    const canceled = readOwnedSubscription(await stripe.subscriptions.cancel(id), id, uid);
    if (canceled.status !== "owned" || canceled.subscription.status !== "canceled") {
      throw new Error("Stripe did not confirm cancellation of the owned subscription");
    }
    console.info("Subscription cancellation", { ...context, checkpoint: "completed", outcome: "canceled" });
  } catch (error) {
    console.error("Subscription cancellation failed", {
      ...context,
      checkpoint,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to cancel subscription" }, { status: 500 });
  }

  return NextResponse.json({ status: 200, outcome: "canceled" });
}
