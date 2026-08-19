"use client";

// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// components
import CustomInput from "@/components/CustomInput";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { ICON_URL } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;

const IconUrlInput = ({
  label,
  placeholder,
  disabled = false
}: {
  label: string;
  placeholder: string;
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<AdminAppFormValues>(ICON_URL);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">{label}</FormLabel>
          <FormControl>
            <CustomInput
              {...field}
              type="url"
              placeholder={placeholder}
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

export default IconUrlInput;
