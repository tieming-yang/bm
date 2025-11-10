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

const GLORY_SHARE_PRICE_LIVE = "price_1RTZ2JCEoRN5rFZ6SIQW1OQJ";
const GLORY_SHARE_PRICE_SANDBOX = "price_1SRZGzCSXuz1o7AS6iBEbC0m";
export const GLORY_SHARE_PRICE = Config.isProd ? GLORY_SHARE_PRICE_LIVE : GLORY_SHARE_PRICE_SANDBOX;

export const stripe = new Stripe(STRIPE_API_KEY);
