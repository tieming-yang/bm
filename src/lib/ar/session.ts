type ARController = {
  processVideo?: (...args: unknown[]) => unknown;
  stopProcessVideo?: () => void;
  dispose?: () => void;
};

type ARSystem = {
  start: () => void;
  stop?: () => void;
  video?: HTMLVideoElement;
  controller?: ARController;
};

export type ARScene = HTMLElement & {
  hasLoaded?: boolean;
  systems?: { "mindar-image-system"?: ARSystem };
};

export type ARStartupStatus = "startingCamera" | "startingEngine" | "pointAtTarget" | "cameraFailed" | "engineTimeout";

function stopVideo(video?: HTMLVideoElement) {
  if (!video) return;
  video.pause();
  const stream = video.srcObject as MediaStream | null;
  stream?.getTracks().forEach((track) => track.stop());
  video.remove();
}

/** Stop a camera request that resolves after its detached SDK video was abandoned. */
function guardLateStream(video: HTMLVideoElement, isActive: () => boolean) {
  let prototype: object | null = video;
  let descriptor: PropertyDescriptor | undefined;
  while (prototype && !descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(prototype, "srcObject");
    prototype = Object.getPrototypeOf(prototype);
  }
  if (!descriptor?.get || !descriptor.set) throw new Error("Camera video does not support srcObject accessors");
  const { get, set } = descriptor;
  Object.defineProperty(video, "srcObject", {
    configurable: true,
    get: () => get.call(video),
    set: (stream: MediaStream | null) => {
      if (!isActive()) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      set.call(video, stream);
    },
  });
}

/** Own one MindAR attempt, including partial startup, its watchdog, and late callbacks. */
export function startARSession(
  scene: ARScene,
  onStatus: (status: ARStartupStatus) => void,
  effects = { schedule: setTimeout, cancel: clearTimeout, microtask: queueMicrotask }
) {
  let active = true;
  let started = false;
  let ready = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let system: ARSystem | undefined;
  let video: HTMLVideoElement | undefined;
  let originalStop: (() => void) | undefined;
  let disposedController: ARController | undefined;

  const clearWatchdog = () => {
    if (timer !== undefined) effects.cancel(timer);
    timer = undefined;
  };
  const stop = () => {
    const controller = system?.controller;
    try {
      if (controller && controller !== disposedController) {
        disposedController = controller;
        try {
          originalStop?.();
        } catch (error) {
          console.warn("MindAR cleanup failed", error);
          try { controller.stopProcessVideo?.(); } finally { controller.dispose?.(); }
        }
      }
    } finally {
      stopVideo(video);
    }
  };
  const fail = (status: "cameraFailed" | "engineTimeout") => {
    if (!active) return;
    clearWatchdog();
    active = false;
    stop();
    onStatus(status);
  };
  const onReady = () => {
    if (!active) {
      effects.microtask(stop);
      scene.removeEventListener("arReady", onReady);
      return;
    }
    ready = true;
    clearWatchdog();
    onStatus("pointAtTarget");
  };
  const onError = () => fail("cameraFailed");
  const onMetadata = (event: Event) => {
    if (!active) {
      event.stopImmediatePropagation();
      stop();
      return;
    }
    onStatus("startingEngine");
    clearWatchdog();
    timer = effects.schedule(() => fail("engineTimeout"), 30_000);
    effects.microtask(() => {
      const controller = system?.controller;
      if (!controller?.processVideo) return;
      const processVideo = controller.processVideo.bind(controller);
      controller.processVideo = (...args) => active ? processVideo(...args) : undefined;
      if (!active) stop();
    });
  };
  const start = () => {
    if (!active || started) return;
    started = true;
    system = scene.systems?.["mindar-image-system"];
    if (!system) return fail("cameraFailed");
    originalStop = system.stop?.bind(system);
    // A-Frame also calls stop during removal; make partial and repeated cleanup safe.
    system.stop = stop;
    onStatus("startingCamera");
    try {
      system.start();
      video = system.video;
      if (!video) throw new Error("MindAR did not create a camera video");
      guardLateStream(video, () => active);
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
      if (video.readyState >= 1) onMetadata(new Event("loadedmetadata"));
    } catch (error) {
      console.error("MindAR startup failed", error);
      fail("cameraFailed");
    }
  };

  scene.addEventListener("arReady", onReady);
  scene.addEventListener("arError", onError);
  scene.addEventListener("loaded", start);
  if (scene.hasLoaded) start();

  return () => {
    active = false;
    clearWatchdog();
    scene.removeEventListener("loaded", start);
    scene.removeEventListener("arError", onError);
    if (ready || !started) scene.removeEventListener("arReady", onReady);
    stop();
  };
}
