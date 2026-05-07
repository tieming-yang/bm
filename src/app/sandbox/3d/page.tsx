"use client";

import ModelOverlay from "@/app/(works)/ar/components/model-overlay";

const TEST_MODEL_URL = "/3d/adam-lowpoly.glb";
const TEST_VIDEO_URL = "/videos/adam.webm";
const TEST_AUDIO_EN_URL = "/audios/audio.en.mp3";
const TEST_AUDIO_ZH_URL = "/audios/audio.zh.mp3";
const TEST_TITLE = "Adam";
const TEST_ZH_TITLE = "亞當";

export default function ThreeDSandbox() {
  return (
    <div className="relative min-h-svh min-w-svw">
      <ModelOverlay
        modelURL={TEST_MODEL_URL}
        videoURL={TEST_VIDEO_URL}
        audioURL={TEST_AUDIO_EN_URL}
        audioZhURL={TEST_AUDIO_ZH_URL}
        title={TEST_TITLE}
        titleZh={TEST_ZH_TITLE}
      />
      <p className="pt-150">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Ab ex, eligendi nostrum similique
        quasi, amet, molestias laboriosam minus maiores expedita molestiae asperiores sunt unde!
        Sunt provident aliquid fugiat voluptatum assumenda.
      </p>
    </div>
  );
}
