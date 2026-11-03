import assert from "node:assert/strict";
import test from "node:test";
import {
  createMembershipClaimPath,
  getMembershipClaimRecovery,
  requestMembershipCheckout,
  requestMembershipClaim,
} from "./client.ts";
import { MembershipClaimResultSchema } from "./contracts.ts";

const checkoutInput = { attemptId: "62096aa7-f204-42dd-b92d-c4c9d6cd210c", locale: "en" as const };
const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_fixture";
const sessionId = "cs_test_fixture";
const signal = () => new AbortController().signal;

test("guest checkout sends only the stable attempt and locale, without authentication or pricing", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const result = await requestMembershipCheckout(checkoutInput, async (url, init) => {
    calls.push({ url, init });
    return Response.json({ kind: "checkout", url: checkoutUrl });
  }, signal());
  assert.deepEqual(result, { kind: "checkout", url: checkoutUrl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/membership/checkout");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.cache, "no-store");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), checkoutInput);
  assert.deepEqual(calls[0].init.headers, { "Content-Type": "application/json" });
});

test("checkout rejects unsafe navigation URLs and leaked provider fields", async () => {
  for (const body of [
    { kind: "checkout", url: "https://checkout.stripe.com.evil.example/pay" },
    { kind: "checkout", url: "http://checkout.stripe.com/pay" },
    { kind: "checkout", url: "https://user:password@checkout.stripe.com/pay" },
    { kind: "checkout", url: "https://checkout.stripe.com:444/pay" },
    { kind: "checkout", url: checkoutUrl, customerId: "cus_private" },
    { kind: "checkout" },
  ]) {
    await assert.rejects(requestMembershipCheckout(checkoutInput, async () => Response.json(body), signal()));
  }
});

test("claim sends the token as a header and the validated session as the only input", async () => {
  await requestMembershipClaim(sessionId, "verified-token", async (url, init) => {
    assert.equal(url, "/api/membership/claim");
    assert.equal(init.method, "POST");
    assert.equal(init.cache, "no-store");
    assert.deepEqual(JSON.parse(init.body as string), { sessionId });
    assert.deepEqual(init.headers, { "Content-Type": "application/json", Authorization: "Bearer verified-token" });
    return Response.json({ kind: "claimed" });
  }, signal());
});

test("rejects malformed inputs before sending a request", async () => {
  const unexpectedRequest = async () => { throw new Error("Request must not be sent"); };
  await assert.rejects(requestMembershipCheckout({ ...checkoutInput, attemptId: "not-a-uuid" }, unexpectedRequest, signal()), /Invalid uuid/);
  await assert.rejects(requestMembershipClaim("https://example.com", "token", unexpectedRequest, signal()));
  await assert.rejects(requestMembershipClaim(sessionId, "token\r\nother-header", unexpectedRequest, signal()), /malformed/);
  await assert.rejects(requestMembershipClaim(sessionId, "", unexpectedRequest, signal()), /malformed/);
});

test("validates every claim result and selects a concrete recovery without payer details", async () => {
  const recoveries = {
    claimed: "complete", already_claimed: "complete", email_verification_required: "verify-email",
    email_mismatch: "sign-in", payment_pending: "retry", payment_inactive: "contact",
    existing_membership: "account", claimed_elsewhere: "contact", profile_pending: "retry",
    not_found: "contact", authentication_required: "sign-in", invalid_request: "contact", retryable_failure: "retry",
  } as const;
  assert.deepEqual(Object.keys(recoveries).sort(), [...MembershipClaimResultSchema.unwrap().shape.kind.options].sort());
  for (const kind of MembershipClaimResultSchema.unwrap().shape.kind.options) {
    const status = kind === "authentication_required" ? 401 : kind === "invalid_request" ? 400 : kind === "retryable_failure" ? 503 : 200;
    const result = await requestMembershipClaim(sessionId, "token", async () => Response.json({ kind }, { status }), signal());
    assert.equal(getMembershipClaimRecovery(result.kind), recoveries[kind]);
    await assert.rejects(requestMembershipClaim(sessionId, "token", async () => Response.json({ kind, email: "private@example.com" }, { status }), signal()));
  }
});

test("HTTP errors cannot masquerade as success and failures remain explicit outcomes", async () => {
  for (const [kind, status] of [["invalid_request", 400], ["retryable_failure", 503]] as const) {
    const result = await requestMembershipCheckout(checkoutInput, async () => Response.json({ kind }, { status }), signal());
    assert.deepEqual(result, { kind });
  }
  await assert.rejects(requestMembershipCheckout(checkoutInput, async () => Response.json({ kind: "checkout", url: checkoutUrl }, { status: 503 }), signal()), /status/);
  await assert.rejects(requestMembershipClaim(sessionId, "token", async () => Response.json({ kind: "claimed" }, { status: 401 }), signal()), /status/);
  await assert.rejects(requestMembershipClaim(sessionId, "token", async () => Response.json({ kind: "unknown" }), signal()));
  await assert.rejects(requestMembershipClaim(sessionId, "token", async () => new Response("Provider failure", { status: 503 }), signal()));
});

test("aborted late responses cannot navigate or report a successful claim", async () => {
  for (const action of ["checkout", "claim"] as const) {
    const controller = new AbortController();
    let resolveResponse!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const pending = action === "checkout"
      ? requestMembershipCheckout(checkoutInput, async () => response, controller.signal)
      : requestMembershipClaim(sessionId, "token", async () => response, controller.signal);
    controller.abort();
    resolveResponse(Response.json(action === "checkout" ? { kind: "checkout", url: checkoutUrl } : { kind: "claimed" }));
    await assert.rejects(pending, { name: "AbortError" });
  }
});

test("claim return URL cannot become an external redirect or contain arbitrary query content", () => {
  const path = createMembershipClaimPath(sessionId);
  const signin = new URL(`/signin?${new URLSearchParams({ redirectTo: path })}`, "https://beyond-media.art");
  assert.equal(signin.searchParams.get("redirectTo"), "/glory-share/claim?session_id=cs_test_fixture");
  assert.throws(() => createMembershipClaimPath("//evil.example"));
  assert.throws(() => createMembershipClaimPath("cs_test_fixture&email=private@example.com"));
});
