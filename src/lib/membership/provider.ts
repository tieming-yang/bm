import { createHash } from "node:crypto";
import { z } from "zod";
import type Stripe from "stripe";
import {
  MembershipCheckoutInputSchema,
  MembershipCheckoutUrlSchema,
  MembershipSessionIdSchema,
  type MembershipCheckoutInput,
} from "./contracts.ts";
import {
  GUEST_MEMBERSHIP_PURPOSE,
  MembershipSnapshotSchema,
  MembershipStatusSchema,
  MembershipSubscriptionIdSchema,
  MembershipUidSchema,
  type MembershipSnapshot,
} from "./domain.ts";

const seconds = z.number().int().nonnegative().max(Math.floor(Number.MAX_SAFE_INTEGER / 1000));
const milliseconds = z.number().int().nonnegative().safe();
const customerId = z.string().regex(/^cus_[A-Za-z0-9]+$/);
const priceId = z.string().regex(/^price_[A-Za-z0-9]+$/);
const invoiceId = z.string().regex(/^in_[A-Za-z0-9]+$/);
const metadata = z.record(z.string());

function objectId<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.object({ id: schema }).transform((value) => value.id)]);
}

const PriceSchema = z.object({
  object: z.literal("price"),
  id: priceId,
  livemode: z.boolean(),
  type: z.literal("recurring"),
  recurring: z.object({ interval: z.enum(["month", "year"]), interval_count: z.literal(1) }),
});

const SessionSchema = z.object({
  object: z.literal("checkout.session"),
  id: MembershipSessionIdSchema,
  livemode: z.boolean(),
  mode: z.literal("subscription"),
  status: z.enum(["open", "complete", "expired"]),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  customer: objectId(customerId).nullable(),
  subscription: objectId(MembershipSubscriptionIdSchema).nullable(),
  customer_details: z.object({ email: z.string().nullable() }).nullable(),
  invoice: z.unknown().refine((value) => value !== undefined, "Stripe checkout invoice field is missing"),
  metadata,
  line_items: z.object({
    object: z.literal("list"),
    has_more: z.literal(false),
    data: z.array(z.object({ quantity: z.literal(1), price: PriceSchema })).length(1),
  }),
});

const SubscriptionSchema = z.object({
  object: z.literal("subscription"),
  id: MembershipSubscriptionIdSchema,
  livemode: z.boolean(),
  customer: objectId(customerId),
  status: MembershipStatusSchema,
  start_date: seconds,
  ended_at: seconds.nullable(),
  canceled_at: seconds.nullable(),
  metadata,
  items: z.object({
    object: z.literal("list"),
    has_more: z.literal(false),
    data: z.array(z.object({
      id: z.string().regex(/^si_[A-Za-z0-9]+$/),
      quantity: z.literal(1),
      current_period_start: seconds,
      current_period_end: seconds,
      price: PriceSchema,
    })).length(1),
  }),
  latest_invoice: z.unknown().refine((value) => value !== undefined, "Stripe latest invoice field is missing"),
});

const InvoiceSchema = z.object({
  object: z.literal("invoice"),
  id: invoiceId,
  livemode: z.boolean(),
  customer: objectId(customerId),
  status: z.enum(["draft", "open", "paid", "uncollectible", "void"]).nullable(),
  parent: z.object({
    type: z.literal("subscription_details"),
    subscription_details: z.object({ subscription: objectId(MembershipSubscriptionIdSchema) }),
  }).nullish(),
  subscription: objectId(MembershipSubscriptionIdSchema).nullish(),
  lines: z.unknown(),
});

const PaidInvoiceLinesSchema = z.object({
  object: z.literal("list"),
  has_more: z.literal(false),
  data: z.array(z.object({
    object: z.literal("line_item"),
    invoice: invoiceId,
    livemode: z.boolean(),
    amount: z.number().int().nonnegative(),
    quantity: z.literal(1),
    period: z.object({ start: seconds, end: seconds }),
    parent: z.object({
      type: z.literal("subscription_item_details"),
      subscription_item_details: z.object({
        subscription: MembershipSubscriptionIdSchema,
        subscription_item: z.string().regex(/^si_[A-Za-z0-9]+$/),
        proration: z.literal(false),
      }),
    }).nullish(),
    subscription: objectId(MembershipSubscriptionIdSchema).nullish(),
    subscription_item: z.string().regex(/^si_[A-Za-z0-9]+$/).nullish(),
    proration: z.boolean().optional(),
    pricing: z.object({
      type: z.literal("price_details"),
      price_details: z.object({ price: priceId }),
    }).nullish(),
    price: objectId(priceId).nullish(),
  })).length(1),
});

