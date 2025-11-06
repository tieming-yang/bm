"use client";

import useTranslation from "@/hooks/use-translation";

export default function Loading() {
  const { t } = useTranslation("ui");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-t-2 border-[#7ec0cd] animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-[#7ec0cd]/50 animate-spin"></div>
          <div className="absolute inset-4 rounded-full border-b-2 border-[#7ec0cd]/30 animate-spin"></div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-[#7ec0cd] font-medium">{t("loading.title")}</p>
          <p className="text-sm text-gray-400">{t("loading.message")}</p>
        </div>
      </div>
    </div>
  );
}
