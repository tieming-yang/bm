import Config from "@/models/config";
import "server-only";

import Stripe from "stripe";

export const STRIPE_PUBLISHABLE_KEY = Config.isProd
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_SANDBOX;

export const STRIPE_API_KEY = Config.isProd
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY_SANDBOX;

export const STRIPE_WEBHOOK_SECRET = Config.isProd
  ? process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_WEBHOOK_SECRET_SANDBOX;

if (!STRIPE_API_KEY || !STRIPE_PUBLISHABLE_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error("Stripe Env is Missing");
}

export const stripe = new Stripe(STRIPE_API_KEY);
