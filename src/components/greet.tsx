"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Heart, ImageUp, Languages, Link2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./greet.module.css";
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
  const { t, currentLanguage, changeLanguage } = useTranslation("greet");
  const locale: GreetingLocale = currentLanguage?.toLowerCase().startsWith("en") ? "en" : "zh-TW";
  const [context, setContext] = useState<GreetingRequest | null>(null);
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<GreetingShareOutcome | null>(null);
  const requestKey = context ? `${context.date}/${context.period}/${locale}` : "";

  useEffect(() => {
    if (!shareOutcome) return;
    const timeout = setTimeout(() => setShareOutcome(null), 8_000);
    return () => clearTimeout(timeout);
  }, [shareOutcome]);

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
    <section className={styles.screen} aria-labelledby="greet-title">
      <header className={styles.topbar}>
        <Link href="/" className={styles.home} aria-label={t("home")} title={t("home")}>
          <Image src="/logos/logo.webp" alt="" width={36} height={36} />
        </Link>
        <h1 id="greet-title" className="sr-only">{t("title")}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={styles.iconButton}
          aria-label={t(locale === "en" ? "switchToChinese" : "switchToEnglish")}
          title={t(locale === "en" ? "switchToChinese" : "switchToEnglish")}
          onClick={() => changeLanguage(locale === "en" ? "zh-TW" : "en")}
        >
          <Languages className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <div className={styles.cardArea}>
        {ready ? (
          <figure className={styles.card}>
            {/* The displayed Blob is also the file used for sharing and downloading. */}
            <img
              src={ready.imageUrl}
              alt={ready.description.artworkTitle}
              aria-describedby="greet-card-text"
              width={1080}
              height={1350}
              className={styles.cardImage}
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
          <div className={styles.placeholder} role={failed ? "alert" : "status"} aria-live="polite">
            {failed ? (
              <>
                <p className="max-w-xs text-base leading-relaxed">{t("loadFailed")}</p>
                <Button type="button" variant="ghost" size="icon" className={styles.iconButton} aria-label={t("retry")} title={t("retry")} onClick={() => setRetry((value) => value + 1)}>
                  <RefreshCw className="size-5" aria-hidden="true" />
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
      </div>

      <div className={styles.actions} role="group" aria-label={t("actions")}>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} aria-label={t("shareLink")} title={t("shareLink")} onClick={handleShareLink} disabled={sharing}>
          <Link2 className="size-5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} aria-label={t("shareCard")} title={t("shareCard")} onClick={handleShareImage} disabled={!ready || sharing}>
          <ImageUp className="size-5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.iconButton} aria-label={t("download")} title={t("download")} onClick={handleDownload} disabled={!ready}>
          <Download className="size-5" aria-hidden="true" />
        </Button>
        <Button asChild variant="ghost" size="icon" className={`${styles.iconButton} ${styles.support}`}>
          <Link href="/glory-share" aria-label={t("support")} title={t("support")}>
            <Heart className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p className={shareMessage ? styles.message : "sr-only"} role="status" aria-live="polite">{shareMessage}</p>
    </section>
  );
}
