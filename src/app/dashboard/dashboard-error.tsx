"use client";

import { ContentState } from "@/components/ui/content-state";
import useTranslation from "@/hooks/use-translation";

export default function DashboardError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("dashboard");

  return <ContentState title={t("loadFailed")} onRetry={onRetry} />;
}
