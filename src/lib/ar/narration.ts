export type NarrationStatus = "loading" | "playing" | "paused" | "stopped" | "blocked" | "failed" | "ended";

/** Bind narration controls to one media element and ignore abandoned playback requests. */
export function bindNarration(audio: HTMLAudioElement, onStatus: (status: NarrationStatus) => void, autoplay: boolean) {
  let active = true;
  let request = 0;
  let wantsPlayback = autoplay;
  let status: NarrationStatus = "paused";
  const publish = (next: NarrationStatus) => {
    if (!active) return;
    status = next;
    onStatus(next);
  };
  const play = async () => {
    wantsPlayback = true;
    const token = ++request;
    if (status === "failed") audio.load();
    publish("loading");
    try {
      await audio.play();
    } catch (error) {
      if (!active || token !== request) return;
      publish(error instanceof Error && error.name === "NotAllowedError" ? "blocked" : "failed");
    }
  };
  const pause = () => {
    wantsPlayback = false;
    request++;
    audio.pause();
    publish("paused");
  };
  const stop = () => {
    wantsPlayback = false;
    request++;
    audio.pause();
    audio.currentTime = 0;
    publish("stopped");
  };
  const playing = () => { if (wantsPlayback) publish("playing"); else audio.pause(); };
  const paused = () => { if (status !== "stopped" && status !== "ended" && status !== "failed" && status !== "blocked") publish("paused"); };
  const ended = () => { request++; publish("ended"); };
  const failed = () => { request++; publish("failed"); };
  audio.addEventListener("playing", playing);
  audio.addEventListener("pause", paused);
  audio.addEventListener("ended", ended);
  audio.addEventListener("error", failed);
  if (autoplay) void play(); else publish("paused");

  return {
    play,
    pause,
    stop,
    dispose: () => {
      active = false;
      request++;
      audio.removeEventListener("playing", playing);
      audio.removeEventListener("pause", paused);
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("error", failed);
      audio.pause();
    },
  };
}
