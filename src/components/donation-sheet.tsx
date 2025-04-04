"use client";

import Image from "next/image";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import useTranslation from "../hooks/useTranslation";

interface DonationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DonationSheet({ open, onOpenChange }: DonationSheetProps) {
  const { t } = useTranslation("donate");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="text-center">
          <SheetTitle className="text-2xl">{t("donate.title")}</SheetTitle>
          <SheetDescription>{t("donate.subtitle")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center gap-8 mt-8">
          <div className="relative w-48 h-48 bg-white p-4 rounded-xl">
            <Image
              src="/placeholders/qr-code-placeholder.png"
              alt="QR Code for donation"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-lg font-medium mb-2">{t("donate.scanTitle")}</h3>
            <p className="text-muted-foreground">{t("donate.scanDescription")}</p>
          </div>
          <Button className="mt-4 rounded-3xl px-8" onClick={() => onOpenChange(false)}>
            {t("donate.later")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
