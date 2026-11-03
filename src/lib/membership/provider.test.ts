import assert from "node:assert/strict";
import test from "node:test";
import { GUEST_MEMBERSHIP_PURPOSE } from "./domain.ts";
import {
  createMembershipProvider,
  parseMembershipSnapshot,
  readLegacySessionOwner,
  readMembershipMetadataSource,
  type MembershipProviderConfig,
  type MembershipStripeEffects,
} from "./provider.ts";

const config: MembershipProviderConfig = {
  monthlyPriceId: "price_monthly",
  yearlyPriceId: "price_yearly",
  livemode: false,
  baseUrl: "https://beyond-media.art",
};
const start = Date.parse("2026-11-03T00:00:00Z") / 1000;
const end = Date.parse("2026-12-03T00:00:00Z") / 1000;
const now = start * 1000 + 1000;
const attemptId = "11111111-1111-4111-8111-111111111111";

function fixture(plan: "monthly" | "yearly" = "monthly", source: "guest" | "legacy" = "guest") {
  const price = {
    object: "price", id: plan === "monthly" ? config.monthlyPriceId : config.yearlyPriceId,
    livemode: false, type: "recurring", recurring: { interval: plan === "monthly" ? "month" : "year", interval_count: 1 },
  };
  const purpose: Record<string, string> = source === "guest" ? { membershipPurpose: GUEST_MEMBERSHIP_PURPOSE } : { uid: "user-one" };
  const invoice = {
    object: "invoice", id: "in_initial", customer: "cus_one", livemode: false, status: "paid",
    parent: { type: "subscription_details", subscription_details: { subscription: "sub_one" } },
    lines: {
      object: "list", has_more: false,
      data: [{
        object: "line_item", invoice: "in_initial", livemode: false, amount: 770, quantity: 1,
        period: { start, end },
        parent: { type: "subscription_item_details", subscription_item_details: { subscription: "sub_one", subscription_item: "si_one", proration: false } },
        pricing: { type: "price_details", price_details: { price: price.id } },
      }],
    },
  };
  const session = {
    object: "checkout.session", id: "cs_test_one", mode: "subscription", livemode: false,
    status: "complete", payment_status: "paid", customer: "cus_one" as string | null,
    subscription: "sub_one" as string | null,
    customer_details: { email: "  Buyer@Example.com  " } as { email: string | null } | null,
    metadata: { ...purpose }, invoice: structuredClone(invoice) as unknown,
    line_items: { object: "list", has_more: false, data: [{ quantity: 1, price: structuredClone(price) }] },
  };
  const subscription = {
    object: "subscription", id: "sub_one", customer: "cus_one", livemode: false, status: "active",
    start_date: start, ended_at: null as number | null, canceled_at: null as number | null,
    metadata: { ...purpose },
    items: { object: "list", has_more: false, data: [{ id: "si_one", quantity: 1, current_period_start: start, current_period_end: end, price }] },
    latest_invoice: structuredClone(invoice) as unknown,
  };
  return { session, subscription, invoice };
}

function fakeStripe(values = fixture()) {
  const createCalls: Parameters<MembershipStripeEffects["checkout"]["sessions"]["create"]>[] = [];
  const updateCalls: Parameters<MembershipStripeEffects["subscriptions"]["update"]>[] = [];
  const retrievals: { id: string; params: unknown }[] = [];
  const effects: MembershipStripeEffects = {
    checkout: { sessions: {
      retrieve: async (id, params) => { retrievals.push({ id, params }); return structuredClone(values.session); },
      list: async () => ({ object: "list", has_more: false, data: [{ id: values.session.id }] }),
      create: async (params, options) => {
        createCalls.push([params, options]);
        return { object: "checkout.session", id: "cs_test_new", mode: "subscription", livemode: false, metadata: params.metadata, url: "https://checkout.stripe.com/c/pay/cs_test_new#secret" };
      },
    } },
    subscriptions: {
      retrieve: async (id, params) => { retrievals.push({ id, params }); return structuredClone(values.subscription); },
      update: async (id, params, options) => {
        updateCalls.push([id, params, options]);
        values.subscription.metadata = { ...values.subscription.metadata, ...(params.metadata as Record<string, string>) };
        return structuredClone(values.subscription);
      },
    },
  };
  return { effects, createCalls, updateCalls, retrievals, values };
}

