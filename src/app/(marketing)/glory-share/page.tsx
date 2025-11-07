"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Crown,
  Gift,
  Globe,
  Heart,
  Infinity,
  Layers,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import useTranslation from "@/hooks/use-translation";

type BenefitContent = { title: string; description: string };
type MissionHighlightContent = BenefitContent;
type TrackContent = BenefitContent & { highlights: string[] };
type ActiveProjectContent = {
  badge: string;
  title: string;
  description: string;
  perksTitle: string;
  perks: string[];
  future: string;
  upcoming: {
    title: string;
    description: string;
    projects: { title: string; description: string }[];
    footer: string;
  };
};

const benefitIcons: LucideIcon[] = [Infinity, Crown, Sparkles];
const missionIcons: LucideIcon[] = [ShieldCheck, Globe, Heart];
const trackIcons: LucideIcon[] = [Layers, Palette, Gift];

export default function GlorySharePage() {
  const { t } = useTranslation("glory-share");

  const benefits = (
    (t("gloryShare.benefits", { returnObjects: true }) as BenefitContent[]) ?? []
  ).map((benefit, index) => ({
    ...benefit,
    icon: benefitIcons[index] ?? benefitIcons[benefitIcons.length - 1],
  }));

  const missionHighlights = (
    (t("gloryShare.missionHighlights", { returnObjects: true }) as MissionHighlightContent[]) ?? []
  ).map((highlight, index) => ({
    ...highlight,
    icon: missionIcons[index] ?? missionIcons[missionIcons.length - 1],
  }));

  const membershipBullets =
    (t("gloryShare.membership.bullets", { returnObjects: true }) as string[]) ?? [];
  const membershipBulletFootnotes =
    (t("gloryShare.membership.bulletFootnotes", { returnObjects: true }) as Array<number | null>) ??
    [];
  const membershipFootnotes =
    (t("gloryShare.membership.footnotes", { returnObjects: true }) as string[]) ?? [];
  
  const steps = (t("gloryShare.stepsCard.steps", { returnObjects: true }) as string[]) ?? [];

  const tracks = (
    (t("gloryShare.tracksSection.tracks", { returnObjects: true }) as TrackContent[]) ?? []
  ).map((track, index) => ({
    ...track,
    icon: trackIcons[index] ?? trackIcons[trackIcons.length - 1],
  }));

  const activeProject = t("gloryShare.activeProject", {
    returnObjects: true,
  }) as ActiveProjectContent;

  return (
    <div className="container relative z-50 mx-auto space-y-16 px-4 py-16">
      <section className="grid gap-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm uppercase tracking-[0.2em] text-primary">
            {t("gloryShare.badge")}
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            {t("gloryShare.hero.title")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("gloryShare.hero.description")}</p>
          {/* <div className="flex flex-wrap gap-4">
            <Button size="lg" className="rounded-full px-8">
              {t("gloryShare.hero.primaryCta")}
            </Button>
            <Button variant="outline" size="lg" className="rounded-full border-primary/40 px-8">
              {t("gloryShare.hero.secondaryCta")}
            </Button>
          </div> */}
          <div className="rounded-3xl border border-primary/10 bg-linear-to-r from-background/70 to-background/30 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-primary/70">
              {t("gloryShare.hero.lifetimeLabel")}
            </p>
            <p className="mt-3 text-balance text-xl font-semibold leading-relaxed">
              {t("gloryShare.hero.lifetimeDescription")}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="grid gap-6"
        >
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={benefit.title}
                className="border-primary/15 bg-background/90 backdrop-blur-lg shadow-lg shadow-primary/5"
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    <CardDescription className="text-base">{benefit.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </motion.div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {missionHighlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-primary/10 bg-background/80">
                <CardHeader>
                  <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{highlight.title}</CardTitle>
                  <CardDescription className="text-base">{highlight.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-primary/15 bg-linear-to-r from-background/90 via-primary/5 to-background/70 p-10 shadow-xl shadow-primary/10 backdrop-blur">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.4em] text-primary/70">
              {t("gloryShare.membership.badge")}
            </p>
            <h2 className="text-balance text-3xl font-semibold">
              {t("gloryShare.membership.title")}
            </h2>
            <ul className="space-y-4 text-muted-foreground">
              {membershipBullets.map((bullet, index) => {
                const footnoteNumber = membershipBulletFootnotes[index];
                return (
                  <li key={bullet} className="flex-wrap items-baseline gap-1">
                    <span>{bullet}</span>
                    {typeof footnoteNumber === "number" && footnoteNumber > 0 && (
                      <sup className="text-[0.65rem] align-super text-primary">{footnoteNumber}</sup>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <Card className="border-primary/20 bg-background/95 shadow-lg shadow-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">{t("gloryShare.stepsCard.title")}</CardTitle>
              <CardDescription>{t("gloryShare.stepsCard.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {steps.map((step) => (
                <p key={step}>{step}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-10">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-primary/70">
            {t("gloryShare.tracksSection.badge")}
          </p>
          <h2 className="text-balance text-3xl font-semibold">
            {t("gloryShare.tracksSection.title")}
          </h2>
          <p className="text-muted-foreground">{t("gloryShare.tracksSection.description")}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {tracks.map((track) => {
            const Icon = track.icon;
            return (
              <Card key={track.title} className="border-primary/15 bg-background/90">
                <CardHeader className="space-y-4">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{track.title}</CardTitle>
                  <CardDescription className="text-base">{track.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {track.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-8 shadow-xl shadow-primary/20">
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1 text-xs uppercase tracking-[0.5em] text-primary">
              {activeProject.badge}
            </div>
            <h2 className="text-3xl font-semibold">{activeProject.title}</h2>
            <p className="text-lg text-muted-foreground">{activeProject.description}</p>
            <Card className="border-primary/30 bg-background/95">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{activeProject.perksTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {activeProject.perks?.map((perk) => (
                  <p key={perk} className="flex items-start gap-2">
                    <Rocket className="mt-1 h-4 w-4 text-primary" />
                    {perk}
                  </p>
                ))}
                <p className="flex items-start gap-2 text-primary">
                  <Sparkles className="mt-1 h-4 w-4" />
                  {activeProject.future}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="border-primary/25 bg-background/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">{activeProject.upcoming.title}</CardTitle>
              <CardDescription>{activeProject.upcoming.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {activeProject.upcoming.projects?.map((project) => (
                <div key={project.title}>
                  <h3 className="font-semibold text-foreground">{project.title}</h3>
                  <p>{project.description}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-foreground">
                {activeProject.upcoming.footer}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      {membershipFootnotes.length > 0 && <Footnotes footnotes={membershipFootnotes} />}
    </div>
  );
}

function Footnotes({ footnotes }: { footnotes: string[] }) {
  if (!footnotes.length) return null;
  return (
    <section className="space-y-2 border-t border-primary/15 pt-6 text-sm text-muted-foreground">
      {footnotes.map((note, index) => (
        <p key={note} className="flex gap-2">
          <span className="text-primary">{index + 1}.</span>
          <span>{note}</span>
        </p>
      ))}
    </section>
  );
}
