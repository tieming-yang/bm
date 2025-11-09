import "server-only";

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe Env is Missing");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
