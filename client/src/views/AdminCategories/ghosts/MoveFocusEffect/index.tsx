"use client";

// libs
import { useEffect } from "react";
// types
import type { CategoryMoveDirection } from "@/types/AdminCategories";

/**
 * After a move re-renders the table, focus the same arrow on the moved row —
 * or the opposite arrow if that row just reached the end and the pressed one
 * is now disabled — so a keyboard user can keep pressing.
 */
const MoveFocusEffect = ({
  lastMove,
  version
}: {
  lastMove: { id: string; direction: CategoryMoveDirection } | null;
  version: unknown;
}) => {
  useEffect(() => {
    if (!lastMove) return;
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        `[data-move-id="${lastMove.id}"]`
      )
    );
    const same = buttons.find(
      (b) => b.dataset.moveDirection === lastMove.direction && !b.disabled
    );
    const fallback = buttons.find((b) => !b.disabled);
    (same ?? fallback)?.focus();
  }, [lastMove, version]);
  return null;
};

export default MoveFocusEffect;
