"use client";

// libs
import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
// types
import type { SortOrder } from "@/types/List";
// components
import CustomButton from "@/components/CustomButton";
// others
import { SORT_ORDER } from "@/constants/list";

const SortHeader = ({
  label,
  active,
  order,
  ariaLabel,
  onToggle
}: {
  label: ReactNode;
  active: boolean;
  order?: SortOrder;
  ariaLabel: string;
  onToggle: () => void;
}) => {
  const icon = !active ? (
    <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-60" />
  ) : order === SORT_ORDER.ASC ? (
    <ArrowUp aria-hidden="true" className="size-3.5" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3.5" />
  );

  return (
    <CustomButton
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-label={ariaLabel}
      iconRight={icon}
      className="text-muted-foreground data-[active=true]:text-foreground -ml-2 gap-1.5 font-medium"
      data-active={active}
    >
      {label}
    </CustomButton>
  );
};

export default SortHeader;
