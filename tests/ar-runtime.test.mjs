import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import i18next from "i18next";
import { loadSourceModule } from "./helpers/source-module.mjs";

const { startARSession } = loadSourceModule("src/lib/ar/session.ts");
const { bindNarration } = loadSourceModule("src/lib/ar/narration.ts");

function events() {
  const handlers = new Map();
  return {
    addEventListener(name, fn, options) { const list = handlers.get(name) ?? []; list.push({ fn, once: options?.once }); handlers.set(name, list); },
    removeEventListener(name, fn) { handlers.set(name, (handlers.get(name) ?? []).filter((entry) => entry.fn !== fn)); },
    emit(name) {
      const event = { stopped: false, stopImmediatePropagation() { this.stopped = true; } };
      for (const entry of [...(handlers.get(name) ?? [])]) {
        if (entry.once) this.removeEventListener(name, entry.fn);
        entry.fn(event);
        if (event.stopped) break;
      }
    },
  };
}

function camera({ loaded = true, throwOnStop = false } = {}) {
  let stream = null;
  let trackStops = 0;
  let controllerStops = 0;
  let starts = 0;
  let frames = 0;
  const statuses = [];
  const timers = new Map();
  const microtasks = [];
  const video = { ...events(), readyState: 0, pause() {}, remove() {} };
  Object.defineProperty(video, "srcObject", { configurable: true, get: () => stream, set: (value) => { stream = value; } });
  const system = {
    video,
    start() { starts++; },
    stop() { controllerStops++; if (throwOnStop) throw new Error("Partial SDK teardown"); },
  };
  const scene = { ...events(), hasLoaded: loaded, systems: { "mindar-image-system": system } };
  const effects = {
    schedule(fn, delay) { assert.equal(delay, 30000); const id = {}; timers.set(id, fn); return id; },
    cancel(id) { timers.delete(id); },
    microtask(fn) { microtasks.push(fn); },
  };
  const cleanup = startARSession(scene, (value) => statuses.push(value), effects);
  return {
    scene, system, video, statuses, timers, cleanup,
    grant() {
      video.addEventListener("loadedmetadata", () => { system.controller = { processVideo() { frames++; }, stopProcessVideo() {}, dispose() {} }; });
      video.srcObject = { getTracks: () => [{ stop() { trackStops++; } }] };
      if (video.srcObject) video.emit("loadedmetadata");
      while (microtasks.length) microtasks.shift()();
    },
    flush() { while (microtasks.length) microtasks.shift()(); },
    starts: () => starts, stops: () => controllerStops, trackStops: () => trackStops, frames: () => frames,
  };
}

test("AR waits for scene readiness and requests camera once", () => {
  const attempt = camera({ loaded: false });
  assert.equal(attempt.starts(), 0);
  attempt.scene.emit("loaded");
  attempt.scene.emit("loaded");
  assert.equal(attempt.starts(), 1);
  assert.deepEqual(attempt.statuses, ["startingCamera"]);
  assert.equal(attempt.timers.size, 0);
  attempt.cleanup();
});

test("AR watchdog begins after metadata and readiness cancels it", () => {
  const attempt = camera();
  assert.equal(attempt.timers.size, 0);
  attempt.grant();
  assert.equal(attempt.timers.size, 1);
  attempt.scene.emit("arReady");
  assert.equal(attempt.timers.size, 0);
  assert.deepEqual(attempt.statuses, ["startingCamera", "startingEngine", "pointAtTarget"]);
  attempt.cleanup();
});

test("engine timeout is visible and late engine work cannot restart video", () => {
  const attempt = camera();
  attempt.grant();
  [...attempt.timers.values()][0]();
  assert.equal(attempt.statuses.at(-1), "engineTimeout");
  attempt.system.controller.processVideo();
  assert.equal(attempt.frames(), 0);
  attempt.scene.emit("arReady");
  attempt.flush();
  assert.equal(attempt.statuses.at(-1), "engineTimeout");
  assert.ok(attempt.trackStops() > 0);
  attempt.cleanup();
});

test("camera failure produces a retryable state before controller initialization", () => {
  const attempt = camera();
  attempt.scene.emit("arError");
  assert.equal(attempt.statuses.at(-1), "cameraFailed");
  assert.doesNotThrow(attempt.cleanup);
});

test("late permission result is stopped after exit without starting the engine", () => {
  const attempt = camera();
  attempt.cleanup();
  attempt.grant();
  assert.equal(attempt.trackStops(), 1);
  assert.equal(attempt.system.controller, undefined);
  assert.equal(attempt.timers.size, 0);
});

