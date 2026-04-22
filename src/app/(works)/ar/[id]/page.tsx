"use client";

import useTranslation from "@/hooks/use-translation";
import { useSearchParams } from "next/navigation";
import ARViewer from "../components/ar-viewer";

export default function ClientARViewPage() {
  const { t } = useTranslation("ar");
  const searchParams = useSearchParams();
  const targetURL = searchParams.get("target");
  const modelURL = searchParams.get("model");

  if (!targetURL || !modelURL) {
    const message = t("ar.viewer.errors.missingAssetUrls");
    console.error("❌", message);

    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-black px-6 text-center text-white">
        <p className="max-w-sm text-sm text-white/80">{message}</p>
      </main>
    );
  }

  return <ARViewer targetURL={targetURL} modelURL={modelURL} />;
}
