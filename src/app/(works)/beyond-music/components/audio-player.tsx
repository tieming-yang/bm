"use client";

import Song, { type Song as SongType } from "@/models/song";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  Music,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  Share2Icon,
  ShuffleIcon,
} from "lucide-react";
import Loading from "@/app/loading";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sendGAEvent } from "@next/third-parties/google";
import useTranslation from "@/hooks/use-translation";
import { useReducedMotion } from "framer-motion";
import { ContentState } from "@/components/ui/content-state";
import { playbackSearch, readPlaybackSettings, resolvePlaybackStep } from "@/lib/music/playback";
import { usePlaybackQueue } from "./playback-queue";

type AudioPlayerProps = {
  song: SongType;
};
export type PlayerStatue = "loading" | "play" | "pause";

const ICON_SIZE = 35;

function idFor(sec: number) {
  return `line-${Math.max(0, Math.floor(sec))}`;
}


async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error("Failed to copy text");
  }
}

export default function AudioPlayer(props: AudioPlayerProps) {
  const { song } = props;
  const { t } = useTranslation("beyond-music");
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const settings = readPlaybackSettings(searchParams);
  const loopMode = settings.repeat;
  const isShuffled = settings.shuffled;
  const queue = usePlaybackQueue();
  const [settingsPending, startSettingsTransition] = useTransition();

  const {
    data: songs,
    isLoading: isSongsLoading,
  } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLUListElement>(null);
  const isProgrammaticScroll = useRef(false);
  const followTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const playbackRequest = useRef(0);
  const activeAttempt = useRef(0);

  const [playerStatus, setPlayerStatus] = useState<PlayerStatue>("loading");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [audioAttempt, setAudioAttempt] = useState(0);
  const [followingLyrics, setFollowingLyrics] = useState(true);

  const isLoading = playerStatus === "loading" || isSongsLoading;
  const formattedTimestamp = Song.formatTimestamp(currentTimestamp);
  const formattedDuration = Song.formatTimestamp(duration);
  const progress = duration ? (currentTimestamp / duration) * 100 : 0;
  const lyrics = useMemo(() => Song.formatLyrics(song.lyrics), [song.lyrics]);
  const catalogueIds = useMemo(() => songs?.map((item) => item.id) ?? [], [songs]);
  const catalogKey = JSON.stringify(catalogueIds);
  const queueReady = queue.catalogKey === catalogKey && queue.shuffled === isShuffled;
  const queueIds = queueReady ? queue.ids : [];
  const previous = resolvePlaybackStep(queueIds, song.id, "previous", loopMode);
  const next = resolvePlaybackStep(queueIds, song.id, "next", loopMode);

  useEffect(() => {
    if (catalogueIds.length) queue.register(catalogueIds, song.id, isShuffled);
  }, [catalogueIds, song.id, isShuffled, queue.register]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      playbackRequest.current += 1;
      if (followTimer.current) clearTimeout(followTimer.current);
      isProgrammaticScroll.current = false;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    return () => { audio?.pause(); };
  }, [audioAttempt]);

  const isCurrentAttempt = () => mounted.current && audioAttempt === activeAttempt.current;
  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio || !isCurrentAttempt()) return;
    const request = ++playbackRequest.current;
    try {
      await audio.play();
    } catch (error) {
      if (!isCurrentAttempt() || request !== playbackRequest.current) return;
      console.error("Audio playback failed", error);
      toast.error(t("beyondMusic.player.playFailed"));
      setPlayerStatus("pause");
    }
  };
  const navigate = (direction: "previous" | "next" | "ended") => {
    if (!isCurrentAttempt() || settingsPending || !queueReady) return;
    const step = resolvePlaybackStep(queueIds, song.id, direction, loopMode);
    if (step.kind === "stop") {
      if (direction === "ended") setPlayerStatus("pause");
      return;
    }
    if (step.kind === "restart") {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      setCurrentTimestamp(0);
      void playAudio();
      return;
    }
    const destination = songs?.find((item) => item.id === step.songId);
    if (!destination) return;
    router.push(`/beyond-music/${encodeURIComponent(destination.title)}?${playbackSearch(searchParams, settings)}`);
  };
  const updateSettings = (nextSettings: typeof settings) => {
    startSettingsTransition(() => router.replace(`${pathname}?${playbackSearch(searchParams, nextSettings)}`, { scroll: false }));
  };

  const activeLineIndex = useMemo(() => {
    if (!song) return -1;

    for (let i = 0; i < lyrics.length; i++) {
      const here = lyrics[i].timestamp ?? 0;
      const next = lyrics[i + 1]?.timestamp ?? Number.POSITIVE_INFINITY;

      if (currentTimestamp >= here && currentTimestamp < next) return i;
    }
    return -1;
  }, [lyrics, currentTimestamp]);

  useEffect(() => {
    const stopFollowing = () => {
      isProgrammaticScroll.current = false;
      setFollowingLyrics(false);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button, [role='slider']")) return;
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) stopFollowing();
    };
    const onScroll = () => { if (!isProgrammaticScroll.current) setFollowingLyrics(false); };
    window.addEventListener("wheel", stopFollowing, { passive: true });
    window.addEventListener("touchmove", stopFollowing, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", stopFollowing);
      window.removeEventListener("touchmove", stopFollowing);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!followingLyrics || activeLineIndex < 0 || !lyricsContainerRef.current) return;
    const sec = lyrics[activeLineIndex].timestamp ?? 0;
    const el = document.getElementById(idFor(sec));
    if (!el) return;
    isProgrammaticScroll.current = true;
    el.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    if (followTimer.current) clearTimeout(followTimer.current);
    followTimer.current = setTimeout(() => { isProgrammaticScroll.current = false; }, reducedMotion ? 0 : 800);
  }, [song.id, lyrics, activeLineIndex, reducedMotion, followingLyrics]);

  const handleShareCurrentUrl = async () => {
    try {
      await copyTextToClipboard(window.location.href);
      toast.success(t("beyondMusic.player.shareCopied.title"), {});
    } catch {
      toast.error(t("beyondMusic.player.shareFailed.title"), {});
    }
  };

  return (
    <div className="relative flex flex-col w-full pt-20 pb-50 bg-linear-to-br from-primary/20 via-background to-secondary/20 items-center-safe">
      <audio
        key={audioAttempt}
        autoPlay
        ref={audioRef}
        src={song.fileUrl}
        loop={loopMode === "single"}
        onLoadedMetadata={() => {
          if (!audioRef.current || !isCurrentAttempt()) return;
          setPlayerStatus(audioRef.current.paused ? "pause" : "play");
          setDuration(audioRef.current.duration);
        }}
        onPlay={() => { if (isCurrentAttempt()) setPlayerStatus("play"); }}
        onPause={() => { if (isCurrentAttempt()) { playbackRequest.current += 1; setPlayerStatus("pause"); } }}
        onError={() => {
          if (!isCurrentAttempt()) return;
          setAudioError(true);
          setPlayerStatus("pause");
        }}
        onTimeUpdate={() => {
          if (!audioRef.current || !isCurrentAttempt()) return;
          setCurrentTimestamp(audioRef.current.currentTime);
        }}
        onEnded={() => {
          if (!isCurrentAttempt()) return;
          if (loopMode === "single") sendGAEvent("event", "listening", { value: song.title });
          navigate("ended");
        }}
      ></audio>

      {audioError && (
        <ContentState kind="error" title={t("beyondMusic.player.audioError")} onRetry={() => {
          playbackRequest.current += 1;
          activeAttempt.current += 1;
          audioRef.current?.pause();
          setAudioError(false);
          setCurrentTimestamp(0);
          setDuration(0);
          setPlayerStatus("loading");
          setAudioAttempt(activeAttempt.current);
        }} />
      )}
      <ul
        ref={lyricsContainerRef}
        className="flex w-full max-w-3xl flex-col px-4 text-xl text-muted-foreground gap-y-3"
      >
        {lyrics.map((lyric, index) => {
          const { timestamp, text } = lyric;
          const isHighlight = index === activeLineIndex;

          return (
            <li key={timestamp} id={idFor(timestamp)}>
              <button
                type="button"
                className={`min-h-11 rounded-xl px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isHighlight ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label={text === "intro" ? t("beyondMusic.player.seekTo", { time: Song.formatTimestamp(timestamp) }) : `${text} — ${t("beyondMusic.player.seekTo", { time: Song.formatTimestamp(timestamp) })}`}
                onClick={() => {
                  if (!audioRef.current) return;
                  audioRef.current.currentTime = timestamp;
                  void playAudio();
                }}
              >
                {text === "intro" ? <Music className="size-7" aria-hidden="true" /> : text}
              </button>
            </li>
          );
        })}
      </ul>

      <div id="controls" className="fixed inset-x-0 z-50 bottom-20">
        <div className="flex flex-col max-w-3xl px-3 mx-auto gap-y-3 sm:px-13">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" aria-pressed={followingLyrics} onClick={() => setFollowingLyrics((value) => !value)}>{followingLyrics ? t("beyondMusic.player.followingLyrics") : t("beyondMusic.player.resumeLyrics")}</Button>
            <Button
              className="text-white rounded-full gap-2 border-white/20 bg-black/30 backdrop-blur-md hover:bg-black/45"
              aria-label={t("beyondMusic.player.shareUrl")}
              disabled={settingsPending}
              onClick={handleShareCurrentUrl}
              type="button"
              variant="outline"
              size="icon"
            >
              <Share2Icon className="size-4" />
            </Button>
          </div>

          <Input
            className={[
              "appearance-none bg-gray-300 rounded-full h-1 p-0",
              "[accent-[#e11d48]]",
              "[&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
            ].join(" ")}
            style={{
              background: `linear-gradient(to right, #f1d7a4 0%, #f1d7a4 ${progress}%, #d1d5db ${progress}%, #d1d5db 100%)`,
            }}
            type="range"
            aria-label={t("beyondMusic.player.position")}
            aria-valuetext={`${formattedTimestamp} / ${formattedDuration}`}
            disabled={isLoading || audioError}
            min={0}
            max={duration ?? 0}
            step={1}
            value={currentTimestamp ?? 0}
            onChange={(e) => {
              if (!audioRef.current) return;

              const seekTo = parseInt(e.target.value, 10);
              audioRef.current.currentTime = seekTo;
              setCurrentTimestamp(seekTo);
            }}
          ></Input>

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>{formattedTimestamp}</span>
            <span>{formattedDuration}</span>
          </div>
        </div>

        <div className={`flex w-fit mx-auto gap-x-3 sm:gap-x-10 items-center justify-center h-16`}>
          {/* Left Control */}
          <div className="flex gap-x-3 sm:gap-x-5">
            {/* <Button
              variant={"default"}
              className="invisible border-none rounded-full size-10 cursor-none"
              aria-hidden
              onClick={() => router.push("/beyond-music")}
            >
              <ArrowLeft />
            </Button> */}

            <Button
              variant={"default"}
              className={`${!isShuffled && "bg-primary/50"} size-11 border-none rounded-full`}
              aria-label={t("beyondMusic.player.shuffle")}
              aria-pressed={isShuffled}
              disabled={settingsPending}
              aria-busy={settingsPending}
              onClick={() => updateSettings({ ...settings, shuffled: !isShuffled })}
            >
              {isShuffled ? <ShuffleIcon /> : <ShuffleIcon className="opacity-50" />}
            </Button>
          </div>

          {/* Central Control */}
          <div className="flex items-center justify-center gap-x-3 sm:gap-x-7">
            <Button
              variant={"default"}
              className="border-none rounded-full size-11"
              aria-label={t("beyondMusic.player.previous")}
              disabled={settingsPending || previous.kind !== "navigate"}
              onClick={() => navigate("previous")}
            >
              <ChevronFirstIcon />
            </Button>
            <Button
              variant={"default"}
              className="relative border-none rounded-full size-15"
              aria-label={playerStatus === "play" ? t("beyondMusic.player.pause") : t("beyondMusic.player.play")}
              disabled={isLoading || audioError}
              onClick={() => {
                if (!audioRef.current || playerStatus === "loading") {
                  toast.warning(t("beyondMusic.player.loading"));
                  return;
                }

                if (playerStatus === "pause") {
                  void playAudio();
                } else if (playerStatus === "play") {
                  playbackRequest.current += 1;
                  audioRef.current.pause();
                  setPlayerStatus("pause");
                }
              }}
            >
              {isLoading && <Loading isInlined />}
              {playerStatus === "pause" ? (
                <PlayIcon size={ICON_SIZE} />
              ) : (
                <PauseIcon size={ICON_SIZE} />
              )}
            </Button>
            <Button
              variant={"default"}
              className="border-none rounded-full size-11"
              aria-label={t("beyondMusic.player.next")}
              disabled={settingsPending || next.kind !== "navigate"}
              onClick={() => navigate("next")}
            >
              <ChevronLastIcon />
            </Button>
          </div>

          {/* Right Control */}
          <div className="flex gap-x-3">
            <Button
              variant={"default"}
              className={`${
                loopMode === "none" && "bg-primary/50"
              } size-11 border-none rounded-full`}
              aria-label={t(`beyondMusic.player.repeat.${loopMode}`)}
              aria-pressed={loopMode !== "none"}
              disabled={settingsPending}
              aria-busy={settingsPending}
              onClick={() => updateSettings({ ...settings, repeat: loopMode === "none" ? "single" : loopMode === "single" ? "all" : "none" })}
            >
              {loopMode === "none" ? (
                <RepeatIcon className="opacity-50" />
              ) : loopMode === "single" ? (
                <Repeat1Icon />
              ) : (
                <RepeatIcon />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
