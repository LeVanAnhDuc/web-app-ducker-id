// libs
import type { ComponentProps } from "react";
// types
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
// components
import { Badge } from "@/components/ui/badge";
// others
import { cn } from "@/libs/utils";

type ShadcnVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
type ExtendedVariant = "success" | "warning" | "info";

const EXTENDED_VARIANT_CLASSES: Record<ExtendedVariant, string> = {
  success:
    "border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90",
  warning:
    "border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90",
  info: "border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90"
};

const isExtendedVariant = (value: unknown): value is ExtendedVariant =>
  value === "success" || value === "warning" || value === "info";

const CustomBadge = ({
  variant,
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "variant"> & {
  variant?: ShadcnVariant | ExtendedVariant;
}) => {
  if (isExtendedVariant(variant)) {
    return (
      <Badge
        className={cn(EXTENDED_VARIANT_CLASSES[variant], className)}
        {...props}
      />
    );
  }
  return <Badge variant={variant} className={className} {...props} />;
};

export default CustomBadge;
