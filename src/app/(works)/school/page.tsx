"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useTranslation from "@/hooks/use-translation";

type Lesson = {
  number: string;
  title: string;
  theme: string;
  summary: string;
  videoId: string;
};

const buildYouTubeLink = (videoId: string) => `https://youtu.be/${videoId}`;

export default function SchoolPage() {
  const { t } = useTranslation("school");
  const [selectedLesson, setSelectedLesson] = useState(0);
  const lessons = (t("school.lessons", { returnObjects: true }) as Lesson[]) ?? [];
  const safeIndex = lessons.length > 0 ? Math.min(selectedLesson, lessons.length - 1) : 0;
  const activeLesson = lessons[safeIndex];

  if (!activeLesson) {
    return null;
  }

  const embedSrc = useMemo(
    () => `https://www.youtube.com/embed/${activeLesson.videoId}`,
    [activeLesson.videoId]
  );
  const watchLink = useMemo(() => buildYouTubeLink(activeLesson.videoId), [activeLesson.videoId]);

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
              title={t("school.playerTitle", { title: activeLesson.title })}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.5em] text-primary/70">
            {t("school.featuredSection.eyebrow")}
          </p>
          <h2 className="text-3xl font-semibold text-balance">
            {t("school.featuredSection.title")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, index) => {
            const isActive = selectedLesson === index;
            const handleSelect = () => setSelectedLesson(index);
            return (
              <Card
                key={lesson.videoId}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={handleSelect}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect();
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
                    <span className="text-sm font-semibold">{lesson.number}</span>
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
        <div className="flex flex-wrap justify-center mt-6 gap-4">
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
