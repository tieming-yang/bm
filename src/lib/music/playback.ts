export type RepeatMode = "none" | "single" | "all";
export type PlaybackSettings = { repeat: RepeatMode; shuffled: boolean };
export type PlaybackStep = { kind: "stop" } | { kind: "restart" } | { kind: "navigate"; songId: string };

/** Read the existing URL controls, retaining their legacy defaults for unknown values. */
export function readPlaybackSettings(params: { get: (name: string) => string | null }): PlaybackSettings {
  const repeat = params.get("lm");
  return { repeat: repeat === "single" || repeat === "all" ? repeat : "none", shuffled: params.get("s") === "true" };
}

/** Build a valid UI queue, anchoring the current song when a shuffled permutation is supplied. */
export function createPlaybackQueue(ids: readonly string[], currentId: string, permutation?: readonly string[]): readonly string[] {
  if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) throw new Error("Playback catalogue IDs must be unique non-empty strings");
  if (!ids.includes(currentId)) throw new Error("Current song must belong to the playback catalogue");
  if (!permutation) return [...ids];
  if (permutation.length !== ids.length || new Set(permutation).size !== ids.length || permutation.some((id) => !ids.includes(id))) throw new Error("Shuffled queue must contain every catalogue ID exactly once");
  return [currentId, ...permutation.filter((id) => id !== currentId)];
}

/** Decide transport boundaries without media, navigation, random, or storage effects. */
export function resolvePlaybackStep(queue: readonly string[], currentId: string, direction: "previous" | "next" | "ended", repeat: RepeatMode): PlaybackStep {
  const index = queue.indexOf(currentId);
  if (index < 0) return { kind: "stop" };
  if (direction === "ended" && (repeat === "single" || (repeat === "all" && queue.length === 1))) return { kind: "restart" };
  if (queue.length < 2) return { kind: "stop" };
  const nextIndex = index + (direction === "previous" ? -1 : 1);
  if (nextIndex >= 0 && nextIndex < queue.length) return { kind: "navigate", songId: queue[nextIndex] };
  if (repeat !== "all") return { kind: "stop" };
  return { kind: "navigate", songId: queue[(nextIndex + queue.length) % queue.length] };
}

/** Preserve other query parameters while serializing the existing playback controls. */
export function playbackSearch(params: { toString: () => string }, settings: PlaybackSettings): string {
  const next = new URLSearchParams(params.toString());
  next.set("lm", settings.repeat);
  next.set("s", String(settings.shuffled));
  return next.toString();
}
