"use client";

import { usePathname } from "next/navigation";
import "../lib/i18n";
import { motion } from "framer-motion";

function ClientRoot({ children }: React.PropsWithChildren) {
  const pathname = usePathname();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <motion.div
        key={pathname}
        className="fixed inset-0 z-50 pointer-events-none"
        initial={{ opacity: 1, backdropFilter: "blur(20px)" }}
        animate={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {children}
    </motion.div>
  );
}

export default ClientRoot;
