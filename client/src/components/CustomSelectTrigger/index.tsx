// libs
import * as React from "react";
// components
import { SelectTrigger } from "@/components/ui/select";
// others
import { cn } from "@/libs/utils";

const CustomSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentProps<typeof SelectTrigger>
>(({ className, children, ...props }, ref) => (
  <SelectTrigger ref={ref} className={cn("!h-10 w-full", className)} {...props}>
    {children}
  </SelectTrigger>
));

CustomSelectTrigger.displayName = "CustomSelectTrigger";

export default CustomSelectTrigger;
