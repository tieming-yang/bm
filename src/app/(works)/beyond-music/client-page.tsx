"use client";

import useTranslation from "@/hooks/use-translation";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Song from "@/models/song";
import Link from "next/link";
import { toast } from "sonner";
import Loading from "@/app/loading";
import { sendGAEvent } from "@next/third-parties/google";
import useAuthUser from "@/hooks/use-auth-user";
import { useRouter, usePathname } from "next/navigation";
import useProtectedRoute from "@/hooks/use-protected-route";

export default function ClientBeyondMusicPage() {
  const router = useRouter();
  const path = usePathname();
  const { t } = useTranslation("beyond-music");
  const { t: tUI } = useTranslation("ui");
  const { t: tCommon } = useTranslation("common");
  const { authUser, isAuthUserLoading } = useAuthUser();

  useProtectedRoute();

  const {
    data: songs,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  if (isLoading || isAuthUserLoading) {
    return <Loading />;
  }

  // if (!authUser) {
  //   toast.error(tCommon("toast.mustSignIn"));

  //   router.replace(`/signin?redirectTo=${encodeURIComponent(path)}`);
  // }

  if (error) {
    toast.error(tUI("loading.error.title"), {
      description: tUI("loading.error.message"),
    });
  }

  return (
    <div className="container px-4 pt-3 mx-auto min-w-svw bg-primary-gradient-30 pb-50 space-y-16 min-h-svh">
      <h1 className="text-4xl leading-tight tracking-tight text-center text-balance md:text-5xl">
        {t("beyondMusic.hero.title")}
      </h1>
      {songs && (
        <ul className="flex flex-col gap-y-5">
          {songs.map((song) => {
            const { id, title, fileUrl } = song;

            return (
              <li key={id} className="">
                <Link
                  href={`/beyond-music/${encodeURIComponent(title)}`}
                  onClick={() => sendGAEvent("event", "listening", { value: title })}
                >
                  <p className="font-serif text-2xl text-center">{title}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
