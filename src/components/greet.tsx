"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Heart, ImageUp, Link2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";
import {
  getLocalGreetingContext,
  millisecondsUntilNextGreetingBoundary,
  type GreetingCardDescription,
  type GreetingLocale,
  type GreetingRequest,
} from "@/lib/greet/contracts";
import {
  loadGreetingCard,
  shareGreetingImage,
  shareGreetingLink,
  type GreetingShareOutcome,
} from "@/lib/greet/client";

type CardState =
  | { status: "loading" }
  | { status: "failed"; key: string }
  | {
      status: "ready";
      key: string;
      description: GreetingCardDescription;
      imageUrl: string;
      file: File;
    };

export default function Greet() {
  const { t, currentLanguage } = useTranslation("greet");
  const locale: GreetingLocale = currentLanguage?.toLowerCase().startsWith("en") ? "en" : "zh-TW";
  const [context, setContext] = useState<GreetingRequest | null>(null);
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<GreetingShareOutcome | null>(null);
  const requestKey = context ? `${context.date}/${context.period}/${locale}` : "";

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timeout);
      const now = new Date();
      const next = getLocalGreetingContext(now, locale);
      setContext((previous) =>
        previous?.date === next.date && previous.period === next.period && previous.locale === next.locale
          ? previous
          : next
      );
      // Recheck the clock periodically to notice device timezone or clock changes as well.
      timeout = setTimeout(refresh, Math.min(millisecondsUntilNextGreetingBoundary(now), 60_000));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [locale]);

  const date = context?.date;
  const period = context?.period;
  useEffect(() => {
    if (!date || !period) return;
    const controller = new AbortController();
    let disposed = false;
    let objectUrl: string | undefined;
    setCard({ status: "loading" });
    setShareOutcome(null);

    loadGreetingCard({ date, period, locale }, fetch, controller.signal)
      .then(({ description, blob }) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        const file = new File([blob], description.filename, { type: "image/png" });
        setCard({ status: "ready", key: requestKey, description, imageUrl: objectUrl, file });
      })
      .catch(() => {
        if (!disposed) setCard({ status: "failed", key: requestKey });
      });

    return () => {
      disposed = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [date, period, locale, requestKey, retry]);

  const ready = card.status === "ready" && card.key === requestKey ? card : null;
  const failed = card.status === "failed" && card.key === requestKey;

  const handleShareLink = () => {
    setSharing(true);
    setShareOutcome(null);
    void shareGreetingLink(t("shareTitle"), {
      share: navigator.share?.bind(navigator),
      copy: navigator.clipboard?.writeText.bind(navigator.clipboard),
    }).then((outcome) => {
      setShareOutcome(outcome);
      setSharing(false);
    });
  };

  const handleShareImage = () => {
    if (!ready) return;
    setSharing(true);
    setShareOutcome(null);
    void shareGreetingImage(ready.file, {
      share: navigator.share?.bind(navigator),
      canShare: navigator.canShare?.bind(navigator),
    }).then((outcome) => {
      setShareOutcome(outcome);
      setSharing(false);
    });
  };

  const handleDownload = () => {
    if (!ready) return;
    const anchor = document.createElement("a");
    anchor.href = ready.imageUrl;
    anchor.download = ready.file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  let shareMessage = "";
  switch (shareOutcome) {
    case "copied":
      shareMessage = t("linkCopied");
      break;
    case "download-needed":
      shareMessage = t("downloadInstead");
      break;
    case "failed":
      shareMessage = t("shareFailed");
      break;
    case "shared":
    case "cancelled":
    case null:
      break;
    default:
      shareOutcome satisfies never;
  }

  return (
    <section className="relative mx-auto w-full max-w-3xl px-4 pt-10 pb-28 sm:px-8 sm:pt-14" aria-labelledby="greet-title">
      <header className="mx-auto mb-8 max-w-xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-secondary uppercase">
          <Sparkles className="size-4" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 id="greet-title" className="mb-4 font-serif text-3xl leading-snug sm:text-4xl">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t("intro")}</p>
      </header>

      <div className="mx-auto max-w-[540px]">
        {ready ? (
          <figure className="overflow-hidden rounded-2xl bg-[#f5efe3] shadow-[0_20px_80px_#00000055] ring-1 ring-secondary/20">
            {/* The displayed Blob is also the file used for sharing and downloading. */}
            <img
              src={ready.imageUrl}
              alt={ready.description.artworkTitle}
              aria-describedby="greet-card-text"
              width={1080}
              height={1350}
              className="block h-auto w-full"
              onError={() => setCard((current) =>
                current.status === "ready" && current.imageUrl === ready.imageUrl
                  ? { status: "failed", key: ready.key }
                  : current
              )}
            />
            <figcaption id="greet-card-text" className="sr-only">
              <p>{ready.description.greeting}</p>
              <p>{ready.description.dateLabel}</p>
              <p>{ready.description.verse}</p>
              <p>{ready.description.reference}</p>
              <p>Beyond Media</p>
            </figcaption>
          </figure>
        ) : (
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-5 rounded-2xl border border-secondary/20 bg-[#f5efe3] px-8 text-center text-[#344538]" role={failed ? "alert" : "status"} aria-live="polite">
            {failed ? (
              <>
                <p className="max-w-xs text-base leading-relaxed">{t("loadFailed")}</p>
                <Button type="button" variant="outline" className="w-auto gap-2 border-[#344538]/20 bg-transparent px-5 text-[#344538] hover:bg-[#e5dfd3] hover:text-[#344538]" onClick={() => setRetry((value) => value + 1)}>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  {t("retry")}
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <p className="text-sm">{t("loading")}</p>
              </>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3" aria-label={t("actions")}>
          <Button type="button" variant="outline" className="h-12 gap-2 px-3" onClick={handleShareLink} disabled={sharing}>
            <Link2 className="size-4 shrink-0" aria-hidden="true" />
            {t("shareLink")}
          </Button>
          <Button type="button" variant="outline" className="h-12 gap-2 px-3" onClick={handleShareImage} disabled={!ready || sharing}>
            <ImageUp className="size-4 shrink-0" aria-hidden="true" />
            {t("shareCard")}
          </Button>
          <Button type="button" variant="outline" className="h-12 gap-2 px-3" onClick={handleDownload} disabled={!ready}>
            <Download className="size-4 shrink-0" aria-hidden="true" />
            {t("download")}
          </Button>
          <Button asChild className="h-12 gap-2 bg-secondary px-3 text-secondary-foreground hover:bg-secondary/90">
            <Link href="/glory-share">
              <Heart className="size-4 shrink-0" aria-hidden="true" />
              {t("support")}
            </Link>
          </Button>
        </div>
        <p className="mt-3 min-h-6 text-center text-sm text-secondary" role="status" aria-live="polite">{shareMessage}</p>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">{t("closing")}</p>
      </div>
    </section>
  );
}
