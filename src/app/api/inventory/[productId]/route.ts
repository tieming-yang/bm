import { NextRequest, NextResponse } from "next/server";

export default async function GET(request: NextRequest, ctx: RouteContext<"/api/inventory/[productId]">) {
  const { productId } = await ctx.params
  if (!productId) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  
}