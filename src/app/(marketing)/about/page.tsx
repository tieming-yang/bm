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
  const yangMember = t("about.members.yangyi", { returnObjects: true }) as MemberContent;

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
          className="max-w-4xl mx-auto"
        >
          <MemberCard
            name={yangMember.name}
            role={yangMember.role}
            image={yangyiPicture}
            imageAlt="楊毅"
          >
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
  // if (name === "yangyi" || name === "楊毅") {
  //   return (
  //     <div className="relative p-6 overflow-hidden border grid md:grid-cols-2 border-primary/70 bg-primary-gradient-30 shadow-sm backdrop-blur-sm">
  //       <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  //         <div className="relative overflow-hidden border self-center-safe h-96 w-52 lg:h-127 lg:w-77 shrink-0 border-primary/50 bg-primary-gradient-50">
  //           <Image
  //             src={image}
  //             alt={imageAlt}
  //             fill
  //             className="object-cover"
  //             placeholder="blur"
  //             sizes="(min-width: 768px) 96px, 80px"
  //           />
  //         </div>
  //         <div className="space-y-1">
  //           <p className="text-xl font-medium sm:text-3xl text-primary-foreground-gradient">
  //             {role}
  //           </p>
  //           <h2 className="text-3xl font-semibold sm:text-4xl text-foreground">{name}</h2>
  //         </div>
  //       </div>
  //       <div className="mt-6 text-lg leading-relaxed space-y-4 sm:text-xl text-muted-foreground">
  //         {children}
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="relative p-6 overflow-hidden border rounded-4xl border-primary/70 bg-primary-gradient-30 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative overflow-hidden border rounded-full self-center-safe h-52 w-52 shrink-0 border-primary/50 bg-primary-gradient-50">
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
          <p className="text-xl font-medium sm:text-3xl text-primary-foreground-gradient">{role}</p>
          <h2 className="text-3xl font-semibold sm:text-4xl text-foreground">{name}</h2>
        </div>
      </div>
      <div className="mt-6 text-lg leading-relaxed space-y-4 sm:text-xl text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
