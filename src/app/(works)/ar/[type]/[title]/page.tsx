"use client";

import { useSearchParams } from "next/navigation";
import ARViewer from "../../components/ar-viewer";

export default function ClientARViewPage() {
  const searchParams = useSearchParams();
  const targetURL = searchParams.get("target");
  const modelURL = searchParams.get("model");

  if (!targetURL || !modelURL) {
    console.error("❌", "Missing target or model url");
    return null;
  }

  return <ARViewer targetURL={targetURL} modelURL={modelURL} />;
}
