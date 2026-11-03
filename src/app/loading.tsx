"use client";

import useTranslation from "@/hooks/use-translation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingProps = {
  isInlined?: boolean;
  show?: boolean;
  fullScreen?: boolean;
};

/** Compact progress for an action; the containing button supplies its action label. */
export function ActionSpinner() {
  const { t } = useTranslation("ui");
  return <span role="status" className="inline-flex shrink-0 items-center"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">{t("loading.title")}</span></span>;
}

export default function Loading({ isInlined = false, show = true, fullScreen = false }: LoadingProps) {
  const { t } = useTranslation("ui");
  if (!show) return null;
  if (isInlined) return <ActionSpinner />;

  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-4 px-4 py-12 text-center", fullScreen ? "fixed inset-0 z-(--layer-overlay) bg-background" : "min-h-48 w-full")}>
      <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">{t("loading.title")}</p>
        <p className="text-sm text-muted-foreground">{t("loading.message")}</p>
      </div>
    </div>
  );
}
