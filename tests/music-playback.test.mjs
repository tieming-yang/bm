import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSourceModule } from "./helpers/source-module.mjs";

const policy = loadSourceModule("src/lib/music/playback.ts");
const { readPlaybackSettings, createPlaybackQueue, resolvePlaybackStep, playbackSearch } = policy;
const songs = ["a", "b", "c"].map((id) => ({ id, title: id.toUpperCase(), fileUrl: `${id}.mp3`, lyrics: "" }));

function all(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => all(child, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}

test("playback URLs preserve existing controls, defaults, and unrelated parameters", () => {
  assert.deepEqual(readPlaybackSettings(new URLSearchParams("lm=unknown&s=yes")), { repeat: "none", shuffled: false });
  assert.deepEqual(readPlaybackSettings(new URLSearchParams("lm=single&s=true")), { repeat: "single", shuffled: true });
  assert.equal(playbackSearch(new URLSearchParams("source=shared&lm=none"), { repeat: "all", shuffled: true }), "source=shared&lm=all&s=true");
});

test("queue creation never mutates catalogue order and rejects malformed permutations", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(createPlaybackQueue(ids, "a", ["b", "a", "c"]), ["a", "b", "c"]);
  assert.deepEqual(ids, ["a", "b", "c"]);
  assert.throws(() => createPlaybackQueue(["a", "a"], "a"), /unique/);
  assert.throws(() => createPlaybackQueue(ids, "missing"), /belong/);
  assert.throws(() => createPlaybackQueue(ids, "a", ["a", "b", "b"]), /exactly once/);
});

for (const repeat of ["none", "single", "all"]) {
  test(`transport boundaries preserve repeat mode ${repeat}`, () => {
    const queue = ["a", "b", "c"];
    assert.deepEqual(resolvePlaybackStep(queue, "b", "next", repeat), { kind: "navigate", songId: "c" });
    assert.deepEqual(resolvePlaybackStep(queue, "b", "previous", repeat), { kind: "navigate", songId: "a" });
    assert.deepEqual(resolvePlaybackStep(queue, "a", "previous", repeat), repeat === "all" ? { kind: "navigate", songId: "c" } : { kind: "stop" });
    assert.deepEqual(resolvePlaybackStep(queue, "c", "next", repeat), repeat === "all" ? { kind: "navigate", songId: "a" } : { kind: "stop" });
    assert.deepEqual(resolvePlaybackStep(queue, "c", "ended", repeat), repeat === "single" ? { kind: "restart" } : repeat === "all" ? { kind: "navigate", songId: "a" } : { kind: "stop" });
    assert.deepEqual(resolvePlaybackStep(["a"], "a", "next", repeat), { kind: "stop" });
    assert.deepEqual(resolvePlaybackStep(["a"], "a", "ended", repeat), repeat === "none" ? { kind: "stop" } : { kind: "restart" });
    assert.deepEqual(resolvePlaybackStep([], "a", "ended", repeat), { kind: "stop" });
  });
}

test("music-route provider retains its shuffled queue across tracks and rebuilds only for settings/catalogue changes", () => {
  let state;
  let sessionRef;
  let randomCalls = 0;
  const originalRandom = Math.random;
  Math.random = () => { randomCalls++; return 0.5; };
  try {
  const { PlaybackQueueProvider } = loadSourceModule("src/app/(works)/beyond-music/components/playback-queue.tsx", {
    react: {
      createContext: () => ({ Provider: "QueueProvider" }), useContext() {}, useCallback: (callback) => callback, useMemo: (callback) => callback(),
      useState(initial) { state ??= initial; return [state, (next) => { state = typeof next === "function" ? next(state) : next; }]; },
      useRef(initial) { sessionRef ??= { current: initial }; return sessionRef; },
    },
    "@/lib/music/playback": policy,
  });
  const value = () => PlaybackQueueProvider({ children: null }).props.value;
  value().register(["a", "b", "c"], "a", true);
  assert.equal(randomCalls, 2);
  const initial = [...value().ids];
  value().register(["a", "b", "c"], "b", true);
  assert.equal(randomCalls, 2);
  assert.deepEqual(value().ids, initial);
  assert.equal(value().ids[0], "a");
  value().register(["a", "b", "c", "d"], "b", true);
  assert.equal(randomCalls, 5);
  assert.equal(value().ids[0], "b");
  assert.deepEqual([...value().ids].sort(), ["a", "b", "c", "d"]);
  value().register(["a", "b", "c", "d"], "b", false);
  assert.deepEqual(value().ids, ["a", "b", "c", "d"]);
  assert.equal(randomCalls, 5);
  } finally {
    Math.random = originalRandom;
  }
});

