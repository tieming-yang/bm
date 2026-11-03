import { useAccountSetup } from "@/providers/account-setup-provider";

export default function useProfile() {
  const { profile, isProfileLoading, profileError, isProfileFetched, refetchProfile, state, retry } = useAccountSetup();
  return { profile, isProfileLoading, profileError, isProfileFetched, refetchProfile, accountSetupState: state, retryAccountSetup: retry };
}
