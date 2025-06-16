"use client";
import { AuroraHero } from "@/components/aurora-hero";
import "../lib/i18n";

function ClientRoot({ children }: React.PropsWithChildren) {
  return (
    <div>
      {/*  <AuroraHero> */}
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" /> */}
      {/* </AuroraHero> */}
    </div>
  );
}

export default ClientRoot;