function playerHarness({ search = "lm=none&s=false&source=shared", track = songs[0], catalogue = songs } = {}) {
  const hooks = [];
  let cursor = 0;
  const pendingEffects = [];
  const events = new Map();
  const navigation = [];
  const scrolls = [];
  const messages = [];
  const media = { duration: 60, currentTime: 0, paused: true, pause() {}, play: async () => {} };
  const browser = {
    window: { location: { href: `https://example.test/beyond-music/${track.title}?${search}` }, addEventListener: (name, handler) => events.set(name, handler), removeEventListener: (name) => events.delete(name) },
    document: { getElementById: (id) => ({ scrollIntoView: () => scrolls.push(id) }) },
    Element: class {},
  };
  const path = "src/app/(works)/beyond-music/components/audio-player.tsx";
  const { default: Player } = loadSourceModule(path, {
    "test/browser": browser,
    "@/models/song": { formatTimestamp: (seconds) => String(seconds), formatLyrics: () => [{ timestamp: 0, text: "Intro" }, { timestamp: 10, text: "Verse" }] },
    react: {
      useState(initial) { const index = cursor++; hooks[index] ??= { value: typeof initial === "function" ? initial() : initial }; return [hooks[index].value, (next) => { hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next; }]; },
      useRef(initial) { const index = cursor++; hooks[index] ??= { current: initial }; return hooks[index]; },
      useMemo(callback, deps) { const index = cursor++; if (!hooks[index] || deps.some((value, offset) => value !== hooks[index].deps[offset])) hooks[index] = { value: callback(), deps }; return hooks[index].value; },
      useEffect(callback, deps) { const index = cursor++; if (!hooks[index] || deps.some((value, offset) => value !== hooks[index].deps[offset])) pendingEffects.push(() => { hooks[index]?.cleanup?.(); hooks[index] = { deps, cleanup: callback() }; }); },
      useTransition: () => [false, (callback) => callback()],
    },
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" },
    "@/components/ui/content-state": { ContentState: "ContentState" }, "@/app/loading": "Loading",
    "lucide-react": new Proxy({}, { get: (_, name) => name }),
    sonner: { toast: { success() {}, warning() {}, error: (message) => messages.push(message) } },
    "@tanstack/react-query": { useQuery: () => ({ data: catalogue, isLoading: false }) }, "@/utils/query-keys": { QueryKey: {} },
    "next/navigation": { useRouter: () => ({ push: (url) => navigation.push(["push", url]), replace: (url) => navigation.push(["replace", url]) }), usePathname: () => `/beyond-music/${track.title}`, useSearchParams: () => new URLSearchParams(search) },
    "@next/third-parties/google": { sendGAEvent() {} }, "@/hooks/use-translation": () => ({ t: (key) => key }),
    "framer-motion": { useReducedMotion: () => true }, "@/lib/music/playback": policy,
    "./playback-queue": { usePlaybackQueue: () => ({ ids: catalogue.map((item) => item.id), catalogKey: JSON.stringify(catalogue.map((item) => item.id)), shuffled: new URLSearchParams(search).get("s") === "true", register() {} }) },
  }, 'import browser from "test/browser"; const window = browser.window; const document = browser.document; const Element = browser.Element;\n' + readFileSync(path, "utf8"));
  return {
    media, events, navigation, scrolls, messages,
    render() { cursor = 0; const tree = Player({ song: track }); const audio = all(tree, (node) => node.type === "audio")[0]; audio.props.ref.current = media; const lyrics = all(tree, (node) => node.type === "ul")[0]; lyrics.props.ref.current = {}; for (const effect of pendingEffects.splice(0)) effect(); return tree; },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
  };
}

