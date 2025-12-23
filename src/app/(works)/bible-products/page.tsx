"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";
import ClientProductsPage from "./client-products-page";
export default function bibleProductsPage() {
  const { t } = useTranslation("bible-products");

  return (
    <div className="container px-4 py-16 mx-auto space-y-16">
      <ClientProductsPage />
    </div>
  );
}
