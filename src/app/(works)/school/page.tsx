"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Lesson = {
  number: string;
  title: string;
  theme: string;
  summary: string;
  videoId: string;
};

const lessons: Lesson[] = [
  {
    number: "01",
    title: "魚",
    theme: "學堂精選",
    summary: "點擊播放，開始今天的聖經學堂。",
    videoId: "B6e347CbetE",
  },
  {
    number: "02",
    title: "約伯記",
    theme: "學堂精選",
    summary: "跟著影片一起讀經，建立信仰根基。",
    videoId: "afCWlscA5Io",
  },
  {
    number: "03",
    title: "諾亞方舟",
    theme: "學堂精選",
    summary: "邀請家人朋友共學，讓真理成為日常。",
    videoId: "fdj-FbA2ykQ",
  },
];

const buildYouTubeLink = (videoId: string) => `https://youtu.be/${videoId}`;

export default function SchoolPage() {
  const [selectedLesson, setSelectedLesson] = useState(0);
  const safeIndex = Math.min(selectedLesson, lessons.length - 1);
  const activeLesson = lessons[safeIndex];

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
            聖經學堂
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
            聖經學堂
          </h1>
          <p className="text-md md:text-2xl italic font-chinese text-primary-foreground-gradient">
            用聖經故事與真理裝備每一天。
          </p>
          <p className="text-lg text-muted-foreground">
            精選三支影片，適合個人靈修、小組共學或家庭同行。點選下方卡片即可切換 播放。
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="px-8 rounded-full" asChild>
              <a href={watchLink} target="_blank" rel="noopener noreferrer">
                前往 YouTube 觀看
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 rounded-full border-primary/40"
              asChild
            >
              <a href="/glory-share">加入榮耀份額</a>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden border shadow-xl rounded-3xl border-primary/20 bg-background/80 shadow-primary/20">
          <div className="w-full aspect-video">
            <iframe
              className="w-full h-full"
              src={embedSrc}
              title={`聖經學堂 - ${activeLesson.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.5em] text-primary/70">學堂精選</p>
          <h2 className="text-3xl font-semibold text-balance">三段影片帶你穩穩打底</h2>
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
        <h3 className="text-2xl font-semibold">把聖經學堂分享給身邊的人</h3>
        <p className="max-w-3xl mx-auto mt-3 text-muted-foreground">
          邀請家人、孩子或小組一起看，讓經文成為日常的指引與力量。
        </p>
        <div className="flex flex-wrap justify-center mt-6 gap-4">
          <Button size="lg" asChild>
            <a href={watchLink} target="_blank" rel="noopener noreferrer">
              在 YouTube 觀看
            </a>
          </Button>
          <Button variant="outline" size="lg" className="border-primary/40" asChild>
            <a href="/glory-share">支持事工</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
