"use client";

// libs
import { m, useReducedMotion } from "framer-motion";
// others
import { cn } from "@/libs/utils";

const PulseRipple = ({
  color = "bg-success",
  size = "inset-0",
  duration = 2,
  className
}: {
  color?: string;
  size?: string;
  duration?: number;
  className?: string;
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={cn("absolute rounded-full", size, color, className)} />
    );
  }

  return (
    <>
      <m.div
        className={cn("absolute rounded-full", size, color, className)}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <m.div
        className={cn("absolute rounded-full", size, color, className)}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0, 0.3]
        }}
        transition={{
          duration,
          delay: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </>
  );
};

export default PulseRipple;
