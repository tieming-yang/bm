import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/subscriptions/[id]/cancel">
) {
  const { id } = await ctx.params;
  const { uid } = await request.json();

  try {
    const canceledSubscription = await stripe.subscriptions.cancel(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;

    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ status: 200 });
}
