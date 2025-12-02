"use client";

import Song, { type Song as SongType } from "@/models/song";
import { AudioHTMLAttributes, DetailedHTMLProps, useEffect, useRef, useState } from "react";
import { Button, topGlowBorder } from "@/components/ui/button";
import { PauseIcon, PlayIcon } from "lucide-react";
import Loading from "@/app/loading";
import { toast } from "sonner";

type AudioPlayerProps = {
  song: SongType;
};

const ICON_SIZE = 35;

export default function AudioPlayer(props: AudioPlayerProps) {
  const { song } = props;

  const audioRef = useRef<HTMLAudioElement>(null);

  type PlayerStatue = "loading" | "play" | "pause";
  const [playerStatus, setPlayerStatus] = useState<PlayerStatue>("loading");
  console.log({ playerStatus });
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  console.log({ currentTimestamp });
  console.log(Song.formatTimestamp(currentTimestamp));
  const [duration, setDuration] = useState(0);

  const isLoading = playerStatus === "loading";
  const formattedTimestamp = Song.formatTimestamp(currentTimestamp);
  const formattedDuration = Song.formatTimestamp(duration);

  return (
    <div className="relative w-full">
      {isLoading && <Loading isInlined />}
      <audio
        ref={audioRef}
        src={song.fileUrl}
        onLoadedMetadata={() => {
          if (!audioRef.current) return;
          setPlayerStatus("play");
          setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTimestamp(audioRef.current.currentTime);
        }}
        autoPlay
      ></audio>

      <div id="controls" className="fixed bottom-20 inset-x-0 px-3">
        <div className={`flex w-fit mx-auto items-center justify-center h-16 px-12`}>
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
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>{formattedTimestamp}</span>
          <span>{formattedDuration}</span>
        </div>
      </div>
    </div>
  );
}
