"use client";

import useTranslation from "@/hooks/use-translation";
import ServiceTypes from "./components/service-types";

export default function ClientBeyondArtPage() {
  const { t } = useTranslation("services");
  return (
    <div className="relative py-16 mx-auto bg-primary-gradient-50">
      <section id="hero" className="w-full space-y-16 ">
        <div className="px-3 lg:px-0 space-y-5">
          <h1 className="text-4xl font-bold text-balance md:text-5xl">
            {t("services.beyond-art.hero.title")}
          </h1>

          <p className="text-xl">{t("services.beyond-art.hero.description")}</p>
        </div>
        <div>
          <h2 className="px-3 lg:px-0 text-center text-2xl">
            {t("services.beyond-art.demo.title")}
          </h2>
          <div>
            {[{ src: "/videos/custom-video-demo.webm" }].map((work, index) => {
              const works = t("services.beyond-art.demo.works", {
                returnObjects: true,
              }) as { title: string }[];

              return (
                <figure key={work.src}>
                  <video src={work.src} autoPlay muted controls loop className="px-0"></video>
                  <figcaption className="text-center">{works[index].title}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <ServiceTypes />
      </section>
    </div>
  );
}
