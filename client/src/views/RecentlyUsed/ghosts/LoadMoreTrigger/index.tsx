"use client";

// libs
import { useEffect } from "react";
// types
import type { RefObject } from "react";

/**
 * Infinite scroll without a second control: it watches the visible
 * "Load more" button and fetches when it scrolls into view. Keyboard and
 * screen-reader users press the same button.
 */
const LoadMoreTrigger = ({
  targetRef,
  enabled,
  onReach
}: {
  targetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onReach: () => void;
}) => {
  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onReach();
      },
      { rootMargin: "200px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef, enabled, onReach]);

  return null;
};

export default LoadMoreTrigger;
