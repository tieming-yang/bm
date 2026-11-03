"use client";

import { ComponentProps, useCallback, useRef } from "react";
import ReactPlayer from "react-player";

export default function SchoolVideoPlayer({ title, ...props }: ComponentProps<typeof ReactPlayer> & { title: string }) {
  const observerRef = useRef<MutationObserver | null>(null);

  const connectPlayer = useCallback((player: HTMLVideoElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    const root = player?.shadowRoot;
    if (!root) return;

    const labelFrame = () => root.querySelector("iframe")?.setAttribute("title", title);
    labelFrame();
    // ReactPlayer does not forward title; its YouTube provider may replace the frame while loading.
    const observer = new MutationObserver(labelFrame);
    observer.observe(root, { childList: true, subtree: true });
    observerRef.current = observer;
  }, [title]);

  return <ReactPlayer {...props} ref={connectPlayer} onLoadStart={(event) => {
    connectPlayer(event.currentTarget);
    props.onLoadStart?.(event);
  }} />;
}
