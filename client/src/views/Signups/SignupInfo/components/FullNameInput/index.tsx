"use client";

// types
import type { SignupInfoFormValues } from "@/types/Signup";
// components
import CustomInput from "@/components/CustomInput";
import FormFieldMessage from "@/components/FormFieldMessage";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { FULL_NAME } = CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

const FullNameInput = ({
  label,
  placeholder,
  disabled = false
}: {
  label: string;
  placeholder: string;
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<SignupInfoFormValues>(FULL_NAME);

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
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default FullNameInput;
