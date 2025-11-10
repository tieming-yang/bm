import { useQuery } from "@tanstack/react-query";
import { fetchRemoteFlags } from "@/lib/firebase/remote-config";

export function useRemoteFlags() {
  return useQuery({
    queryKey: ["remote-config"],
    queryFn: fetchRemoteFlags,
    staleTime: 60 * 1000,
  });
}

export function useRemoteFlag(key: keyof Awaited<ReturnType<typeof fetchRemoteFlags>>) {
  const { data } = useRemoteFlags();
  return data?.[key];
}
