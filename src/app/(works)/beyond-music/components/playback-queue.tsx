"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPlaybackQueue } from "@/lib/music/playback";

type QueueSession = { catalogKey: string; shuffled: boolean; ids: readonly string[] };
type QueueContext = QueueSession & { register: (ids: readonly string[], currentId: string, shuffled: boolean) => void };
const PlaybackQueueContext = createContext<QueueContext | null>(null);

function shuffle(ids: readonly string[]): string[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Keep the ephemeral listening order across song routes without persisting user data. */
export function PlaybackQueueProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<QueueSession>({ catalogKey: "", shuffled: false, ids: [] });
  const sessionRef = useRef(session);
  const register = useCallback((ids: readonly string[], currentId: string, shuffled: boolean) => {
    const catalogKey = JSON.stringify(ids);
    if (sessionRef.current.catalogKey === catalogKey && sessionRef.current.shuffled === shuffled) return;
    const candidate = { catalogKey, shuffled, ids: createPlaybackQueue(ids, currentId, shuffled ? shuffle(ids) : undefined) };
    sessionRef.current = candidate;
    setSession(candidate);
  }, []);
  const context = useMemo(() => ({ ...session, register }), [session, register]);
  return <PlaybackQueueContext.Provider value={context}>{children}</PlaybackQueueContext.Provider>;
}

/** Read the current music-route queue; missing provider is an internal composition error. */
export function usePlaybackQueue() {
  const queue = useContext(PlaybackQueueContext);
  if (!queue) throw new Error("Playback queue provider is missing");
  return queue;
}