test("late target loading is disposed again even when it reuses the same controller", () => {
  const attempt = camera();
  attempt.grant();
  attempt.cleanup();
  assert.equal(attempt.stops(), 1);
  attempt.system.controller.processVideo();
  assert.equal(attempt.frames(), 0);
  attempt.scene.emit("arReady");
  attempt.flush();
  assert.equal(attempt.stops(), 2);
  assert.notEqual(attempt.statuses.at(-1), "pointAtTarget");
});

test("SDK teardown failure still stops camera tracks", () => {
  const attempt = camera({ throwOnStop: true });
  attempt.grant();
  assert.doesNotThrow(attempt.cleanup);
  assert.ok(attempt.trackStops() > 0);
  assert.equal(attempt.stops(), 1);
  attempt.cleanup();
  assert.equal(attempt.stops(), 1);
});

function narration(autoplay = true) {
  const statuses = [];
  const pending = [];
  let loads = 0;
  const audio = { ...events(), currentTime: 15, pause() {}, load() { loads++; }, play() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); } };
  return { audio, pending, statuses, loads: () => loads, transport: bindNarration(audio, (status) => statuses.push(status), autoplay) };
}

test("narration waits for actual playing events and supports pause and stop", () => {
  const player = narration();
  assert.deepEqual(player.statuses, ["loading"]);
  player.audio.emit("playing");
  assert.equal(player.statuses.at(-1), "playing");
  player.transport.pause();
  assert.equal(player.statuses.at(-1), "paused");
  player.audio.emit("playing");
  assert.equal(player.statuses.at(-1), "paused");
  player.transport.stop();
  player.audio.emit("pause");
  assert.equal(player.statuses.at(-1), "stopped");
  assert.equal(player.audio.currentTime, 0);
  player.transport.dispose();
});

test("autoplay denial becomes Play-ready and retry reloads failed media", async () => {
  const player = narration();
  player.pending[0].reject(Object.assign(new Error("Denied"), { name: "NotAllowedError" }));
  await Promise.resolve();
  assert.equal(player.statuses.at(-1), "blocked");
  player.audio.emit("error");
  void player.transport.play();
  assert.equal(player.loads(), 1);
  player.transport.dispose();
});

test("pause and source disposal ignore obsolete play rejections", async () => {
  const player = narration();
  player.transport.pause();
  player.pending[0].reject(new Error("Interrupted"));
  await Promise.resolve();
  assert.equal(player.statuses.at(-1), "paused");
  void player.transport.play();
  player.transport.dispose();
  const count = player.statuses.length;
  player.pending[1].reject(new Error("Old source"));
  player.audio.emit("playing");
  await Promise.resolve();
  assert.equal(player.statuses.length, count);
});

test("paused intent does not autoplay a newly selected clip", () => {
  const player = narration(false);
  assert.equal(player.pending.length, 0);
  assert.deepEqual(player.statuses, ["paused"]);
  player.transport.dispose();
});

for (const language of ["en", "zh-TW"]) {
  test(`AR narration uses ${language} and exposes controls with reduced motion`, async () => {
    const messages = JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/ar.json`, import.meta.url), "utf8"));
    const instance = i18next.createInstance();
    await instance.init({ lng: language, resources: { [language]: { ar: messages } } });
    const Overlay = loadSourceModule("src/app/(works)/ar/components/model-overlay.tsx", {
      "@/utils/to-title": { __esModule: true, default: (value) => value },
      "@react-three/drei": { Center: ({ children }) => children },
      "@react-three/fiber": { Canvas: () => null, useFrame() {} },
      "framer-motion": { useReducedMotion: () => true, AnimatePresence: ({ children }) => children, motion: { span: ({ children, className }) => React.createElement("span", { className }, children) } },
      "@/hooks/use-translation": { __esModule: true, default: () => ({ t: instance.getFixedT(language, "ar"), currentLanguage: language }) },
      "@/components/ui/button": { Button: ({ children, disabled }) => React.createElement("button", { disabled }, children) },
      "@/lib/ar/narration": { bindNarration },
    }).default;
    const markup = renderToStaticMarkup(React.createElement(Overlay, { modelURL: "/model.glb", title: "Adam", titleZh: "亞當", audioURL: "/english.mp3", audioZhURL: "/chinese.mp3" }));
    assert.match(markup, language === "en" ? /src="\/english.mp3"/ : /src="\/chinese.mp3"/);
    assert.ok(markup.includes(messages.ar.viewer.actions.pause));
    assert.ok(markup.includes(messages.ar.viewer.actions.stop));
    assert.doesNotMatch(markup, /animate-bounce/);
    if (language === "zh-TW") {
      const missing = renderToStaticMarkup(React.createElement(Overlay, { modelURL: "/model.glb", title: "Adam", audioURL: "/english.mp3" }));
      assert.ok(missing.includes(messages.ar.viewer.status.audioUnavailable));
      assert.doesNotMatch(missing, /src="\/english.mp3"/);
    }
  });
}
