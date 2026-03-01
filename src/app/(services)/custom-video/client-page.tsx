"use client";

import ServiceTypes from "./components/service-types";

export default function ClientCustomVideoPage() {
  return (
    <div className="relative px-4 py-16 mx-auto space-y-16">
      <section id="hero" className="h-dvh">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
          舞台藝術客製化製作
        </h1>
        <video src="/videos/custom-video-demo.webm" autoPlay controls></video>
      </section>

      <section>
        <ServiceTypes />
      </section>
    </div>
  );
}
