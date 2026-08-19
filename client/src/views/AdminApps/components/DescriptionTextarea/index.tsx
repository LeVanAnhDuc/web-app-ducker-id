"use client";

// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// components
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { DESCRIPTION } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;

const DescriptionTextarea = ({
  label,
  placeholder,
  disabled = false
}: {
  label: string;
  placeholder: string;
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<AdminAppFormValues>(DESCRIPTION);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              placeholder={placeholder}
              rows={3}
              aria-invalid={fieldState.invalid}
              disabled={disabled}
            />
          </FormControl>
          <AppFormMessage />
        </FormItem>
      )}
    />
  );
};

export default DescriptionTextarea;
