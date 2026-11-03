"use client";

import { usePathname } from "next/navigation";
import "../lib/i18n";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import ShoppingCartProvider from "@/providers/shopping-cart-provider";
import { useQuery } from "@tanstack/react-query";
import BibleArtworks from "@/models/bible-artworks";
import useTranslation from "@/hooks/use-translation";
import { QueryKey } from "@/utils/query-keys";
import Song from "@/models/song";

function ClientRoot({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  useTranslation();
  const reducedMotion = useReducedMotion();

  useQuery({
    queryKey: [QueryKey.artworks],
    queryFn: () => BibleArtworks.getAll(),
    staleTime: Infinity,
  });

  useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  return (
    <MotionConfig reducedMotion="user">
    <motion.div initial={{ opacity: reducedMotion || pathname === "/greet" ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion || pathname === "/greet" ? 0 : 1 }}>
      {!reducedMotion && pathname !== "/greet" && <motion.div
        aria-hidden="true"
        key={pathname}
        className="fixed inset-0 z-(--layer-transition) pointer-events-none bg-primary-gradient-50"
        initial={{ opacity: 1, backdropFilter: "blur(20px)" }}
        animate={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />}
      <ShoppingCartProvider>{children}</ShoppingCartProvider>
    </motion.div>
    </MotionConfig>
  );
}

export default ClientRoot;
