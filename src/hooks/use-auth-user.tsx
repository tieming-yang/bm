import { useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import firebase from "@/lib/firebase/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";

export default function useAuthUser() {
  const query = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebase.auth, (auth) => {
      query.setQueryData<User | null>(QueryKey.authUser, auth ?? null);
    });
    return unsubscribe;
  // query client instance is stable for the lifetime of the provider
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: authUser,
    isLoading: isAuthUserLoading,
    error: isAuthUserError,
  } = useQuery<User | null>({
    queryKey: QueryKey.authUser,
    queryFn: async () => firebase.auth.currentUser,
    initialData: () => firebase.auth.currentUser ?? null,
    staleTime: 0,
    refetchOnMount: "always",
  });

  return { authUser, isAuthUserLoading, isAuthUserError };
}
