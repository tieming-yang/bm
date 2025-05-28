"use client";

import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";
import useTranslation from "../../hooks/useTranslation";

export default function Contact() {
  const { t } = useTranslation("contact");

  return (
    <div className="container px-4 py-12 mx-auto relative z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-gradient-to-r from-primary to-secondary bg-clip-text">
          {t("contact.title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
          {t("contact.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{t("contact.email.title")}</h3>
              <p className="text-muted-foreground">{t("contact.email.value")}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{t("contact.phone.title")}</h3>
              <p className="text-muted-foreground">{t("contact.phone.value")}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{t("contact.address.title")}</h3>
              <p className="text-muted-foreground">{t("contact.address.line1")}</p>
              <p className="text-muted-foreground">{t("contact.address.line2")}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="border backdrop-blur-lg bg-background/80 border-primary/10">
            <CardHeader>
              <CardTitle>{t("contact.form.title")}</CardTitle>
              <CardDescription>{t("contact.form.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("contact.form.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("contact.form.name_placeholder")}
                  className="rounded-3xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("contact.form.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("contact.form.email_placeholder")}
                  className="rounded-3xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t("contact.form.subject")}</Label>
                <Input
                  id="subject"
                  placeholder={t("contact.form.subject_placeholder")}
                  className="rounded-3xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t("contact.form.message")}</Label>
                <Textarea
                  id="message"
                  placeholder={t("contact.form.message_placeholder")}
                  className="min-h-[150px] rounded-3xl"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-3xl">{t("contact.form.send")}</Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