test("verifies the full guest payment chain and derives monthly access without using amount totals", () => {
  const { session, subscription } = fixture();
  const snapshot = parseMembershipSnapshot({ ...session, amount_total: 847 }, subscription, config, now, { id: "evt_one", createdMs: now - 1000 });
  assert.equal(snapshot.plan, "monthly");
  assert.equal(snapshot.source, "guest");
  assert.equal(snapshot.payerEmail, "buyer@example.com");
  assert.equal(snapshot.paymentState, "paid");
  assert.equal(snapshot.paidThroughMs, end * 1000);
  assert.equal(snapshot.startedAtMs, start * 1000);
  assert.equal(snapshot.endedAtMs, null);
  assert.equal(snapshot.canceledAtMs, null);
  assert.equal(snapshot.eventId, "evt_one");
  assert.equal(snapshot.eventCreatedMs, now - 1000);
});

test("legacy monthly and yearly plans classify by configured price, including zero-total paid invoices", () => {
  for (const plan of ["monthly", "yearly"] as const) {
    const { session, subscription } = fixture(plan, "legacy");
    session.payment_status = "no_payment_required";
    const snapshot = parseMembershipSnapshot({ ...session, amount_total: 0 }, subscription, config, now);
    assert.equal(snapshot.plan, plan);
    assert.equal(snapshot.source, "legacy");
    assert.equal(snapshot.paymentState, "paid");
    assert.equal(snapshot.paidThroughMs, end * 1000);
    assert.equal(readLegacySessionOwner(session), "user-one");
  }
});

test("does not treat a free trial or unpaid invoice as proven paid coverage", () => {
  const { session, subscription, invoice } = fixture();
  session.payment_status = "no_payment_required";
  invoice.status = "open";
  session.invoice = invoice;
  subscription.latest_invoice = invoice;
  const snapshot = parseMembershipSnapshot(session, subscription, config, now);
  assert.equal(snapshot.paymentState, "pending");
  assert.equal(snapshot.paidThroughMs, 0);
});

test("retains only proven initial coverage when a later renewal invoice is unpaid", () => {
  const { session, subscription, invoice } = fixture();
  const nextEnd = Date.parse("2027-01-03T00:00:00Z") / 1000;
  subscription.items.data[0].current_period_start = end;
  subscription.items.data[0].current_period_end = nextEnd;
  subscription.status = "past_due";
  invoice.id = "in_renewal";
  invoice.status = "open";
  invoice.lines.data[0].invoice = invoice.id;
  invoice.lines.data[0].period = { start: end, end: nextEnd };
  subscription.latest_invoice = invoice;
  const snapshot = parseMembershipSnapshot(session, subscription, config, end * 1000 + 1000);
  assert.equal(snapshot.paymentState, "paid");
  assert.equal(snapshot.paidThroughMs, end * 1000);
  assert.equal(snapshot.currentPeriodEndMs, nextEnd * 1000);
});

test("paid renewal advances coverage, and cancellation retains the actual paid period and timestamps", () => {
  const { session, subscription, invoice } = fixture();
  const nextEnd = Date.parse("2027-01-03T00:00:00Z") / 1000;
  subscription.items.data[0].current_period_start = end;
  subscription.items.data[0].current_period_end = nextEnd;
  invoice.id = "in_renewal";
  invoice.lines.data[0].invoice = invoice.id;
  invoice.lines.data[0].period = { start: end, end: nextEnd };
  subscription.latest_invoice = invoice;
  subscription.status = "canceled";
  subscription.ended_at = end + 1;
  subscription.canceled_at = end + 1;
  const snapshot = parseMembershipSnapshot(session, subscription, config, end * 1000 + 1000);
  assert.equal(snapshot.paidThroughMs, nextEnd * 1000);
  assert.equal(snapshot.subscriptionStatus, "canceled");
  assert.equal(snapshot.endedAtMs, (end + 1) * 1000);
  assert.equal(snapshot.canceledAtMs, (end + 1) * 1000);
});

