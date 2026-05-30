import API from "@/app/api/api";
import { isSupportedEventSlug } from "@/app/(works)/school/summer/2026/domain";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

type EventCapacityRouteContext = {
  params: Promise<{ eventSlug: string }>;
};

export async function GET(
  request: NextRequest,
  ctx: EventCapacityRouteContext
) {
  const { eventSlug } = await ctx.params;

  if (!isSupportedEventSlug(eventSlug)) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  try {
    const registrationsSnap = await firebaseAdmin.db
      .collection("school_registrations")
      .where("eventSlug", "==", eventSlug)
      .get();

    let registeredCount = 0;
    registrationsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (Array.isArray(data.children)) {
        registeredCount += data.children.length;
      }
    });

    const maxCapacity = 20;
    const remainingSlots = Math.max(0, maxCapacity - registeredCount);

    return NextResponse.json({
      registeredCount,
      maxCapacity,
      remainingSlots,
    });
  } catch (error) {
    const { status, message } = API.getErrorInfo(error);
    return NextResponse.json({ error: message }, { status });
  }
}
