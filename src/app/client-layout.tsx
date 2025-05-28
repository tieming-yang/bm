"use client";
import { AuroraHero } from "@/components/aurora-hero";
import "../lib/i18n";

function ClientRoot({ children }: React.PropsWithChildren) {
  return (
    <AuroraHero>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" /> */}
    </AuroraHero>
  );
}

export default ClientRoot;
