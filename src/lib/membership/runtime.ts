import "server-only";
import { stripe } from "@/lib/stripe";
import Price from "@/models/prices";
import Config from "@/models/config";
import { createMembershipProvider } from "./provider.ts";
import { membershipStore } from "./store.ts";
import type { MembershipWorkflowEffects } from "./workflow.ts";

/** Production effect composition uses fixed server configuration, never request headers. */
export function createMembershipEffects(): MembershipWorkflowEffects {
  return {
    provider: createMembershipProvider(stripe, {
      monthlyPriceId: Price.getMonthlyPriceId(),
      yearlyPriceId: Price.getYearlyPriceId(),
      livemode: Config.isProd,
      baseUrl: new URL(Config.baseUrl).origin,
    }, Date.now),
    store: membershipStore,
    now: Date.now,
    checkpoint: (event, context) => console.info(event, context),
  };
}
