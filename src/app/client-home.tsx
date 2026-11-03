"use client";

import useTranslation from "@/hooks/use-translation";
import { motion } from "framer-motion";
import BibleBooks from "../components/bible-books";
import Logo3D from "@/components/logo-3d";

type Props = {};

export default function ClientHome({}: Props) {
  const { t } = useTranslation();
  return (
    <div className="relative z-20">
      <section aria-labelledby="home-title" className="relative isolate overflow-hidden bg-[#08070c]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#08070c_0%,#241142_34%,#172554_68%,#075985_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-55 mix-blend-screen bg-[linear-gradient(115deg,transparent_0%,rgba(168,85,247,0.38)_24%,transparent_43%,rgba(59,130,246,0.34)_62%,rgba(14,165,233,0.3)_84%,transparent_100%)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/20 backdrop-blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,12,0.18)_0%,transparent_35%,rgba(8,7,12,0.48)_100%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pt-12 pb-[calc(var(--navigation-height)+1.5rem)] sm:px-6 sm:pt-16 lg:min-h-[calc(100svh-var(--header-height))] lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0 space-y-6 text-left">
            <h1 id="home-title" className="font-display text-4xl leading-tight text-balance text-primary-foreground-gradient sm:text-5xl lg:text-6xl">
              {t("home.title")}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-foreground/85 sm:text-xl">
              {t("home.intro")}
            </p>
          </div>
          <div className="mx-auto aspect-square w-full max-w-md min-w-0 lg:aspect-auto lg:h-[min(65svh,640px)] lg:max-w-none">
            <Logo3D />
          </div>
        </div>
      </section>
      <motion.section
        initial={{ opacity: 0, y: 20, scale: 0.7 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 1.5 }}
        className="flex flex-col items-center justify-center w-full px-3 mx-auto text-transparent gap-y-5 h-svh"
      >
        <h2 className="font-display flex flex-col text-2xl text-center md:text-5xl sm:text-3xl transition-all duration-300 gap-y-16 md:gap-y-12 xl:text-7xl text-primary-foreground-gradient">
          {t("home.subtitle")
            .split("\n")
            .map((line, index) => (
              <motion.span key={index}>
                {line}
                <br />
              </motion.span>
            ))}
        </h2>
      </motion.section>

      <h2 className="section-title mb-8 text-center">{t("nav.bibleGallery")}</h2>
      <BibleBooks />
    </div>
  );
}