test("rejects wrong identities, environment, source markers, prices, interval, and quantity", () => {
  const mutations: ((data: ReturnType<typeof fixture>) => void)[] = [
    (data) => { data.session.customer = "cus_other"; },
    (data) => { data.session.subscription = "sub_other"; },
    (data) => { data.subscription.livemode = true; },
    (data) => { data.session.livemode = true; },
    (data) => { delete data.subscription.metadata.membershipPurpose; },
    (data) => { data.session.metadata.membershipPurpose = "unrecognized"; },
    (data) => { data.subscription.items.data[0].price.id = "price_unknown"; },
    (data) => { data.subscription.items.data[0].price.recurring.interval = "year"; },
    (data) => { data.subscription.items.data[0].price.recurring.interval_count = 2; },
    (data) => { data.subscription.items.data[0].quantity = 2; },
    (data) => { data.session.line_items.data[0].quantity = 2; },
    (data) => { data.subscription.items.data.push(structuredClone(data.subscription.items.data[0])); },
    (data) => { data.session.line_items.has_more = true; },
    (data) => { data.subscription.start_date = end + 1; },
    (data) => { data.session.customer_details = { email: "malformed" }; },
    (data) => { data.session.metadata.uid = "user-one"; data.subscription.metadata.uid = "user-two"; },
  ];
  for (const mutate of mutations) {
    const data = fixture();
    mutate(data);
    assert.throws(() => parseMembershipSnapshot(data.session, data.subscription, config, now));
  }
  const yearlyGuest = fixture("yearly", "guest");
  assert.throws(() => parseMembershipSnapshot(yearlyGuest.session, yearlyGuest.subscription, config, now), /monthly plan/);
});

test("rejects payment proof for another customer, subscription, item, price, or impossible coverage", () => {
  const mutations: ((invoice: ReturnType<typeof fixture>["invoice"]) => void)[] = [
    (invoice) => { invoice.customer = "cus_other"; },
    (invoice) => { invoice.parent.subscription_details.subscription = "sub_other"; },
    (invoice) => { invoice.livemode = true; },
    (invoice) => { invoice.lines.data[0].invoice = "in_other"; },
    (invoice) => { invoice.lines.data[0].parent.subscription_item_details.subscription = "sub_other"; },
    (invoice) => { invoice.lines.data[0].parent.subscription_item_details.subscription_item = "si_other"; },
    (invoice) => { invoice.lines.data[0].pricing.price_details.price = "price_other"; },
    (invoice) => { invoice.lines.data[0].parent.subscription_item_details.proration = true; },
    (invoice) => { invoice.lines.data[0].period.end = start; },
    (invoice) => { invoice.lines.data[0].period.end = end + 1; },
    (invoice) => { invoice.lines.data[0].amount = -1; },
    (invoice) => { invoice.lines.data.push(structuredClone(invoice.lines.data[0])); },
    (invoice) => { invoice.lines.has_more = true; },
  ];
  for (const mutate of mutations) {
    const { session, subscription, invoice } = fixture();
    mutate(invoice);
    subscription.latest_invoice = invoice;
    assert.throws(() => parseMembershipSnapshot(session, subscription, config, now));
  }
});

test("supports explicit older invoice references but rejects contradictions with current references", () => {
  const { session, subscription, invoice } = fixture();
  const oldLine = {
    ...invoice.lines.data[0], parent: undefined, pricing: undefined,
    subscription: "sub_one", subscription_item: "si_one", price: { id: "price_monthly" }, proration: false,
  };
  const oldInvoice = { ...invoice, parent: undefined, subscription: "sub_one", lines: { ...invoice.lines, data: [oldLine] } };
  subscription.latest_invoice = oldInvoice;
  assert.equal(parseMembershipSnapshot(session, subscription, config, now).paidThroughMs, end * 1000);
  subscription.latest_invoice = { ...invoice, subscription: "sub_other" };
  assert.throws(() => parseMembershipSnapshot(session, subscription, config, now), /references conflict/);
});

