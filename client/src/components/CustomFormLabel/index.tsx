// libs
import type { ComponentProps } from "react";
// components
import { FormLabel } from "@/components/ui/form";

const CustomFormLabel = ({
  required = false,
  children,
  ...props
}: ComponentProps<typeof FormLabel> & {
  required?: boolean;
}) => (
  <FormLabel {...props}>
    {children}
    {required && (
      <span aria-hidden="true" className="text-destructive ml-0.5">
        *
      </span>
    )}
  </FormLabel>
);

export default CustomFormLabel;
