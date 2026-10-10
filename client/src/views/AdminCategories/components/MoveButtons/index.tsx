"use client";

// libs
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";
// types
import type { CategoryMoveDirection } from "@/types/AdminCategories";
// components
import CustomButton from "@/components/CustomButton";
// others
import CONSTANTS from "@/constants";

const { UP, DOWN } = CONSTANTS.CATEGORY_MOVE_DIRECTION;

/**
 * Disabled at either end. While any move is in flight (DR-15) the buttons are
 * only aria-disabled — a truly disabled button would drop keyboard focus.
 * `data-move-*` lets MoveFocusEffect put focus back after the row moves.
 */
const MoveButtons = ({
  id,
  name,
  isFirst,
  isLast,
  busy,
  onMove
}: {
  id: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (direction: CategoryMoveDirection) => void;
}) => {
  const t = useTranslations("adminCategories.actions");

  return (
    <div className="flex">
      <CustomButton
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isFirst}
        aria-disabled={busy || undefined}
        aria-label={t("moveUp", { name })}
        data-move-id={id}
        data-move-direction={UP}
        onClick={() => !busy && onMove(UP)}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </CustomButton>
      <CustomButton
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isLast}
        aria-disabled={busy || undefined}
        aria-label={t("moveDown", { name })}
        data-move-id={id}
        data-move-direction={DOWN}
        onClick={() => !busy && onMove(DOWN)}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </CustomButton>
    </div>
  );
};

export default MoveButtons;
