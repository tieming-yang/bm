"use client";

import useTranslation from "@/hooks/use-translation";
import ServiceTypes from "./components/service-types";
import { motion } from "framer-motion";

export default function ClientBeyondArtPage() {
  const { t } = useTranslation("services");
  return (
    <div className="relative w-full py-16 mx-auto bg-primary-gradient-30">
      <section id="hero" className="w-full max-w-6xl mx-auto space-y-16 grid gap-10 lg:grid-cols-2">
        <motion.div
          className="px-3 2xl:px-0 space-y-5 place-content-center-safe"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-4xl leading-tight tracking-tight text-primary-foreground-gradient text-balance md:text-5xl">
            {t("services.beyond-art.hero.title")}
          </h1>

          <p className="text-xl italic md:text-2xl font-chinese text-primary-foreground-gradient">
            {t("services.beyond-art.hero.description")}
          </p>
        </motion.div>
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h2 className="px-3 text-2xl text-center lg:px-0">
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
                  <figcaption className="text-center text-muted-foreground">{works[index].title}</figcaption>
                </figure>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section>
        <ServiceTypes />
      </section>
    </div>
  );
}