/** Configuration is server-owned; neither caller identity nor caller-selected prices belong here. */
export const MembershipProviderConfigSchema = z.object({
  monthlyPriceId: priceId,
  yearlyPriceId: priceId,
  livemode: z.boolean(),
  baseUrl: z.string().url().refine((value) => {
    const url = new URL(value);
    return value === url.origin && !url.username && !url.password &&
      (value === "https://beyond-media.art" || (url.protocol === "http:" && url.hostname === "localhost"));
  }, "Membership return origin must be canonical or local development"),
}).strict().refine((value) => value.monthlyPriceId !== value.yearlyPriceId, "Membership prices must be distinct").readonly();
export type MembershipProviderConfig = z.infer<typeof MembershipProviderConfigSchema>;

/** Optional event evidence records causality without treating event delivery as current payment state. */
export const MembershipProviderEventSchema = z.object({
  id: z.string().regex(/^evt_[A-Za-z0-9]+$/),
  createdMs: milliseconds,
}).strict().readonly();
export type MembershipProviderEvent = z.infer<typeof MembershipProviderEventSchema>;

/** Narrow Stripe effects allow workflow tests without real sessions, charges, or SDK infrastructure. */
export type MembershipStripeEffects = {
  checkout: { sessions: {
    retrieve: (id: string, params?: Stripe.Checkout.SessionRetrieveParams) => Promise<unknown>;
    list: (params: Stripe.Checkout.SessionListParams) => Promise<unknown>;
    create: (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => Promise<unknown>;
  } };
  subscriptions: {
    retrieve: (id: string, params?: Stripe.SubscriptionRetrieveParams) => Promise<unknown>;
    update: (id: string, params: Stripe.SubscriptionUpdateParams, options: Stripe.RequestOptions) => Promise<unknown>;
  };
};

/** A checkout with no subscription yet cannot be represented as a canonical purchase. */
export type MembershipSnapshotResult =
  | { kind: "snapshot"; snapshot: MembershipSnapshot }
  | { kind: "payment_pending" }
  | { kind: "payment_inactive" }
  | { kind: "not_found" };

/** Recognize only the explicit guest purpose; legacy ownership is never inferred from payer email. */
export function readMembershipMetadataSource(input: unknown): { source: "guest" | "legacy"; ownerUid?: string } {
  const value = metadata.parse(input);
  const purpose = value.membershipPurpose;
  if (purpose !== undefined && purpose !== GUEST_MEMBERSHIP_PURPOSE) {
    throw new Error("Stripe membership purpose is unsupported");
  }
  const ownerUid = value.uid === undefined ? undefined : MembershipUidSchema.parse(value.uid);
  return purpose === GUEST_MEMBERSHIP_PURPOSE
    ? { source: "guest", ...(ownerUid === undefined ? {} : { ownerUid }) }
    : { source: "legacy", ...(ownerUid === undefined ? {} : { ownerUid }) };
}

/** Read the established legacy account association from a verified webhook session. */
export function readLegacySessionOwner(input: unknown): string | null {
  const session = z.object({ object: z.literal("checkout.session"), metadata }).parse(input);
  const source = readMembershipMetadataSource(session.metadata);
  return source.source === "legacy" ? source.ownerUid ?? null : null;
}

function readPlan(price: z.infer<typeof PriceSchema>, config: MembershipProviderConfig): "monthly" | "yearly" {
  if (price.livemode !== config.livemode) throw new Error("Stripe membership price environment mismatch");
  const plan = price.id === config.monthlyPriceId ? "monthly" : price.id === config.yearlyPriceId ? "yearly" : undefined;
  if (!plan) throw new Error("Stripe subscription has an unsupported membership price");
  if (price.recurring.interval !== (plan === "monthly" ? "month" : "year")) {
    throw new Error("Stripe membership price interval mismatch");
  }
  return plan;
}

function matchingReference(primary: string | null | undefined, legacy: string | null | undefined, label: string): string {
  if (!primary && !legacy) throw new Error(`Stripe ${label} is missing`);
  if (primary && legacy && primary !== legacy) throw new Error(`Stripe ${label} references conflict`);
  return primary ?? legacy!;
}

function readPaidThrough(invoiceInput: unknown, subscription: z.infer<typeof SubscriptionSchema>, config: MembershipProviderConfig): number {
  if (invoiceInput === null) return 0;
  const invoice = InvoiceSchema.parse(invoiceInput);
  if (invoice.livemode !== config.livemode || invoice.customer !== subscription.customer) {
    throw new Error("Stripe invoice customer or environment mismatch");
  }
  const invoiceSubscription = matchingReference(
    invoice.parent?.subscription_details.subscription,
    invoice.subscription,
    "invoice subscription",
  );
  if (invoiceSubscription !== subscription.id) throw new Error("Stripe invoice subscription mismatch");
  if (invoice.status !== "paid") return 0;

  const line = PaidInvoiceLinesSchema.parse(invoice.lines).data[0];
  const item = subscription.items.data[0];
  if (line.invoice !== invoice.id || line.livemode !== config.livemode) {
    throw new Error("Stripe invoice line identity or environment mismatch");
  }
  const lineSubscription = matchingReference(line.parent?.subscription_item_details.subscription, line.subscription, "invoice line subscription");
  const lineItem = matchingReference(line.parent?.subscription_item_details.subscription_item, line.subscription_item, "invoice subscription item");
  const linePrice = matchingReference(line.pricing?.price_details.price, line.price, "invoice line price");
  if (lineSubscription !== subscription.id || lineItem !== item.id || linePrice !== item.price.id) {
    throw new Error("Stripe invoice line does not cover the membership subscription item");
  }
  if (line.proration === true || line.period.end <= line.period.start || line.period.end > item.current_period_end) {
    throw new Error("Stripe paid membership invoice has an invalid coverage period");
  }
  return line.period.end * 1000;
}

/** Validate payment, price, customer, and subscription linkage before creating private evidence. */
export function parseMembershipSnapshot(
  sessionInput: unknown,
  subscriptionInput: unknown,
  configInput: MembershipProviderConfig,
  observedAtMs: number,
  eventInput?: MembershipProviderEvent,
): MembershipSnapshot {
  const config = MembershipProviderConfigSchema.parse(configInput);
  milliseconds.parse(observedAtMs);
  const event = eventInput === undefined ? undefined : MembershipProviderEventSchema.parse(eventInput);
  const session = SessionSchema.parse(sessionInput);
  const subscription = SubscriptionSchema.parse(subscriptionInput);
  if (session.livemode !== config.livemode || subscription.livemode !== config.livemode) {
    throw new Error("Stripe membership environment mismatch");
  }
  if (session.subscription !== subscription.id || session.customer !== subscription.customer) {
    throw new Error("Stripe checkout customer or subscription mismatch");
  }
  const sessionSource = readMembershipMetadataSource(session.metadata);
  const subscriptionSource = readMembershipMetadataSource(subscription.metadata);
  if (sessionSource.source !== subscriptionSource.source) throw new Error("Stripe checkout and subscription purposes disagree");
  if (sessionSource.ownerUid && subscriptionSource.ownerUid && sessionSource.ownerUid !== subscriptionSource.ownerUid) {
    throw new Error("Stripe checkout and subscription owners disagree");
  }
  const item = subscription.items.data[0];
  const plan = readPlan(item.price, config);
  const sessionPrice = session.line_items.data[0].price;
  if (readPlan(sessionPrice, config) !== plan || sessionPrice.id !== item.price.id) {
    throw new Error("Stripe checkout and subscription prices disagree");
  }
  if (sessionSource.source === "guest" && plan !== "monthly") {
    throw new Error("Guest membership checkout must use the monthly plan");
  }
  const rawEmail = session.customer_details?.email;
  if (!rawEmail) throw new Error("Stripe checkout has no payer email");
  const payerEmail = z.string().email().parse(rawEmail.trim().toLowerCase());
  const paidThroughMs = Math.max(
    readPaidThrough(session.invoice, subscription, config),
    readPaidThrough(subscription.latest_invoice, subscription, config),
  );
  const paymentState = session.status === "expired" || subscription.status === "incomplete_expired"
    ? "failed"
    : session.status === "complete" && (session.payment_status === "paid" ||
      (session.payment_status === "no_payment_required" && paidThroughMs > 0)) ? "paid" : "pending";
  return MembershipSnapshotSchema.parse({
    sessionId: session.id,
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    priceId: item.price.id,
    plan,
    source: sessionSource.source,
    payerEmail,
    paymentState,
    subscriptionStatus: subscription.status,
    startedAtMs: subscription.start_date * 1000,
    endedAtMs: subscription.ended_at === null ? null : subscription.ended_at * 1000,
    canceledAtMs: subscription.canceled_at === null ? null : subscription.canceled_at * 1000,
    currentPeriodStartMs: item.current_period_start * 1000,
    currentPeriodEndMs: item.current_period_end * 1000,
    paidThroughMs,
    providerObservedAtMs: observedAtMs,
    eventId: event?.id ?? null,
    eventCreatedMs: event?.createdMs ?? null,
  });
}

function isMissingResource(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "resource_missing" &&
    "statusCode" in error && error.statusCode === 404;
}

function idempotencyKey(purpose: string, values: readonly string[]): string {
  return `membership-${purpose}-${createHash("sha256").update(JSON.stringify(values)).digest("hex")}`;
}

/** Construct explicit provider effects; creation and ownership writes are called only by authorized workflows. */
export function createMembershipProvider(
  stripe: MembershipStripeEffects,
  configInput: MembershipProviderConfig,
  now: () => number,
) {
  const config = MembershipProviderConfigSchema.parse(configInput);

  const readSession = async (sessionId: string) => {
    MembershipSessionIdSchema.parse(sessionId);
    try {
      const session = SessionSchema.parse(await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price", "invoice"] }));
      if (session.id !== sessionId) throw new Error("Stripe returned a different checkout session");
      if (session.livemode !== config.livemode) throw new Error("Stripe membership environment mismatch");
      readMembershipMetadataSource(session.metadata);
      readPlan(session.line_items.data[0].price, config);
      return session;
    } catch (error) {
      if (isMissingResource(error)) return null;
      throw error;
    }
  };

  const readSubscription = async (subscriptionId: string) => {
    MembershipSubscriptionIdSchema.parse(subscriptionId);
    try {
      const subscription = SubscriptionSchema.parse(await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] }));
      if (subscription.id !== subscriptionId) throw new Error("Stripe returned a different membership subscription");
      if (subscription.livemode !== config.livemode) throw new Error("Stripe membership environment mismatch");
      readMembershipMetadataSource(subscription.metadata);
      readPlan(subscription.items.data[0].price, config);
      return subscription;
    } catch (error) {
      if (isMissingResource(error)) return null;
      throw error;
    }
  };

  return {
    /** Create only the configured monthly checkout; retries reuse the same environment-bound attempt. */
    async createGuestCheckout(input: MembershipCheckoutInput): Promise<{ kind: "checkout"; url: string }> {
      const value = MembershipCheckoutInputSchema.parse(input);
      const purpose = { membershipPurpose: GUEST_MEMBERSHIP_PURPOSE };
      const sessionInput = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: config.monthlyPriceId, quantity: 1 }],
        locale: value.locale,
        automatic_tax: { enabled: true },
        metadata: purpose,
        subscription_data: { metadata: purpose },
        success_url: `${config.baseUrl}/glory-share/claim?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.baseUrl}/daily-blessing`,
      }, {
        idempotencyKey: idempotencyKey("checkout", [String(config.livemode), value.attemptId]),
      });
      const session = z.object({
        object: z.literal("checkout.session"), id: MembershipSessionIdSchema,
        mode: z.literal("subscription"), livemode: z.boolean(),
        metadata, url: MembershipCheckoutUrlSchema,
      }).parse(sessionInput);
      if (session.livemode !== config.livemode || session.metadata.membershipPurpose !== GUEST_MEMBERSHIP_PURPOSE) {
        throw new Error("Stripe created an inconsistent guest membership checkout");
      }
      return { kind: "checkout", url: session.url };
    },

    /** Read current provider evidence, including when a claim races webhook delivery. */
    async readSessionSnapshot(sessionId: string, event?: MembershipProviderEvent): Promise<MembershipSnapshotResult> {
      const observedAtMs = milliseconds.parse(now());
      const session = await readSession(sessionId);
      if (!session) return { kind: "not_found" };
      if (session.status !== "complete") return { kind: session.status === "expired" ? "payment_inactive" : "payment_pending" };
      if (!session.subscription) throw new Error("Completed membership checkout has no subscription");
      const subscription = await readSubscription(session.subscription);
      if (!subscription) return { kind: "not_found" };
      return { kind: "snapshot", snapshot: parseMembershipSnapshot(session, subscription, config, observedAtMs, event) };
    },

    /** Find the original checkout for a subscription event without relying on mutable account metadata. */
    async readSubscriptionSnapshot(subscriptionId: string, event?: MembershipProviderEvent): Promise<MembershipSnapshotResult> {
      const observedAtMs = milliseconds.parse(now());
      const subscription = await readSubscription(subscriptionId);
      if (!subscription) return { kind: "not_found" };
      const sessions = z.object({
        object: z.literal("list"), has_more: z.literal(false),
        data: z.array(z.object({ id: MembershipSessionIdSchema })).max(1),
      }).parse(await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 2 }));
      if (sessions.data.length === 0) return { kind: "not_found" };
      const session = await readSession(sessions.data[0].id);
      if (!session) return { kind: "not_found" };
      if (session.status !== "complete") return { kind: session.status === "expired" ? "payment_inactive" : "payment_pending" };
      if (!session.subscription) throw new Error("Completed membership checkout has no subscription");
      return { kind: "snapshot", snapshot: parseMembershipSnapshot(session, subscription, config, observedAtMs, event) };
    },

    /** Preserve the guest marker after claiming so subsequent events retain the same lifecycle. */
    async readSubscriptionRouting(subscriptionId: string): Promise<{ source: "guest" | "legacy"; ownerUid?: string } | null> {
      const subscription = await readSubscription(subscriptionId);
      return subscription ? readMembershipMetadataSource(subscription.metadata) : null;
    },

    /** Attach only a reserved owner; a conflicting existing owner is an explicit domain outcome. */
    async attachOwner(subscriptionId: string, uid: string): Promise<{ kind: "attached" } | { kind: "conflict" }> {
      MembershipUidSchema.parse(uid);
      const subscription = await readSubscription(subscriptionId);
      if (!subscription) throw new Error("Reserved membership subscription is missing");
      const source = readMembershipMetadataSource(subscription.metadata);
      if (source.ownerUid !== undefined) return { kind: source.ownerUid === uid ? "attached" : "conflict" };
      // Stripe merges metadata keys; writing only uid preserves the purpose and other existing keys.
      const updated = SubscriptionSchema.parse(await stripe.subscriptions.update(subscriptionId, {
        metadata: { uid },
      }, {
        idempotencyKey: idempotencyKey("owner", [String(config.livemode), subscriptionId, uid]),
      }));
      if (updated.id !== subscriptionId || updated.customer !== subscription.customer || updated.livemode !== config.livemode) {
        throw new Error("Stripe ownership update changed membership identity");
      }
      const updatedSource = readMembershipMetadataSource(updated.metadata);
      if (updatedSource.source !== source.source) throw new Error("Stripe ownership update changed membership purpose");
      if (updatedSource.ownerUid !== uid) throw new Error("Stripe did not confirm the reserved membership owner");
      return { kind: "attached" };
    },
  };
}

/** Provider dependency consumed by membership workflows. */
export type MembershipProvider = ReturnType<typeof createMembershipProvider>;
