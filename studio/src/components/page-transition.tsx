"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initialState"
        animate="animateState"
        exit="exitState"
        transition={{
          duration: shouldReduceMotion ? 0 : 0.3,
        }}
        style={{ opacity: 1 }}
        variants={{
          initialState: {
            opacity: shouldReduceMotion ? 1 : 0,
          },
          animateState: {
            opacity: 1,
          },
          exitState: {
            opacity: shouldReduceMotion ? 1 : 0,
          },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
