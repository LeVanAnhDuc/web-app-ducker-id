"use client";

// libs
import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Unstarring removes the card — and the focused heart with it — so focus is
 * parked on the grid at click time and handed to the neighbouring card's heart
 * here, once the toggle settles and the hearts are enabled again.
 */
const FocusNextFavorite = ({
  gridRef,
  appId,
  pending,
  onDone
}: {
  gridRef: RefObject<HTMLDivElement | null>;
  appId: string | null;
  pending: boolean;
  onDone: () => void;
}) => {
  useEffect(() => {
    if (!appId || pending) return;
    const heart = gridRef.current?.querySelector<HTMLButtonElement>(
      `[aria-labelledby="apps-${appId}-title"] button[aria-pressed]`
    );
    heart?.focus();
    onDone();
  }, [gridRef, appId, pending, onDone]);

  return null;
};

export default FocusNextFavorite;
