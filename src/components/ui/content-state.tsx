"use client";

import { AlertCircle, ImageOff } from "lucide-react";
import { Button } from "./button";
import useTranslation from "@/hooks/use-translation";

type ContentStateProps = {
  title: string;
  description?: string;
  onRetry?: () => void;
  kind?: "error" | "empty";
};

/** Persistent feedback for unavailable content without replacing unrelated page content. */
export function ContentState({ title, description, onRetry, kind = "error" }: ContentStateProps) {
  const { t } = useTranslation("ui");
  const Icon = kind === "error" ? AlertCircle : ImageOff;
  return (
    <section role={kind === "error" ? "alert" : "status"} className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center sm:p-8">
      <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {onRetry && <Button type="button" variant="outline" onClick={onRetry}>{t("actions.retry")}</Button>}
    </section>
  );
}
