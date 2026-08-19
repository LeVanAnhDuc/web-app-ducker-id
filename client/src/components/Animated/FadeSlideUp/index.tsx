"use client";

// libs
import { m, useReducedMotion } from "framer-motion";
// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const FadeSlideUp = ({
  children,
  delay = 0,
  duration = 0.3,
  y = 20,
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
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -y }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration, delay }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
};

export default FadeSlideUp;
