"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useTranslation from "@/hooks/use-translation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Lesson = {
  id: string;
  title: string;
  theme: string;
  summary: string;
  videoId: string;
  slug: string;
};

const buildYouTubeLink = (videoId: string) => `https://youtu.be/${videoId}`;
function toSlug(raw: string): string {
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
  const [selectedLessonSlug, setSelectedLessonSlug] = useState(slug ?? DEFAULT_SLUG);

  const { t, i18n } = useTranslation("school");
  const { t: tEn } = useTranslation("school", { lng: "en" });
  const zhLessons = (t("school.lessons", { returnObjects: true }) as Lesson[]) ?? [];
  const enLessons = (tEn("school.lessons", { returnObjects: true }) as Lesson[]) ?? [];
  const renderLessons = useMemo(
    () =>
      zhLessons.map((lesson, index) => {
        return {
          ...lesson,
          slug: toSlug(enLessons[index].title),
        };
      }),
    [i18n]
  );
  const selectedLesson = renderLessons.find((lesson) => lesson.slug === selectedLessonSlug);

  if (renderLessons.length === 0 || !selectedLesson) {
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

  const embedSrc = useMemo(
    () => `https://www.youtube.com/embed/${selectedLesson.videoId}`,
    [selectedLesson.videoId]
  );
  const watchLink = useMemo(
    () => buildYouTubeLink(selectedLesson.videoId),
    [selectedLesson.videoId]
  );

  return (
    <div className="container relative z-50 px-4 py-16 mx-auto space-y-16">
      <section className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm uppercase tracking-[0.2em] text-primary">
            {t("school.badge")}
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
            {t("school.hero.title")}
          </h1>
          <p className="italic text-md md:text-2xl font-chinese text-primary-foreground-gradient">
            {t("school.hero.intro")}
          </p>
          <p className="text-lg text-muted-foreground">{t("school.hero.description")}</p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="px-8 rounded-full" asChild>
              <a href={watchLink} target="_blank" rel="noopener noreferrer">
                {t("school.hero.watchOnYouTube")}
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 rounded-full border-primary/40"
              asChild
            >
              <a href="/glory-share">{t("school.hero.joinGloryShare")}</a>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden border shadow-xl rounded-3xl border-primary/20 bg-background/80 shadow-primary/20">
          <div className="w-full aspect-video">
            <iframe
              className="w-full h-full"
              src={embedSrc}
              title={t("school.playerTitle", { title: selectedLesson.title })}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-primary/70">
            {t("school.featuredSection.eyebrow")}
          </p>
          <h2 className="text-3xl font-semibold text-balance">
            {t("school.featuredSection.title")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderLessons.map((lesson, index) => {
            const isActive = selectedLessonSlug === lesson.slug;

            return (
              <Card
                key={lesson.slug}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => {
                  setSelectedLessonSlug(lesson.slug);
                  router.push(pathname + "?" + createQueryString(LESSON_KEY, lesson.slug));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedLessonSlug(lesson.slug);
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
                    <span className="text-sm font-semibold">{lesson.id}</span>
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
          <Button size="lg" asChild>
            <a href={watchLink} target="_blank" rel="noopener noreferrer">
              {t("school.ctaSection.watchOnYouTube")}
            </a>
          </Button>
          <Button variant="outline" size="lg" className="border-primary/40" asChild>
            <a href="/glory-share">{t("school.ctaSection.supportMinistry")}</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