test("session observations are captured before I/O and request expanded initial and latest invoices", async () => {
  const fake = fakeStripe();
  let clock = now;
  const original = fake.effects.checkout.sessions.retrieve;
  fake.effects.checkout.sessions.retrieve = async (id, params) => { clock += 1000; return original(id, params); };
  const provider = createMembershipProvider(fake.effects, config, () => clock);
  const result = await provider.readSessionSnapshot("cs_test_one");
  assert.equal(result.kind, "snapshot");
  if (result.kind !== "snapshot") assert.fail("Expected snapshot");
  assert.equal(result.snapshot.providerObservedAtMs, now);
  assert.deepEqual(fake.retrievals.map((entry) => entry.params), [
    { expand: ["line_items.data.price", "invoice"] }, { expand: ["latest_invoice"] },
  ]);
});

test("open, expired, missing, and malformed sessions remain distinct", async () => {
  for (const status of ["open", "expired"]) {
    const fake = fakeStripe();
    fake.values.session.status = status;
    fake.values.session.customer = null;
    fake.values.session.customer_details = null;
    fake.values.session.subscription = null;
    fake.values.session.invoice = null;
    const provider = createMembershipProvider(fake.effects, config, () => now);
    assert.deepEqual(await provider.readSessionSnapshot("cs_test_one"), { kind: status === "open" ? "payment_pending" : "payment_inactive" });
    assert.equal(fake.retrievals.length, 1);
  }
  const fake = fakeStripe();
  fake.effects.checkout.sessions.retrieve = async () => { throw { code: "resource_missing", statusCode: 404 }; };
  assert.deepEqual(await createMembershipProvider(fake.effects, config, () => now).readSessionSnapshot("cs_test_one"), { kind: "not_found" });
  fake.effects.checkout.sessions.retrieve = async () => { throw new Error("Network failed"); };
  await assert.rejects(createMembershipProvider(fake.effects, config, () => now).readSessionSnapshot("cs_test_one"), /Network failed/);
  fake.effects.checkout.sessions.retrieve = async () => ({ ...fake.values.session, subscription: null });
  await assert.rejects(createMembershipProvider(fake.effects, config, () => now).readSessionSnapshot("cs_test_one"), /no subscription/);
});

test("subscription observations discover their one original checkout and reject ambiguity or wrong IDs", async () => {
  const fake = fakeStripe();
  const provider = createMembershipProvider(fake.effects, config, () => now);
  const result = await provider.readSubscriptionSnapshot("sub_one", { id: "evt_renewal", createdMs: now });
  assert.equal(result.kind, "snapshot");
  if (result.kind !== "snapshot") assert.fail("Expected snapshot");
  assert.equal(result.snapshot.sessionId, "cs_test_one");
  assert.equal(result.snapshot.eventId, "evt_renewal");
  fake.effects.checkout.sessions.list = async () => ({ object: "list", has_more: false, data: [] });
  assert.deepEqual(await provider.readSubscriptionSnapshot("sub_one"), { kind: "not_found" });
  fake.effects.checkout.sessions.list = async () => ({ object: "list", has_more: false, data: [{ id: "cs_test_one" }, { id: "cs_test_two" }] });
  await assert.rejects(provider.readSubscriptionSnapshot("sub_one"));
  fake.effects.subscriptions.retrieve = async () => ({ ...fake.values.subscription, id: "sub_other" });
  await assert.rejects(provider.readSubscriptionSnapshot("sub_one"), /different membership subscription/);
});

