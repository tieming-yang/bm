import { redirect } from "next/navigation";

import { stripe } from "@/lib/stripe";
import { GloryShareSuccessContent } from "@/app/(support)/glory-share/success/glory-share-success-content";

export default async function JoinSuccessPage({ searchParams }: PageProps<"/glory-share/success">) {
  const { session_id } = await searchParams;

  const sessionId = Array.isArray(session_id) ? session_id[0] : session_id;
  if (!sessionId) {
    throw new Error("Please provide a valid session_id (`cs_test_...`)");
  }

  const { status, customer_details } = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent"],
  });
  const customerEmail = customer_details?.email;

  if (status === "open") {
    return redirect("/");
  }

  if (status === "complete") {
    return <GloryShareSuccessContent email={customerEmail} />;
  }

  return redirect("/");
}
