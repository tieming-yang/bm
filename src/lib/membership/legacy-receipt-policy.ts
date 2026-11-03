import { z } from "zod";
import { MembershipSessionIdSchema } from "./contracts.ts";
import { MembershipSnapshotSchema, MembershipSubscriptionIdSchema, MembershipUidSchema, type MembershipSnapshot } from "./domain.ts";

const customerId = z.string().regex(/^cus_[A-Za-z0-9]+$/);
const paymentIntentId = z.string().regex(/^pi_[A-Za-z0-9]+$/);
const customerReference = z.union([customerId, z.object({ id: customerId }).transform((value) => value.id)]);
const subscriptionReference = z.union([MembershipSubscriptionIdSchema, z.object({ id: MembershipSubscriptionIdSchema }).transform((value) => value.id)]);
const paymentIntentReference = z.union([paymentIntentId, z.object({ id: paymentIntentId }).transform((value) => value.id)]).nullable();
const nullableText = z.string().nullable();
const address = z.object({ city: nullableText, country: nullableText, line1: nullableText, line2: nullableText, postal_code: nullableText, state: nullableText });
const emergencyContact = z.object({ firstName: nullableText, lastName: nullableText, phoneNumber: nullableText });

const LegacySessionSchema = z.object({
  object: z.literal("checkout.session"),
  id: MembershipSessionIdSchema,
  mode: z.literal("subscription"),
  status: z.literal("complete"),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  customer: customerReference,
  subscription: subscriptionReference,
  payment_intent: paymentIntentReference,
  amount_total: z.number().int().nonnegative().safe(),
  currency: z.string().regex(/^[a-z]{3}$/),
  customer_details: z.object({ email: z.string(), name: nullableText, phone: nullableText, address: address.nullable() }),
  metadata: z.record(z.string()),
});

/** Existing recurring receipt fields, excluding timestamps and unneeded provider metadata. */
export const LegacyRecurringTransactionSchema = z.object({
  sessionId: MembershipSessionIdSchema,
  paymentIntentId: paymentIntentReference,
  customerId: customerReference,
  paymentStatus: z.enum(["paid", "unpaid", "no_payment_required"]),
  metadata: z.object({ uid: MembershipUidSchema, email: z.string().email(), priceId: z.string().regex(/^price_[A-Za-z0-9]+$/) }),
  amountTotal: z.number().int().nonnegative().safe(),
  currency: z.string().regex(/^[a-z]{3}$/),
}).readonly();

/** A checked legacy receipt plus contact details; it contains no entitlement mutation. */
export type LegacyRecurringReceipt = {
  transaction: z.infer<typeof LegacyRecurringTransactionSchema>;
  memberDetails: {
    name: string | null;
    phone: string | null;
    address: Omit<z.infer<typeof address>, "postal_code"> & { postalCode: string | null };
  };
};

/** Derive only a paid, provider-linked legacy receipt; delayed unpaid events have nothing to record yet. */
export function deriveLegacyRecurringReceipt(
  sessionInput: unknown,
  snapshotInput: MembershipSnapshot,
  uidInput: string,
): LegacyRecurringReceipt | null {
  const uid = MembershipUidSchema.parse(uidInput);
  const snapshot = MembershipSnapshotSchema.parse(snapshotInput);
  const session = LegacySessionSchema.parse(sessionInput);
  if (snapshot.source !== "legacy" || session.metadata.membershipPurpose !== undefined) {
    throw new Error("Legacy receipt cannot record a guest membership");
  }
  if (snapshot.sessionId !== session.id || snapshot.subscriptionId !== session.subscription || snapshot.customerId !== session.customer) {
    throw new Error("Legacy receipt does not match its verified membership purchase");
  }
  if (session.metadata.uid !== uid || session.metadata.priceId !== snapshot.priceId) {
    throw new Error("Legacy receipt account or price metadata does not match the activated purchase");
  }
  const payerEmail = z.string().email().parse(session.customer_details.email.trim().toLowerCase());
  if (payerEmail !== snapshot.payerEmail) throw new Error("Legacy receipt payer email changed");
  if (snapshot.paymentState !== "paid" || session.payment_status === "unpaid") return null;
  const sourceAddress = session.customer_details.address;
  return {
    transaction: LegacyRecurringTransactionSchema.parse({
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      metadata: { uid, email: payerEmail, priceId: snapshot.priceId },
      amountTotal: session.amount_total,
      currency: session.currency,
    }),
    memberDetails: {
      name: session.customer_details.name,
      phone: session.customer_details.phone,
      address: {
        city: sourceAddress?.city ?? null,
        country: sourceAddress?.country ?? null,
        line1: sourceAddress?.line1 ?? null,
        line2: sourceAddress?.line2 ?? null,
        postalCode: sourceAddress?.postal_code ?? null,
        state: sourceAddress?.state ?? null,
      },
    },
  };
}

/** A receipt replay may fill payment completion but cannot change the original purchase identity. */
export function validateLegacyReceiptReplay(existingInput: unknown, next: LegacyRecurringReceipt): void {
  const existing = LegacyRecurringTransactionSchema.parse(existingInput);
  for (const key of ["sessionId", "paymentIntentId", "customerId", "amountTotal", "currency"] as const) {
    if (existing[key] !== next.transaction[key]) throw new Error(`Legacy receipt ${key} changed`);
  }
  if (existing.metadata.uid !== next.transaction.metadata.uid || existing.metadata.priceId !== next.transaction.metadata.priceId) {
    throw new Error("Legacy receipt owner or price changed");
  }
  if (existing.paymentStatus !== "unpaid" && existing.paymentStatus !== next.transaction.paymentStatus) {
    throw new Error("Legacy receipt payment status moved backwards or changed");
  }
}

/** Preserve existing emergency contacts while updating only checkout-derived contact fields. */
export function deriveLegacyMemberDetails(receipt: LegacyRecurringReceipt, profileInput: unknown) {
  const profile = z.object({
    memberDetails: z.object({ emergencyContact: emergencyContact.optional() }).optional(),
  }).parse(profileInput);
  return {
    ...receipt.memberDetails,
    emergencyContact: profile.memberDetails?.emergencyContact ?? { firstName: null, lastName: null, phoneNumber: null },
  };
}