test("retry replaces failed media and ignores callbacks from the discarded attempt", () => {
  const harness = playerHarness();
  let tree = harness.render();
  const oldAudio = all(tree, (node) => node.type === "audio")[0];
  oldAudio.props.onError();
  tree = harness.render();
  all(tree, (node) => node.type === "ContentState")[0].props.onRetry();
  tree = harness.render();
  const newAudio = all(tree, (node) => node.type === "audio")[0];
  assert.notEqual(newAudio.key, oldAudio.key);
  newAudio.props.onLoadedMetadata();
  oldAudio.props.onError();
  tree = harness.render();
  assert.equal(all(tree, (node) => node.type === "ContentState").length, 0);
  assert.equal(all(tree, (node) => node.type === "Button" && node.props["aria-label"] === "beyondMusic.player.play")[0].props.disabled, false);
  harness.unmount();
  newAudio.props.onEnded();
  assert.deepEqual(harness.navigation, []);
});

test("manual lyric browsing pauses following until explicitly resumed", () => {
  const harness = playerHarness();
  let tree = harness.render();
  assert.equal(harness.scrolls.length, 1);
  harness.events.get("wheel")();
  harness.media.currentTime = 10;
  all(tree, (node) => node.type === "audio")[0].props.onTimeUpdate();
  tree = harness.render();
  assert.equal(harness.scrolls.length, 1);
  const resume = all(tree, (node) => node.type === "Button" && node.props["aria-pressed"] === false && node.props.children === "beyondMusic.player.resumeLyrics")[0];
  resume.props.onClick();
  harness.render();
  assert.equal(harness.scrolls.at(-1), "line-10");
  harness.unmount();
});

test("playback control toggles serialize immediately without dropping unrelated query values", () => {
  const harness = playerHarness();
  const tree = harness.render();
  const shuffle = all(tree, (node) => node.type === "Button" && node.props["aria-label"] === "beyondMusic.player.shuffle")[0];
  shuffle.props.onClick();
  assert.deepEqual(harness.navigation, [["replace", "/beyond-music/A?lm=none&s=true&source=shared"]]);
  harness.unmount();
});


test("song identity keys remount track-specific playback state on a direct prop change", () => {
  const { default: Page } = loadSourceModule("src/app/(works)/beyond-music/[title]/client-page.tsx", {
    "@/models/song": {}, "@/utils/query-keys": { QueryKey: {} },
    "@tanstack/react-query": { useQuery: () => ({ data: songs, isLoading: false }) },
    "../components/audio-player": "AudioPlayer", "@/app/loading": "Loading", "@/components/ui/content-state": { ContentState: "ContentState" },
    "@/hooks/use-translation": () => ({ t: (key) => key }),
  });
  assert.equal(all(Page({ title: "A" }), (node) => node.type === "AudioPlayer")[0].key, "a");
  assert.equal(all(Page({ title: "B" }), (node) => node.type === "AudioPlayer")[0].key, "b");
});

test("late playback rejection after leaving a track cannot emit an error for the new screen", async () => {
  const harness = playerHarness();
  let reject;
  harness.media.play = () => new Promise((_, fail) => { reject = fail; });
  let tree = harness.render();
  all(tree, (node) => node.type === "audio")[0].props.onLoadedMetadata();
  tree = harness.render();
  all(tree, (node) => node.type === "Button" && node.props["aria-label"] === "beyondMusic.player.play")[0].props.onClick();
  harness.unmount();
  reject(new Error("Old playback interrupted"));
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(harness.messages, []);
});

test("repeat-all with one song restarts media directly while manual skip remains disabled", () => {
  const harness = playerHarness({ catalogue: [songs[0]], search: "lm=all&s=false" });
  let plays = 0;
  harness.media.play = async () => { plays += 1; };
  harness.media.currentTime = 60;
  const tree = harness.render();
  assert.equal(all(tree, (node) => node.type === "Button" && node.props["aria-label"] === "beyondMusic.player.next")[0].props.disabled, true);
  all(tree, (node) => node.type === "audio")[0].props.onEnded();
  assert.equal(harness.media.currentTime, 0);
  assert.equal(plays, 1);
  assert.deepEqual(harness.navigation, []);
  harness.unmount();
});
