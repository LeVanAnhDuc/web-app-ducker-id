"use client";

// libs
import type { ReactNode } from "react";
// components
import CustomButton from "@/components/CustomButton";
// others
import { cn } from "@/libs/utils";

const CategoryChip = ({
  label,
  isActive = false,
  onClick,
  className
}: {
  label: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}) => (
  <CustomButton
    type="button"
    size="sm"
    variant={isActive ? "default" : "outline"}
    onClick={onClick}
    aria-pressed={isActive}
    className={cn(
      "rounded-full px-4 text-sm font-medium",
      !isActive &&
        "border-border bg-muted text-muted-foreground hover:bg-muted/70",
      className
    )}
  >
    {label}
  </CustomButton>
);

export default CategoryChip;
