"use client";

import Song, { type Song as SongType } from "@/models/song";
import {
  AudioHTMLAttributes,
  DetailedHTMLProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, topGlowBorder } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeft,
  ChevronRight,
  Music,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
} from "lucide-react";
import Loading from "@/app/loading";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import { useRouter, useSearchParams } from "next/navigation";

type AudioPlayerProps = {
  song: SongType;
};
type PlayerStatue = "loading" | "play" | "pause";
type LoopMode = "none" | "single" | "all";

const ICON_SIZE = 35;

function idFor(sec: number) {
  return `line-${Math.max(0, Math.floor(sec))}`;
}

function validateLoopMode(maybeLoopMode: string | null): maybeLoopMode is LoopMode {
  return maybeLoopMode === "none" || maybeLoopMode === "one" || maybeLoopMode === "all";
}

export default function AudioPlayer(props: AudioPlayerProps) {
  const { song } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const maybeSelectedLoopMode = searchParams.get("lm");

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

  const isLoading = playerStatus === "loading" || isSongsLoading;

  const formattedTimestamp = Song.formatTimestamp(currentTimestamp);
  const formattedDuration = Song.formatTimestamp(duration);

  const progress = duration ? (currentTimestamp / duration) * 100 : 0;

  const lyrics = Song.formatLyrics(song.lyrics);
  const currentSongIndex = songs && songs.findIndex((_song) => _song.title === song.title);
  const nextSong =
    songs?.length && currentSongIndex != null ? songs[(currentSongIndex + 1) % songs.length] : null;
  const prevSong =
    songs?.length && currentSongIndex != null
      ? songs[(currentSongIndex - 1 + songs.length) % songs.length]
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

  return (
    <div className="relative w-full pb-50 pt-20">
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
          if (loopMode === "single") return;

          if (loopMode === "all") {
            if (!nextSong) return;
            router.push(`/beyond-music/${encodeURIComponent(nextSong.title)}?lm=${loopMode}`);
          }
        }}
      ></audio>

      <ul
        ref={lyricsContainerRef}
        className="text-center font-serif text-xl flex flex-col gap-y-3 text-gray-400"
      >
        {lyrics.map((lyric, index) => {
          const { lineNumber, timestamp, text } = lyric;
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
              className={`transition-all mx-auto duration-300 size-7 ${
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

      <div id="controls" className="fixed bottom-20 inset-x-0 z-100">
        <div className="flex flex-col gap-y-3 px-13 max-w-3xl mx-auto">
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

          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
            <span>{formattedTimestamp}</span>
            <span>{formattedDuration}</span>
          </div>
        </div>

        <div className={`flex w-fit mx-auto gap-x-7 items-center justify-center h-16`}>
          <div className="flex gap-x-3">
            <Button
              variant={"default"}
              className="size-10 border-none rounded-full"
              onClick={() => router.push("/beyond-music")}
            >
              <ArrowLeft />
            </Button>
            <Button
              variant={"default"}
              className="size-10 border-none rounded-full"
              onClick={() => {
                if (!prevSong) return;
                router.push(`/beyond-music/${encodeURIComponent(prevSong.title)}`);
              }}
            >
              <ChevronFirstIcon />
            </Button>
          </div>

          <Button
            variant={"default"}
            className="size-15 border-none rounded-full"
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

          <div className="flex gap-x-3">
            <Button
              variant={"default"}
              className="size-10 border-none rounded-full"
              onClick={() => {
                if (!nextSong) return;
                router.push(`/beyond-music/${encodeURIComponent(nextSong.title)}`);
              }}
            >
              <ChevronLastIcon />
            </Button>

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
