"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useTranslation from "@/hooks/use-translation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import ReactPlayer from "react-player";
import { Lesson, Curriculum, getCourses, Course } from "@/models/school";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
const COURSE_KEY = "course";
const DEFAULT_SLUG = "fish";

export default function SchoolPage() {
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = searchParams.get(LESSON_KEY);
  const courseParam = searchParams.get(COURSE_KEY);
  console.debug("🔎", { courseParam });
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [viewStatus, setViewStatus] = useState<"none" | "videoModal" | "loading">("loading");

  const courses = getCourses();
  const [course, setCourse] = useState<Course>(Course.Genesis);

  const playerRef = useRef(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const { t, i18n } = useTranslation("school");
  const { t: tEn } = useTranslation("school", { lng: "en" });
  const curriculums = (t("school.curriculums", { returnObjects: true }) as Curriculum) ?? {};
  const enCurriculums = (tEn("school.curriculums", { returnObjects: true }) as Curriculum) ?? {};

  // Genesis
  const genesisLessons = curriculums.genesis.lessons ?? [];
  const enGenesisLessons = enCurriculums.genesis.lessons ?? [];
  const renderGenesisLessons = genesisLessons.map((lesson, index) => {
    return {
      ...lesson,
      slug: toSlug(enGenesisLessons[index].title),
    };
  });

  // Characters
  const charatersLessons = curriculums.characters.lessons ?? [];
  const enCharatersLessons = enCurriculums.characters.lessons ?? [];
  const renderCharactersLessons = charatersLessons.map((lesson, index) => {
    return {
      ...lesson,
      slug: toSlug(enCharatersLessons[index].title),
    };
  });

  const lessons = {
    [Course.Genesis]: renderGenesisLessons,
    [Course.Characters]: renderCharactersLessons,
  };

  const selectedLessons = lessons[course];

  // set default lesson
  useEffect(() => {
    let selected;
    switch (courseParam) {
      case Course.Characters:
        selected =
          renderCharactersLessons.find((lesson) => lesson.slug === slug) ??
          renderCharactersLessons[0];
        break;
      case Course.Genesis:
        selected =
          renderGenesisLessons.find((lesson) => lesson.slug === slug) ?? renderGenesisLessons[0];
        break;
      default:
        selected =
          renderGenesisLessons.find((lesson) => lesson.slug === slug) ?? renderGenesisLessons[0];
    }

    setSelectedLesson(selected);
  }, []);

  useEffect(() => {
    if (!courseParam) return;
    setCourse(courseParam as Course);
  }, []);

  useEffect(() => {
    if (!selectedLesson) return;

    const selectedEpisode = document.getElementById(selectedLesson.id);

    selectedEpisode?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [selectedLesson]);

  if (renderGenesisLessons.length === 0) {
    console.error(
      "❌",
      `renderLessons.length: ${renderGenesisLessons.length}, selectedLesson: ${selectedLesson}`
    );
    return null;
  }

  /** * @see https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams
   */
  const createQueryString = useCallback(
    (inputParams: [name: string, value: string][]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [name, value] of inputParams) {
        params.set(name, value);
      }

      return params.toString();
    },
    [searchParams]
  );

  const embedSrc = `https://www.youtube.com/embed/${selectedLesson?.videoId}`;
  const watchLink = buildYouTubeLink(selectedLesson?.videoId);

  return (
    <div className="relative w-full pb-16 space-y-7 no-scrollbar sm:py-16 py-0">
      <div
        ref={playerContainerRef}
        className="sticky top-0 left-0 right-0 pb-3 border shadow-xl lg:hidden space-y-5 w-dvw z-100 rounded-b-3xl backdrop-blur-xl border-primary/20 bg-background/10 shadow-primary/20"
      >
        {/* https://www.npmjs.com/package/react-player?activeTab=readme */}
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
            const currentIndex = selectedLessons.findIndex(
              (lesson) => lesson.id === selectedLesson.id
            );
            if (currentIndex === selectedLessons.length - 1) {
              nextIndex = 0;
            } else {
              nextIndex = currentIndex + 1;
            }

            setSelectedLesson(selectedLessons.at(nextIndex)!);
          }}
        />

        <div className="relative">
          <div className="flex flex-row mx-auto gap-x-5 max-w-32">
            <Button
              disabled={selectedLessons.length === 1}
              onClick={() => {
                if (!selectedLesson) return;
                const currentIndex = selectedLessons.findIndex(
                  (lesson) => lesson.id === selectedLesson.id
                );
                if (currentIndex === -1) return;
                const nextIndex =
                  (currentIndex - 1 + selectedLessons.length) % selectedLessons.length;

                setSelectedLesson(selectedLessons[nextIndex]);
              }}
              size="sm"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              disabled={selectedLessons.length === 1}
              onClick={() => {
                if (!selectedLesson) return;
                const currentIndex = selectedLessons.findIndex(
                  (lesson) => lesson.id === selectedLesson.id
                );
                if (currentIndex === -1) return;
                const nextIndex = (currentIndex + 1) % selectedLessons.length;

                setSelectedLesson(selectedLessons[nextIndex]);
              }}
              size="sm"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-5 gap-y-7">
        <section className="grid gap-10 lg:grid-cols-2">
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
              <Button size="lg" variant="secondary" className="px-8 rounded-full" asChild>
                <Link href="/school/summer/2026/registration">
                  {t("school.hero.registerSummerCamp")}
                </Link>
              </Button>
              <Button size="lg" className="px-8 rounded-full border-primary/40" asChild>
                <a href="/glory-share">{t("school.hero.joinGloryShare")}</a>
              </Button>
            </div>
          </div>
          <div className="hidden overflow-hidden border shadow-xl h-fit lg:block rounded-3xl border-primary/20 bg-background/10 shadow-primary/20">
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
          <Tabs
            defaultValue={courses[0]}
            className="w-full"
            value={course}
            onValueChange={(v) => {
              const nextCourse = v as Course;
              const nextLesson = lessons[nextCourse][0]?.slug ?? DEFAULT_SLUG;

              setCourse(nextCourse);
              setSelectedLesson(lessons[nextCourse][0] ?? null);

              router.replace(
                pathname +
                  "?" +
                  createQueryString([
                    [COURSE_KEY, nextCourse],
                    [LESSON_KEY, nextLesson],
                  ]),
                {
                  scroll: false,
                }
              );
            }}
          >
            <TabsList className="flex mx-auto w-fit">
              {courses.map((course) => {
                return (
                  <TabsTrigger value={course} key={course}>
                    {t(`school.curriculums.${course}.title`)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value={course}>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {lessons[course].map((lesson, index) => {
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
                        router.replace(
                          pathname +
                            "?" +
                            createQueryString([
                              [COURSE_KEY, course],
                              [LESSON_KEY, lesson.slug],
                            ]),
                          {
                            scroll: false,
                          }
                        );
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
                            {lesson.course}
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
            </TabsContent>
          </Tabs>
        </section>

        <section className="p-8 text-center border shadow-lg rounded-3xl border-primary/10 bg-background/80 shadow-primary/5">
          <h3 className="text-2xl font-semibold">{t("school.ctaSection.title")}</h3>
          <p className="max-w-3xl mx-auto mt-3 text-muted-foreground">
            {t("school.ctaSection.description")}
          </p>
          <div className="flex flex-wrap justify-center mt-6 gap-4">
            <Button size="lg" className="border-primary/40" asChild>
              <a href="/glory-share">{t("school.ctaSection.supportMinistry")}</a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
