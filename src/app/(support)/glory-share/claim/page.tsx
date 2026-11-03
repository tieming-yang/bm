import { createPageMetadata, noIndexRobots } from "@/app/metadata";
import MembershipClaim from "@/components/membership-claim";
import { MembershipClaimInputSchema } from "@/lib/membership/contracts";

export const metadata = {
  ...createPageMetadata({
    path: "/glory-share/claim",
    title: "Activate your membership | 啟用會員資格",
    description: "Sign in with the verified email used at checkout to activate your Glory Share membership. 使用付款時相同且已驗證的電子郵件登入，以啟用榮耀份額會員資格。",
    robots: noIndexRobots,
  }),
  referrer: "no-referrer" as const,
};

export default async function MembershipClaimPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { session_id } = await searchParams;
  const input = MembershipClaimInputSchema.safeParse({ sessionId: session_id });
  return <MembershipClaim sessionId={input.success ? input.data.sessionId : null} />;
}