test("guest checkout fixes plan, returns, and purpose while idempotency stays stable and contains no identity", async () => {
  const fake = fakeStripe();
  const provider = createMembershipProvider(fake.effects, config, () => now);
  const input = { attemptId, locale: "zh-TW" as const };
  const first = await provider.createGuestCheckout(input);
  const second = await provider.createGuestCheckout(input);
  assert.deepEqual(first, second);
  assert.equal(first.kind, "checkout");
  assert.equal(fake.createCalls.length, 2);
  const [params, options] = fake.createCalls[0];
  assert.deepEqual(params.line_items, [{ price: config.monthlyPriceId, quantity: 1 }]);
  assert.equal(params.mode, "subscription");
  assert.equal(params.locale, "zh-TW");
  assert.deepEqual(params.metadata, { membershipPurpose: GUEST_MEMBERSHIP_PURPOSE });
  assert.deepEqual(params.subscription_data?.metadata, params.metadata);
  assert.equal(params.success_url, "https://beyond-media.art/glory-share/claim?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(params.cancel_url, "https://beyond-media.art/daily-blessing");
  assert.equal(params.customer_email, undefined);
  assert.equal(params.customer, undefined);
  assert.equal(params.discounts, undefined);
  assert.equal(options.idempotencyKey, fake.createCalls[1][1].idempotencyKey);
  assert.equal(options.idempotencyKey?.includes(attemptId), false);
  assert.equal(JSON.stringify(first).includes("metadata"), false);
});

test("checkout rejects injected authority, invalid destinations, and inconsistent provider results", async () => {
  const fake = fakeStripe();
  const provider = createMembershipProvider(fake.effects, config, () => now);
  await assert.rejects(provider.createGuestCheckout({ attemptId, locale: "en", uid: "victim" } as never));
  assert.equal(fake.createCalls.length, 0);
  assert.throws(() => createMembershipProvider(fake.effects, { ...config, baseUrl: "https://untrusted.example" }, () => now));
  fake.effects.checkout.sessions.create = async () => ({ object: "checkout.session", id: "cs_test_new", mode: "subscription", livemode: false, metadata: { membershipPurpose: GUEST_MEMBERSHIP_PURPOSE }, url: "https://checkout.stripe.com.evil.test/checkout" });
  await assert.rejects(provider.createGuestCheckout({ attemptId, locale: "en" }));
  fake.effects.checkout.sessions.create = async () => ({ object: "checkout.session", id: "cs_test_new", mode: "subscription", livemode: true, metadata: { membershipPurpose: GUEST_MEMBERSHIP_PURPOSE }, url: "https://checkout.stripe.com/c/pay/cs_test_new" });
  await assert.rejects(provider.createGuestCheckout({ attemptId, locale: "en" }), /inconsistent/);
});

test("ownership writes preserve guest routing and retries do not repeat an already confirmed attachment", async () => {
  const fake = fakeStripe();
  const provider = createMembershipProvider(fake.effects, config, () => now);
  assert.deepEqual(await provider.attachOwner("sub_one", "user-one"), { kind: "attached" });
  assert.deepEqual(fake.updateCalls[0][1], { metadata: { uid: "user-one" } });
  assert.equal(fake.values.subscription.metadata.membershipPurpose, GUEST_MEMBERSHIP_PURPOSE);
  assert.deepEqual(await provider.readSubscriptionRouting("sub_one"), { source: "guest", ownerUid: "user-one" });
  assert.deepEqual(await provider.attachOwner("sub_one", "user-one"), { kind: "attached" });
  assert.equal(fake.updateCalls.length, 1);
  assert.deepEqual(await provider.attachOwner("sub_one", "user-two"), { kind: "conflict" });
  assert.equal(fake.updateCalls.length, 1);
  assert.equal(fake.updateCalls[0][2].idempotencyKey?.includes("user-one"), false);
});

test("ownership mutation validates returned identity, purpose, and owner", async () => {
  for (const patch of [
    { id: "sub_other" },
    { customer: "cus_other" },
    { livemode: true },
    { metadata: { uid: "user-one" } },
    { metadata: { membershipPurpose: GUEST_MEMBERSHIP_PURPOSE, uid: "user-other" } },
  ]) {
    const fake = fakeStripe();
    fake.effects.subscriptions.update = async () => ({ ...fake.values.subscription, ...patch });
    await assert.rejects(createMembershipProvider(fake.effects, config, () => now).attachOwner("sub_one", "user-one"));
  }
});

test("source routing never infers a guest owner and validates legacy ownership without mutable profile email", () => {
  assert.deepEqual(readMembershipMetadataSource({ membershipPurpose: GUEST_MEMBERSHIP_PURPOSE }), { source: "guest" });
  assert.equal(readLegacySessionOwner(fixture().session), null);
  assert.equal(readLegacySessionOwner({ object: "checkout.session", metadata: {} }), null);
  assert.equal(readLegacySessionOwner(fixture("monthly", "legacy").session), "user-one");
  assert.throws(() => readMembershipMetadataSource({ membershipPurpose: "other-purpose" }));
  assert.throws(() => readMembershipMetadataSource({ uid: "profiles/victim" }));
});
