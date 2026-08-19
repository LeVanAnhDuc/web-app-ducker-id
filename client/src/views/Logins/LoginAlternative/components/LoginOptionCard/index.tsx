// types
import type { LucideIcon } from "lucide-react";
import type { ColorVariant } from "@/types/Color";
// dataSources
import { COLOR_VARIANT_CLASSES } from "@/dataSources/Common";
// others
import { cn } from "@/libs/utils";

const LoginOptionCard = ({
  icon: Icon,
  title,
  description,
  colorVariant
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  colorVariant: ColorVariant;
}) => (
  <>
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg",
        "transition-colors duration-200",
        COLOR_VARIANT_CLASSES[colorVariant]
      )}
    >
      <Icon className="h-6 w-6" />
    </div>
    <div className="flex-1 text-left">
      <div className="text-foreground font-medium">{title}</div>
      <div className="text-muted-foreground text-sm">{description}</div>
    </div>
  </>
);

export default LoginOptionCard;
