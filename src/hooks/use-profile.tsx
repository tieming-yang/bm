import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import useAuthUser from "./use-auth-user";
import Profile from "@/models/profiles";

export default function useProfile() {
  const { authUser, isAuthUserLoading } = useAuthUser();
  const uid = authUser?.uid;

  const profileQuery = useQuery({
    queryKey: uid ? QueryKey.profile(uid) : ["profile", "guest"],
    queryFn: async () => {
      if (!uid) throw new Error("No authenticated user");
      return Profile.get(uid);
    },
    enabled: !!uid,
  });

  return {
    profile: profileQuery.data,
    isProfileLoading: isAuthUserLoading || profileQuery.isLoading,
    profileError: profileQuery.error,
  };
}
