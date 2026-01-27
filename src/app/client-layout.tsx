"use client";

import { usePathname } from "next/navigation";
import "../lib/i18n";
import { motion } from "framer-motion";
import ShoppingCartProvider from "@/providers/shopping-cart-provider";
import { useQuery } from "@tanstack/react-query";
import BibleArtworks from "@/models/bible-artworks";
import useTranslation from "@/hooks/use-translation";
import { QueryKey } from "@/utils/query-keys";
import Song from "@/models/song";

function ClientRoot({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  const { currentLanguage } = useTranslation();

  useQuery({
    queryKey: [QueryKey.artworks, currentLanguage],
    queryFn: () => BibleArtworks.getAll(),
    staleTime: Infinity,
  });

  useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
      <motion.div
        key={pathname}
        className="fixed inset-0 z-50 pointer-events-none"
        initial={{ opacity: 1, backdropFilter: "blur(20px)" }}
        animate={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <ShoppingCartProvider>{children}</ShoppingCartProvider>
    </motion.div>
  );
}

export default ClientRoot;
