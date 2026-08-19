"use client";

// libs
import { m, useReducedMotion } from "framer-motion";
// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const FadeIn = ({
  children,
  delay = 0,
  duration = 0.3,
  y = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      initial={shouldReduceMotion ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration, delay }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
};

export default FadeIn;
