"use client";

// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// components
import CustomInput from "@/components/CustomInput";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { DISPLAY_NAME } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;

const DisplayNameInput = ({
  label,
  placeholder,
  hint,
  disabled = false
}: {
  label: string;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<AdminAppFormValues>(DISPLAY_NAME);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label} <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <CustomInput
              {...field}
              placeholder={placeholder}
              aria-invalid={fieldState.invalid}
              disabled={disabled}
            />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <AppFormMessage />
        </FormItem>
      )}
    />
  );
};

export default DisplayNameInput;
