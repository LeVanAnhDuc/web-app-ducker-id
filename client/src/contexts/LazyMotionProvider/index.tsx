"use client";

// libs
import { LazyMotion } from "framer-motion";
// types
import type { PropsWithChildren } from "react";

const loadFeatures = () =>
  import("framer-motion").then((mod) => mod.domAnimation);

const LazyMotionProvider = ({ children }: PropsWithChildren) => (
  <LazyMotion features={loadFeatures} strict>
    {children}
  </LazyMotion>
);

export default LazyMotionProvider;
