"use client";

import ModelOverlay from "@/app/(works)/ar/components/model-overlay";

const TEST_MODEL_URL = "/3d/adam-lowpoly.glb";
const TEST_VIDEO_URL = "/videos/adam.webm";
const TEST_TITLE = "Adam";
const TEST_ZH_TITLE = "亞當";

export default function ThreeDSandbox() {
  return (
    <div className="relative min-h-svh min-w-svw">
      <ModelOverlay
        modelURL={TEST_MODEL_URL}
        videoURL={TEST_VIDEO_URL}
        title={TEST_TITLE}
        zhTitle={TEST_ZH_TITLE}
      />
    </div>
  );
}
