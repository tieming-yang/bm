"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useTranslation from "@/hooks/use-translation";

type Episode = {
  number: string;
  title: string;
  theme: string;
  summary: string;
  matchKey?: string;
};

type PlaylistVideo = {
  index: number;
  videoId: string;
  title: string;
  duration: string | null;
  thumbnail: string | null;
};

type YouTubePlaylistResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      position?: number;
      resourceId?: { videoId?: string };
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: {
      videoId?: string;
    };
  }>;
};

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractMatchableTitle = (rawTitle: string | undefined) => {
  if (!rawTitle) return "";
  const [segment] = rawTitle.split("|");
  return normalizeTitle(segment || rawTitle);
};

export default function DailyGraceSnacksPage() {
  const { t } = useTranslation("daily-grace-snacks");
  const playlistId = t("dailyGraceSnacks.playlistId");
  const playlistLink = t("dailyGraceSnacks.playlistLink");
  const episodes =
    (t("dailyGraceSnacks.season1.episodes", { returnObjects: true }) as Episode[]) ?? [];
  const season2Highlights =
    (t("dailyGraceSnacks.season2.highlights", { returnObjects: true }) as string[]) ?? [];
  const statusLoading = t("dailyGraceSnacks.status.loading");
  const statusError = t("dailyGraceSnacks.status.error");
  const fallbackApiKey = "AIzaSyAqGOf6G7Br3H0ZUDMcnTXpQIO48LKIIKI";
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? fallbackApiKey;
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const {
    data: playlistVideos = [],
    isLoading: isLoadingVideos,
    isError: isPlaylistError,
  } = useQuery<PlaylistVideo[]>({
    queryKey: ["daily-grace-snacks-playlist", playlistId, apiKey],
    queryFn: async () => {
      if (!apiKey) {
        throw new Error("Missing YouTube API key");
      }
      const params = new URLSearchParams({
        part: "snippet,contentDetails",
        maxResults: "50",
        playlistId,
        key: apiKey,
      });
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to load playlist");
      }
      const data = (await response.json()) as YouTubePlaylistResponse;
      const items =
        data.items
          ?.map((item, index) => {
            const snippet = item.snippet ?? {};
            const resource = snippet.resourceId ?? {};
            const videoId = resource.videoId ?? item.contentDetails?.videoId;
            if (!videoId) return null;
            return {
              index:
                typeof snippet.position === "number" && snippet.position >= 0
                  ? snippet.position
                  : index,
              videoId,
              title: snippet.title ?? `Episode ${index + 1}`,
              duration: null,
              thumbnail: snippet.thumbnails?.default?.url ?? null,
            };
          })
          .filter((video): video is PlaylistVideo => Boolean(video))
          .sort((a, b) => a.index - b.index) ?? [];
      return items;
    },
  });
  const fetchError = isPlaylistError ? statusError : null;

  const episodeVideoMap = useMemo(() => {
    if (!playlistVideos.length) return {} as Record<number, PlaylistVideo>;
    const matchTargets = episodes.map((episode) =>
      extractMatchableTitle(episode.matchKey ?? episode.title)
    );
    const matches: Record<number, PlaylistVideo> = {};
    playlistVideos.forEach((video) => {
      const normalizedVideoTitle = extractMatchableTitle(video.title);

      if (
        !normalizedVideoTitle ||
        normalizedVideoTitle === "private video" ||
        normalizedVideoTitle === "deleted video"
      )
        return;

      const matchIndex = matchTargets.findIndex((target) => {
        if (!target) return false;
        return normalizedVideoTitle.includes(target) || target.includes(normalizedVideoTitle);
      });
      if (matchIndex !== -1 && !matches[matchIndex]) {
        matches[matchIndex] = video;
      }
    });
    return matches;
  }, [episodes, playlistVideos]);

  useEffect(() => {
    if (!Object.keys(episodeVideoMap).length) return;
    if (episodeVideoMap[selectedEpisode]) return;
    const firstPlayableIndex = episodes.findIndex((_, index) => episodeVideoMap[index]);
    if (firstPlayableIndex !== -1) {
      setSelectedEpisode(firstPlayableIndex);
    }
  }, [episodeVideoMap, episodes, selectedEpisode]);

  const fallbackVideoId = playlistVideos.find((video) => video.videoId)?.videoId ?? null;
  const activeVideoId = episodeVideoMap[selectedEpisode]?.videoId ?? fallbackVideoId ?? null;

  const embedSrc = useMemo(() => {
    if (activeVideoId) {
      return `https://www.youtube.com/embed/${activeVideoId}?list=${playlistId}`;
    }
    return `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
  }, [activeVideoId, playlistId]);

  return (
    <div className="container relative z-50 mx-auto space-y-16 px-4 py-16">
      <section className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm uppercase tracking-[0.2em] text-primary">
            {t("dailyGraceSnacks.badge")}
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            {t("dailyGraceSnacks.hero.title")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("dailyGraceSnacks.hero.description")}</p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="rounded-full px-8" asChild>
              <a href={playlistLink} target="_blank" rel="noopener noreferrer">
                {t("dailyGraceSnacks.hero.watchNow")}
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-primary/40 px-8"
              asChild
            >
              <a href="/glory-share">{t("dailyGraceSnacks.hero.supportLink")}</a>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-background/80 shadow-xl shadow-primary/20">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src={embedSrc}
              title="Daily Grace Snacks Playlist"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.5em] text-primary/70">
            {t("dailyGraceSnacks.season1.title")}
          </p>
          <h2 className="text-3xl font-semibold text-balance">
            {t("dailyGraceSnacks.season1.description")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {episodes.map((episode, index) => {
            const videoData = episodeVideoMap[index];
            const isActive = selectedEpisode === index;
            const isPlayable = Boolean(videoData?.title);
            const handleSelect = () => {
              if (isPlayable) {
                setSelectedEpisode(index);
              }
            };
            return (
              <Card
                key={episode.number}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-disabled={!isPlayable}
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
                } ${isPlayable ? "" : "opacity-60"}`}
              >
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-primary">
                    <span className="text-sm font-semibold">{episode.number}</span>
                    <span className="text-sm uppercase tracking-[0.4em] text-primary/70">
                      {episode.theme}
                    </span>
                    {videoData?.duration && (
                      <span className="text-xs text-primary/60">{videoData.duration}</span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{episode.title}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {episode.summary}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
        {isLoadingVideos && (
          <p className="text-center text-sm text-muted-foreground">{statusLoading}</p>
        )}
        {fetchError && !isLoadingVideos && (
          <p className="text-center text-sm text-muted-foreground">{fetchError}</p>
        )}
      </section>

      <section className="rounded-3xl border border-primary/15 bg-linear-to-r from-background/90 via-primary/5 to-background/70 p-8 shadow-xl shadow-primary/10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.5em] text-primary/70">
              {t("dailyGraceSnacks.season2.title")}
            </p>
            <h3 className="text-2xl font-semibold">{t("dailyGraceSnacks.season2.description")}</h3>
            <ul className="space-y-3 text-muted-foreground">
              {season2Highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-primary/20 bg-background/90 text-center shadow-lg shadow-primary/20">
            <CardHeader>
              <CardTitle className="text-3xl text-primary">
                {t("dailyGraceSnacks.season2.comingSoon")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>{t("dailyGraceSnacks.ctaSection.description")}</p>
              <div className="flex flex-col gap-3 md:flex-row md:justify-center">
                <Button variant="secondary" asChild>
                  <a href={playlistLink} target="_blank" rel="noopener noreferrer">
                    {t("dailyGraceSnacks.ctaSection.visitYouTube")}
                  </a>
                </Button>
                <Button asChild>
                  <a href="/glory-share">{t("dailyGraceSnacks.ctaSection.joinGloryShare")}</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-3xl border border-primary/10 bg-background/80 p-8 text-center shadow-lg shadow-primary/5">
        <h3 className="text-2xl font-semibold">{t("dailyGraceSnacks.ctaSection.title")}</h3>
        <p className="mt-3 max-w-3xl mx-auto text-muted-foreground">
          {t("dailyGraceSnacks.ctaSection.description")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <a href={playlistLink} target="_blank" rel="noopener noreferrer">
              {t("dailyGraceSnacks.ctaSection.visitYouTube")}
            </a>
          </Button>
          <Button variant="outline" size="lg" className="border-primary/40" asChild>
            <a href="/glory-share">{t("dailyGraceSnacks.ctaSection.joinGloryShare")}</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
