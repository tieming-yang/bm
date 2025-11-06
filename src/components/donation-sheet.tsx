"use client";

import Image from "next/image";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import useTranslation from "../hooks/use-translation";

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
        <div className="flex flex-col items-center justify-center mt-8 gap-8">
          <div className="relative w-48 h-48 p-4 bg-white rounded-xl">
            <Image
              src="/placeholders/qr-code-placeholder.png"
              alt="QR Code for donation"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>
          <div className="max-w-md text-center">
            <h3 className="mb-2 text-lg font-medium">{t("donate.scanTitle")}</h3>
            <p className="text-muted-foreground">{t("donate.scanDescription")}</p>
          </div>
          <Button className="px-8 mt-4 rounded-3xl" onClick={() => onOpenChange(false)}>
            {t("donate.later")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
