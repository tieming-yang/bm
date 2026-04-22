"use client";

import { useQuery } from "@tanstack/react-query";
import { readARData } from "./data";
import Link from "next/link";
import { QueryKey } from "@/utils/query-keys";
import Loading from "../../loading";
import Config from "@/models/config";
import useTranslation from "@/hooks/use-translation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import toTitle from "../../../utils/to-title";

export default function ClientARPage() {
  const { t } = useTranslation("ar");
  const {
    data: arData,
    isLoading: isARDataLoading,
    error,
    isError,
  } = useQuery({
    queryKey: QueryKey.arData,
    queryFn: readARData,
  });

  if (isError) {
    console.error("❌", error);
  }

  if (!arData) {
    return null;
  }

  return (
    <main className="container relative z-50 px-4 py-16 mx-auto space-y-7 min-h-svh">
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

      {arData.length > 0 ? (
        <ul className="grid gap-5 lg:grid-cols-2">
          {arData.map((data) => {
            const targetURL = getR2URL(data.targetsPath);
            const modelURL = getR2URL(data.modelPath);

            return (
              <li key={data.title}>
                <Card className="py-5 rounded-full text-center">
                  <CardTitle>
                    <Link href={`/ar/${data.id}?target=${targetURL}&model=${modelURL}`}>
                      <p className="font-mono text-2xl">{toTitle(data.title)}</p>
                    </Link>
                  </CardTitle>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-center text-muted-foreground">{t("ar.page.empty")}</p>
      )}
    </main>
  );
}

function getR2URL(path: string) {
  return Config.r2ARAssetsBaseURL + path;
}
