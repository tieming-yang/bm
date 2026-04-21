"use client";

import { useQuery } from "@tanstack/react-query";
import { readARData } from "./data";
import Link from "next/link";
import { QueryKey } from "@/utils/query-keys";
import Loading from "../../loading";
import Config from "@/models/config";

export default function ClientARPage() {
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
    <main className="container relative z-50 px-4 py-16 mx-auto space-y-16">
      <Loading show={isARDataLoading} />
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
        Bible AR
      </h1>
      <ul>
        {arData.map((data) => {
          const targetURL = getR2URL(data.targetsPath);
          const modelURL = getR2URL(data.modelPath);

          return (
            <li key={data.title}>
              <Link href={`/ar/${data.id}?target=${targetURL}&model=${modelURL}`}>
                <p>{data.title}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function getR2URL(path: string) {
  return Config.r2ARAssetsBaseURL + path;
}
