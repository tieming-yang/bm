import { useEffect } from "react";
import { User } from "firebase/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Auth from "@/models/auth";

export default function useAuthUser() {
  const query = useQueryClient();

  useEffect(() => {
    const unsubscribe = Auth.onAuthStateChanged((user) => {
      query.setQueryData<User | null>(QueryKey.authUser, user ?? null);
    });
    return unsubscribe;
    // query client instance is stable for the lifetime of the provider
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: authUser,
    isLoading: isAuthUserLoading,
    error: authUserError,
  } = useQuery<User | null>({
    queryKey: QueryKey.authUser,
    queryFn: async () => Auth.user,
    initialData: () => Auth.user ?? null,
    staleTime: 0,
    refetchOnMount: "always",
  });

  return { authUser, isAuthUserLoading, authUserError };
}
