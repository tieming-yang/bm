"use client";

import { useQuery } from "@tanstack/react-query";
import { readAR } from "./data";
import { QueryKey } from "@/utils/query-keys";
import Loading from "../../loading";
import { useMultiTranslation } from "@/hooks/use-translation";
import ARViewer from "./components/ar-viewer";
import { getR2URL } from "../../../utils/get-r2-path";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ClientARPage() {
  const { t } = useMultiTranslation(["ar", "bible-character"]);
  const [viewStatus, setViewStatus] = useState<"idle" | "arViewer">("idle");
  const {
    data: arData,
    isLoading: isARDataLoading,
    error,
    isError,
  } = useQuery({
    queryKey: QueryKey.ar,
    queryFn: readAR,
  });

  if (isError) {
    console.error("❌", error);
  }

  if (!arData) {
    return null;
  }

  return (
    <main className="container relative z-50 mx-auto flex min-h-svh flex-col px-4 py-16 gap-7">
      <Loading show={isARDataLoading} />
      <section>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
          {t("ar.page.title")}
        </h1>
        <div className="py-10 text-center">
          <p className="italic text-md md:text-2xl font-chinese text-primary-foreground-gradient">
            {t("ar.page.intro")}
          </p>
        </div>
      </section>

      {viewStatus === "arViewer" && (
        <div>
          <ARViewer arData={arData[0]} targetURL={getR2URL(arData[0].targetsPath)} />

          <div className="fixed bottom-30 right-5 z-70">
            <Button variant={"destructive"} onClick={() => setViewStatus("idle")}>
              {t("ar.page.rescan")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center-safe mt-auto">
        {viewStatus === "idle" && (
          <Button type="button" onClick={() => setViewStatus("arViewer")}>
            {t("ar.page.start")}
          </Button>
        )}
      </div>
    </main>
  );
}

function toCharacterKey(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, "-");
}
