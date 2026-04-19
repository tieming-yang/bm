"use client";

import Song, { type Song as SongType } from "@/models/song";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
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
import { useRouter, useSearchParams } from "next/navigation";
import { is } from "@react-three/fiber/dist/declarations/src/core/utils";
import { sendGAEvent } from "@next/third-parties/google";
import useTranslation from "@/hooks/use-translation";

type AudioPlayerProps = {
  song: SongType;
};
export type PlayerStatue = "loading" | "play" | "pause";
type LoopMode = "none" | "single" | "all";

const ICON_SIZE = 35;

function idFor(sec: number) {
  return `line-${Math.max(0, Math.floor(sec))}`;
}

function validateLoopMode(maybeLoopMode: string | null): maybeLoopMode is LoopMode {
  return maybeLoopMode === "none" || maybeLoopMode === "single" || maybeLoopMode === "all";
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
  const searchParams = useSearchParams();
  const maybeSelectedLoopMode = searchParams.get("lm");
  const maybeIsShuffled = searchParams.get("s");

  const {
    data: songs,
    isLoading: isSongsLoading,
    error,
  } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLUListElement>(null);
  const isProgrammaticScroll = useRef(false);

  const [playerStatus, setPlayerStatus] = useState<PlayerStatue>("loading");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopMode, setLoopMode] = useState<LoopMode>(() =>
    validateLoopMode(maybeSelectedLoopMode) ? maybeSelectedLoopMode : "none"
  );
  const [isShuffled, setIsShuffled] = useState(() => maybeIsShuffled === "true");

  const isLoading = playerStatus === "loading" || isSongsLoading;

  const formattedTimestamp = Song.formatTimestamp(currentTimestamp);
  const formattedDuration = Song.formatTimestamp(duration);

  const progress = duration ? (currentTimestamp / duration) * 100 : 0;

  const lyrics = Song.formatLyrics(song.lyrics);
  const currentSongIndex = songs && songs.findIndex((_song) => _song.title === song.title);
  const shuffledSongs = songs && isShuffled ? Song.toShuffled(songs) : songs;
  const nextSong =
    shuffledSongs?.length && currentSongIndex != null
      ? shuffledSongs[(currentSongIndex + 1) % shuffledSongs.length]
      : null;
  const prevSong =
    shuffledSongs?.length && currentSongIndex != null
      ? shuffledSongs[(currentSongIndex - 1 + shuffledSongs.length) % shuffledSongs.length]
      : null;

  const activeLineIndex = useMemo(() => {
    if (!song) return -1;

    for (let i = 0; i < lyrics.length; i++) {
      const here = lyrics[i].timestamp ?? 0;
      const next = lyrics[i + 1]?.timestamp ?? Number.POSITIVE_INFINITY;

      if (currentTimestamp >= here && currentTimestamp < next) return i;
    }
    return -1;
  }, [song, currentTimestamp]);

  useEffect(() => {
    if (!song || activeLineIndex < 0 || !lyricsContainerRef.current) return;

    const sec = lyrics[activeLineIndex].timestamp ?? 0;
    const el = document.getElementById(idFor(sec)) as HTMLLIElement | null;
    if (el) {
      isProgrammaticScroll.current = true;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => (isProgrammaticScroll.current = false), 800);
    }
  }, [song, activeLineIndex]);

  const handleShareCurrentUrl = async () => {
    try {
      await copyTextToClipboard(window.location.href);
      toast.success(t("beyondMusic.player.shareCopied.title"), {});
    } catch {
      toast.error(t("beyondMusic.player.shareFailed.title"), {});
    }
  };

  const playerSettings = `?lm=${loopMode}&s=${isShuffled}`;

  return (
    <div className="relative flex flex-col w-full pt-20 pb-50 bg-linear-to-br from-primary/20 via-background to-secondary/20 items-center-safe">
      <audio
        autoPlay
        ref={audioRef}
        src={song.fileUrl}
        loop={loopMode === "single"}
        onLoadedMetadata={() => {
          if (!audioRef.current) return;
          setPlayerStatus("play");
          setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTimestamp(audioRef.current.currentTime);
        }}
        onEnded={() => {
          if (!audioRef.current) return;
          if (loopMode === "single") {
            sendGAEvent("event", "listening", { value: song.title });
            return;
          }
          if (!nextSong) return;

          router.push(`/beyond-music/${encodeURIComponent(nextSong.title)}${playerSettings}`);
        }}
      ></audio>

      <ul
        ref={lyricsContainerRef}
        className="flex flex-col font-serif text-xl text-gray-400 gap-y-3"
      >
        {lyrics.map((lyric, index) => {
          const { timestamp, text } = lyric;
          const isHighlight = index === activeLineIndex;

          return text === "intro" ? (
            <Music
              key={timestamp}
              id={idFor(timestamp)}
              onClick={() => {
                if (!audioRef.current) return;

                audioRef.current.currentTime = timestamp;
                audioRef.current.play();
                setPlayerStatus("play");
              }}
              className={`transition-all duration-300 size-7 ${
                isHighlight ? "text-white animate-pulse" : "text-white/50"
              }`}
            />
          ) : (
            <li
              key={timestamp}
              id={idFor(timestamp)}
              className={`transition-all duration-500 ${
                isHighlight ? "text-primary-foreground-gradient font-bold" : "text-white/50"
              }`}
              onClick={() => {
                if (!audioRef.current) return;

                audioRef.current.currentTime = timestamp;
                audioRef.current.play();
                setPlayerStatus("play");
              }}
            >
              {text}
            </li>
          );
        })}
      </ul>

      <div id="controls" className="fixed inset-x-0 z-50 bottom-20">
        <div className="flex flex-col max-w-3xl px-3 mx-auto gap-y-3 sm:px-13">
          <div className="flex justify-end">
            <Button
              className="gap-2 rounded-full border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-black/45"
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
              className={`${!isShuffled && "bg-primary/50"} size-10 border-none rounded-full`}
              onClick={() => {
                setIsShuffled((prev) => !prev);
              }}
            >
              {isShuffled ? <ShuffleIcon /> : <ShuffleIcon className="text-white/40" />}
            </Button>
          </div>

          {/* Central Control */}
          <div className="flex items-center justify-center gap-x-3 sm:gap-x-7">
            <Button
              variant={"default"}
              className="border-none rounded-full size-10"
              onClick={() => {
                if (!prevSong) return;
                router.push(`/beyond-music/${encodeURIComponent(prevSong.title)}${playerSettings}`);
              }}
            >
              <ChevronFirstIcon />
            </Button>
            <Button
              variant={"default"}
              className="relative border-none rounded-full size-15"
              onClick={() => {
                if (!audioRef.current || playerStatus === "loading") {
                  toast.warning("Loading");
                  return;
                }

                if (playerStatus === "pause") {
                  audioRef.current.play();
                  setPlayerStatus("play");
                } else if (playerStatus === "play") {
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
              className="border-none rounded-full size-10"
              onClick={() => {
                if (!nextSong) return;
                router.push(`/beyond-music/${encodeURIComponent(nextSong.title)}${playerSettings}`);
              }}
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
              } size-10 border-none rounded-full`}
              onClick={() => {
                if (loopMode === "none") {
                  setLoopMode("single");
                } else if (loopMode === "single") {
                  setLoopMode("all");
                } else {
                  setLoopMode("none");
                }
              }}
            >
              {loopMode === "none" ? (
                <RepeatIcon className="text-white/40" />
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
