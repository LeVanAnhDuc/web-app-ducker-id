// libs
import * as React from "react";
// components
import { Input } from "@/components/ui/input";
// others
import { cn } from "@/libs/utils";

const CustomInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      "border-input bg-background focus:border-ring focus:ring-ring h-10 rounded-lg px-4 transition-colors duration-200",
      className
    )}
    {...props}
  />
));

CustomInput.displayName = "CustomInput";

export default CustomInput;
