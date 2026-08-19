// types
import type { ColorVariant } from "@/types/Color";

export const COLOR_VARIANT_CLASSES: Record<ColorVariant, string> = {
  primary: "bg-primary/10 group-hover:bg-primary/20 text-primary",
  info: "bg-info/10 group-hover:bg-info/20 text-info",
  success: "bg-success/10 group-hover:bg-success/20 text-success",
  cream: "bg-cream group-hover:bg-cream/80 text-cream-foreground"
};

export const DISABLED_CLASSES = "bg-muted text-muted-foreground";
