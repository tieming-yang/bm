"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Image, { type StaticImageData } from "next/image";
import { Trans } from "react-i18next";
import useTranslation from "@/hooks/use-translation";
import Intro from "../../../components/intro";
import lawPicture from "../../../../public/images/members/law.webp";
import johnPicture from "../../../../public/images/members/john.webp";
import yangyiPicture from "../../../../public/images/members/yangyi.webp";

export default function About() {
  const { t } = useTranslation();
  const story = t("about.story", { returnObjects: true }) as string[];
  const lawMember = t("about.members.law", { returnObjects: true }) as MemberContent;
  const johnMember = t("about.members.john", { returnObjects: true }) as MemberContent;

  return (
    <div className="container relative z-50 px-4 py-12 mx-auto font-serif">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <Intro i18nKey="about.intro" />
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-linear-to-r from-primary to-secondary bg-clip-text">
          {t("about.title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
          {t("about.subtitle")}
        </p>
      </motion.div>

      <section className="relative mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto max-w-4xl"
        >
          <MemberCard name="楊毅" role="創辦人" image={yangyiPicture} imageAlt="楊毅">
            {story.map((_, index) => (
              <p key={index}>
                <Trans
                  i18nKey={`about.story.${index}`}
                  components={{ bold: <strong className="font-semibold text-foreground" /> }}
                />
              </p>
            ))}
          </MemberCard>
        </motion.div>

        <div className="mx-auto mt-10 max-w-5xl">
          <div className="relative hidden md:block">
            <div className="relative h-16 w-full">
              <span className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-primary/70" />
              <span className="absolute left-[25%] right-[25%] top-8 h-px bg-primary/70" />
              <span className="absolute left-[25%] top-8 h-8 w-px bg-primary/70" />
              <span className="absolute right-[25%] top-8 h-8 w-px bg-primary/70" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <MemberCard
                name={lawMember.name}
                role={lawMember.role}
                image={lawPicture}
                imageAlt={lawMember.name}
              >
                <h3 className="text-lg font-bold text-foreground">{lawMember.title}</h3>
                {lawMember.story.map((paragraph, index) => (
                  <p key={`law-${index}`}>{paragraph}</p>
                ))}
              </MemberCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <MemberCard
                name={johnMember.name}
                role={johnMember.role}
                image={johnPicture}
                imageAlt={johnMember.name}
              >
                <h3 className="text-lg font-semibold text-foreground">{johnMember.title}</h3>
                {johnMember.story.map((paragraph, index) => (
                  <p key={`john-${index}`}>{paragraph}</p>
                ))}
                {johnMember.closing ? <p>{johnMember.closing}</p> : null}
                {johnMember.quote ? (
                  <blockquote className="border-l-4 border-primary/40 pl-4 font-semibold text-foreground">
                    {johnMember.quote}
                  </blockquote>
                ) : null}
              </MemberCard>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

type MemberCardProps = {
  name: string;
  role: string;
  image: StaticImageData;
  imageAlt: string;
  children: ReactNode;
};

type MemberContent = {
  name: string;
  role: string;
  title: string;
  story: string[];
  closing?: string;
  quote?: string;
};

function MemberCard({ name, role, image, imageAlt, children }: MemberCardProps) {
  return (
    <div className="relative overflow-hidden rounded-4xl border border-primary/70 bg-primary-gradient-30 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative self-center-safe h-52 w-52 shrink-0 overflow-hidden rounded-full border border-primary/50 bg-primary-gradient-50">
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover"
            placeholder="blur"
            sizes="(min-width: 768px) 96px, 80px"
          />
        </div>
        <div className="space-y-1"> 
          <p className="text-xl sm:text-3xl font-medium text-primary-foreground-gradient">{role}</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground">{name}</h2>
        </div>
      </div>
      <div className="mt-6 space-y-4 text-lg leading-relaxed sm:text-xl text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
