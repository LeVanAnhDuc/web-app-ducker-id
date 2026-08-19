// types
import type { LucideIcon } from "lucide-react";
import type { ColorVariant } from "@/types/Color";
// dataSources
import { COLOR_VARIANT_CLASSES, DISABLED_CLASSES } from "@/dataSources/Common";
// others
import { cn } from "@/libs/utils";

const AuthOptionCardBody = ({
  icon: Icon,
  title,
  description,
  colorVariant,
  disabled = false,
  unavailableLabel
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  colorVariant: ColorVariant;
  disabled?: boolean;
  unavailableLabel?: string;
}) => (
  <>
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-200",
        disabled ? DISABLED_CLASSES : COLOR_VARIANT_CLASSES[colorVariant]
      )}
    >
      <Icon className="h-6 w-6" />
    </div>
    <div className="flex-1 text-left">
      <div
        className={cn(
          "font-medium",
          disabled ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {title}
      </div>
      <div className="text-muted-foreground text-sm">{description}</div>
    </div>
    {disabled && unavailableLabel && (
      <div className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
        {unavailableLabel}
      </div>
    )}
  </>
);

export default AuthOptionCardBody;
