import { z } from "zod";

const ProfileUidSchema = z.string().min(1).max(128).refine(
  (uid) => !uid.includes("/") && uid !== "." && uid !== ".."
);

/** A Stripe subscription identifier safe to use as a single document ID. */
export const SubscriptionIdSchema = z.string().regex(/^sub_[A-Za-z0-9]+$/);

/** The target account; authentication and server-owned state establish authority. */
export const CancellationInputSchema = z.object({ uid: ProfileUidSchema });

/** Public cancellation results contain no provider identifiers or private state. */
export const CancellationResultSchema = z.object({
  status: z.literal(200),
  outcome: z.enum(["canceled", "already_canceled"]),
});

/** A completed cancellation or an authorized retry of an existing cancellation. */
export type CancellationResult = z.infer<typeof CancellationResultSchema>;
