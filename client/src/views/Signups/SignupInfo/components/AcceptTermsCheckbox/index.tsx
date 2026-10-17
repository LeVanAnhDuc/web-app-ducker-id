"use client";

// libs
import { useFormContext } from "react-hook-form";
// types
import type { SignupInfoFormValues } from "@/types/Signup";
// components
import FormFieldMessage from "@/components/FormFieldMessage";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
// others
import CONSTANTS from "@/constants";

const { ACCEPT_TERMS } = CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

const AcceptTermsCheckbox = ({
  label,
  disabled = false
}: {
  label: string;
  disabled?: boolean;
}) => {
  const { control } = useFormContext<SignupInfoFormValues>();

  return (
    <FormField
      control={control}
      name={ACCEPT_TERMS}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-start gap-2">
            <FormControl>
              <Checkbox
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                ref={field.ref}
                disabled={disabled}
                aria-required="true"
                className="mt-0.5"
              />
            </FormControl>
            <FormLabel className="text-foreground cursor-pointer text-sm leading-snug font-normal">
              {label} <span className="text-destructive">*</span>
            </FormLabel>
          </div>
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default AcceptTermsCheckbox;
