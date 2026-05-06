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
import { Card, CardContent } from "@/components/ui/card";

type ExperienceStep = {
  number: string;
  title: string;
  description: string;
};

export default function ClientARPage() {
  const { t } = useMultiTranslation(["ar", "bible-character"]);
  const experienceSteps =
    (t("ar.page.experience.steps", { returnObjects: true }) as ExperienceStep[]) ?? [];

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
    <main className="container relative z-50 flex flex-col px-4 py-16 mx-auto min-h-svh gap-7">
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

        <section className="p-8 border shadow-xl rounded-3xl border-primary/15 bg-linear-to-r from-background/90 via-primary/5 to-background/70 shadow-primary/10 backdrop-blur">
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.4em] text-primary/70">
                {t("ar.page.experience.badge")}
              </p>
              <h2 className="text-3xl font-semibold text-balance font-chinese">
                {t("ar.page.experience.title")}
              </h2>
              <p className="max-w-2xl text-muted-foreground font-chinese">
                {t("ar.page.experience.description")}
              </p>
            </div>

            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {experienceSteps.map((step) => (
                <li key={step.number} className="list-none">
                  <Card className="h-full border-primary/15 bg-background/90 shadow-sm shadow-primary/10">
                    <CardContent className="flex flex-col h-full p-5 gap-4">
                      <div className="inline-flex items-center justify-center text-sm font-semibold h-11 w-11 rounded-2xl bg-primary/10 text-primary">
                        {step.number}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold font-chinese">{step.title}</h3>
                        <p className="text-sm leading-6 text-muted-foreground font-chinese">
                          {step.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </section>

      {viewStatus === "arViewer" && (
        <div>
          <ARViewer arData={arData[0]} targetURL={getR2URL(arData[0].targetsPath)} />
          {/* 
          <div className="fixed bottom-30 right-5 z-70">
            <Button variant={"destructive"} onClick={() => setViewStatus("idle")}>
              {t("ar.page.rescan")}
            </Button>
          </div> */}
        </div>
      )}

      <div className="flex mt-auto justify-center-safe">
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
