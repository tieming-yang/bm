"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useTranslation from "@/hooks/use-translation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import ReactPlayer from "react-player";

type Lesson = {
  id: string;
  title: string;
  theme: string;
  summary: string;
  videoId: string;
  slug: string;
};

const buildYouTubeLink = (videoId: string | undefined) => `https://youtu.be/${videoId}`;
export function toSlug(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD") // split accents from letters
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ") // common readability tweak
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

const LESSON_KEY = "lesson";
const DEFAULT_SLUG = "fish";

export default function SchoolPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = searchParams.get(LESSON_KEY);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [viewStatus, setViewStatus] = useState<"none" | "videoModal" | "loading">("loading");

  const playerRef = useRef(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [playerHeight, setPlayerHeight] = useState(0);

  useLayoutEffect(() => {
    const playerContainer = playerContainerRef.current;
    if (!playerContainer) return;

    function updateHeight() {
      if (!playerContainer) return;
      setPlayerHeight(playerContainer.getBoundingClientRect().height);
    }
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(playerContainer);

    return () => {
      observer.disconnect();
    };
  }, []);

  const { t, i18n } = useTranslation("school");
  const { t: tEn } = useTranslation("school", { lng: "en" });
  const zhLessons = (t("school.lessons", { returnObjects: true }) as Lesson[]) ?? [];
  const enLessons = (tEn("school.lessons", { returnObjects: true }) as Lesson[]) ?? [];
  const renderLessons = zhLessons.map((lesson, index) => {
    return {
      ...lesson,
      slug: toSlug(enLessons[index].title),
    };
  });

  useEffect(() => {
    const selected = renderLessons.find((lesson) => lesson.slug === slug) ?? renderLessons[0];

    setSelectedLesson(selected);
  }, []);

  useEffect(() => {
    if (!selectedLesson) return;

    const selectedEpisode = document.getElementById(selectedLesson.id);

    selectedEpisode?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [selectedLesson]);

  if (renderLessons.length === 0) {
    console.error(
      "❌",
      `renderLessons.length: ${renderLessons.length}, selectedLesson: ${selectedLesson}`
    );
    return null;
  }

  /** * @see https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams
   */
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const embedSrc = `https://www.youtube.com/embed/${selectedLesson?.videoId}`;
  const watchLink = buildYouTubeLink(selectedLesson?.videoId);

  return (
    <div className="container relative px-4 py-16 mx-auto space-y-7 no-scrollbar overflow-y-auto">
      <div
        ref={playerContainerRef}
        className="fixed lg:hidden space-y-5 top-0 right-0 left-0 w-dvw z-100 rounded-b-3xl pb-3 backdrop-blur-xl border shadow-xl border-primary/20 bg-background/10 shadow-primary/20"
      >
        <ReactPlayer
          ref={playerRef}
          style={{ width: "100%", height: "auto", aspectRatio: "16/9" }}
          src={embedSrc}
          controls
          onReady={() => {
            setViewStatus("none");
          }}
          onEnded={() => {
            if (!selectedLesson) return;
            let nextIndex = 0;
            const currentIndex = renderLessons.findIndex(
              (lesson) => lesson.id === selectedLesson.id
            );
            if (currentIndex === renderLessons.length - 1) {
              nextIndex = 0;
            } else {
              nextIndex = currentIndex + 1;
            }

            setSelectedLesson(renderLessons.at(nextIndex)!);
          }}
        />

        <div className="relative">
          <div className="flex flex-row gap-x-5 max-w-32 mx-auto">
            <Button
              onClick={() => {
                if (!selectedLesson) return;
                const currentIndex = renderLessons.findIndex(
                  (lesson) => lesson.id === selectedLesson.id
                );
                if (currentIndex === -1) return;
                const nextIndex = (currentIndex - 1 + renderLessons.length) % renderLessons.length;

                setSelectedLesson(renderLessons[nextIndex]);
              }}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              onClick={() => {
                if (!selectedLesson) return;
                const currentIndex = renderLessons.findIndex(
                  (lesson) => lesson.id === selectedLesson.id
                );
                if (currentIndex === -1) return;
                const nextIndex = (currentIndex + 1) % renderLessons.length;

                setSelectedLesson(renderLessons[nextIndex]);
              }}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      <section style={{ paddingTop: playerHeight }} className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex flex-row justify-between">
            <h1 className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm uppercase tracking-[0.2em] text-primary">
              {t("school.badge")}
            </h1>
            <p className="italic text-md md:text-2xl font-chinese text-primary-foreground-gradient">
              {t("school.hero.intro")}
            </p>
          </div>

          <p className="text-lg text-muted-foreground">{t("school.hero.description")}</p>
          <div className="flex flex-wrap gap-4 justify-center-safe">
            <Button size="lg" className="px-8 rounded-full border-primary/40" asChild>
              <a href="/glory-share">{t("school.hero.joinGloryShare")}</a>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden h-fit hidden lg:block border shadow-xl rounded-3xl border-primary/20 bg-background/10 shadow-primary/20">
          <div className="w-full aspect-video">
            <iframe
              className="w-full h-full"
              src={embedSrc}
              title={t("school.playerTitle", { title: selectedLesson?.title })}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderLessons.map((lesson, index) => {
            const isActive = (selectedLesson && selectedLesson.slug) === lesson.slug;

            return (
              <Card
                id={lesson.id}
                key={lesson.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => {
                  setSelectedLesson(lesson);
                  router.replace(pathname + "?" + createQueryString(LESSON_KEY, lesson.slug), {
                    scroll: false,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedLesson(lesson);
                  }
                }}
                className={`border bg-background/90 transition-all focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "cursor-default border-primary/60 shadow-lg shadow-primary/20"
                    : "cursor-pointer border-primary/15 hover:border-primary/40"
                }`}
              >
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-primary">
                    <span className="text-sm font-semibold">{index + 1}</span>
                    <span className="text-sm uppercase tracking-[0.4em] text-primary/70">
                      {lesson.theme}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{lesson.title}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {lesson.summary}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="p-8 text-center border shadow-lg rounded-3xl border-primary/10 bg-background/80 shadow-primary/5">
        <h3 className="text-2xl font-semibold">{t("school.ctaSection.title")}</h3>
        <p className="max-w-3xl mx-auto mt-3 text-muted-foreground">
          {t("school.ctaSection.description")}
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <Button size="lg" className="border-primary/40" asChild>
            <a href="/glory-share">{t("school.ctaSection.supportMinistry")}</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
