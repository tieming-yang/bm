"use client";

import useTranslation from "@/hooks/use-translation";
import { Loader2 } from "lucide-react";

type LoadingProps = {
  isInlined?: boolean;
  show?: boolean;
};

export default function Loading({ isInlined = false, show = true }: LoadingProps) {
  if (!show) return null;

  const { t } = useTranslation("ui");

  if (isInlined) {
    return (
      <Loader2 className="absolute w-6 h-6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
    );
  }

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
