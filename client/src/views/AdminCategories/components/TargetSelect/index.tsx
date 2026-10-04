"use client";

// types
import type { AdminCategory } from "@/types/AdminCategories";
// components
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
// hooks
import { useLocalizedName } from "@/hooks";
// others
import { cn } from "@/libs/utils";

/** Radix Select forbids "" as an item value, so "no choice" travels as this sentinel. */
const NO_TARGET = "__none__";

/**
 * A target picker for the delete dialog. `firstOption` is what "no choice"
 * means in context: "Choose a category…" for the shared select, "<name>
 * (shared)" for a per-app row that follows the shared choice.
 */
const TargetSelect = ({
  id,
  label,
  value,
  targets,
  firstOption,
  muted = false,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  targets: AdminCategory[];
  firstOption: string;
  muted?: boolean;
  onChange: (categoryId: string) => void;
}) => {
  const localize = useLocalizedName();

  return (
    <Select
      value={value || NO_TARGET}
      onValueChange={(next) => onChange(next === NO_TARGET ? "" : next)}
    >
      <CustomSelectTrigger
        id={id}
        aria-label={label}
        className={cn("w-full", muted && "text-muted-foreground")}
      >
        <SelectValue />
      </CustomSelectTrigger>
      <SelectContent>
        <SelectItem value={NO_TARGET}>{firstOption}</SelectItem>
        {targets.map((category) => (
          <SelectItem key={category._id} value={category._id}>
            {localize(category.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TargetSelect;
