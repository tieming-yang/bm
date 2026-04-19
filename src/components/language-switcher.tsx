"use client";

import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import useTranslation from "../hooks/use-translation";

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex h-10 w-[168px] rounded-full border border-border/70 bg-background/60 p-1">
        <span className="sr-only">Switch language</span>
      </div>
    );
  }

  const isChinese = currentLanguage.startsWith("zh");

  return (
    <div
      aria-label="Switch language"
      className="relative isolate inline-flex overflow-hidden rounded-full border border-border/70 bg-background/60 p-1 shadow-sm backdrop-blur-md"
      role="group"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-1 z-0 w-20 rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out",
          isChinese ? "translate-x-20" : "translate-x-0"
        )}
      />
      <button
        aria-pressed={!isChinese}
        className={cn(
          "relative z-10 h-8 min-w-20 rounded-full px-3 text-sm font-medium",
          !isChinese ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => changeLanguage("en")}
        type="button"
      >
        English
      </button>
      <button
        aria-pressed={isChinese}
        className={cn(
          "relative z-10 h-8 min-w-20 rounded-full px-3 text-sm font-medium",
          isChinese ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => changeLanguage("zh-TW")}
        type="button"
      >
        中文
      </button>
    </div>
  );
}
