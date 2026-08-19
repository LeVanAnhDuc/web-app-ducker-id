"use client";

// libs
import { m, useReducedMotion } from "framer-motion";
// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const FadeScale = ({
  children,
  delay = 0,
  duration = 0.3,
  scale = 0.9,
  className
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  scale?: number;
  className?: string;
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, scale }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration, delay }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
};

export default FadeScale;
