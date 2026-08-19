"use client";

// libs
import { useMemo } from "react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
// types
import type { SignupInfoFormValues } from "@/types/Signup";
// components
import { FormField, FormItem } from "@/components/ui/form";
import CustomDateInput from "@/components/CustomDateInput";
import FormFieldMessage from "@/components/FormFieldMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";
import { getDateOfBirthBounds, parseLocalDate } from "@/utils";

const { BIRTHDAY } = CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

const BirthdayInput = ({
  label,
  placeholder,
  disabled = false,
  required = false
}: {
  label: string;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) => {
  const locale = useLocale();
  const { field } = useFieldProps<SignupInfoFormValues>(BIRTHDAY);
  const dateLocale = locale === "vi" ? vi : enUS;
  const { minDate, maxDate } = useMemo(() => getDateOfBirthBounds(), []);

  return (
    <FormField
      {...field}
      render={({ field: rhfField, fieldState }) => (
        <FormItem>
          <CustomDateInput
            value={rhfField.value ? parseLocalDate(rhfField.value) : undefined}
            onChange={(date) =>
              rhfField.onChange(date ? format(date, "yyyy-MM-dd") : "")
            }
            dateLocale={dateLocale}
            minDate={minDate}
            maxDate={maxDate}
            label={label}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            error={fieldState.invalid}
          />
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default BirthdayInput;
