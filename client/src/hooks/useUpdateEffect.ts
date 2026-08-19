"use client";

// libs
import { useEffect } from "react";
// types
import type { DependencyList, EffectCallback } from "react";
// hooks
import useFirstMountState from "./useFirstMountState";

const useUpdateEffect = (callback: EffectCallback, deps?: DependencyList) => {
  const isFirstMount = useFirstMountState();

  useEffect(() => {
    if (isFirstMount) return;
    return callback();
  }, deps);
};

export default useUpdateEffect;
