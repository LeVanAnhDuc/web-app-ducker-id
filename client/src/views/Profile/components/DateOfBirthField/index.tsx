"use client";

// libs
import { useMemo } from "react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
// types
import type { Control } from "react-hook-form";
import type { UpdatePersonalInfoFormValues } from "@/types/UpdatePersonalInfo";
// components
import { FormField, FormItem } from "@/components/ui/form";
import CustomDateInput from "@/components/CustomDateInput";
import FormFieldMessage from "@/components/FormFieldMessage";
// others
import { getDateOfBirthBounds, parseLocalDate } from "@/utils";

const DateOfBirthField = ({
  control,
  isPending
}: {
  control: Control<UpdatePersonalInfoFormValues>;
  isPending: boolean;
}) => {
  const locale = useLocale();
  const t = useTranslations("account.personalInfo");
  const dateLocale = locale === "vi" ? vi : enUS;
  const { minDate, maxDate } = useMemo(() => getDateOfBirthBounds(), []);

  return (
    <FormField
      control={control}
      name="dateOfBirth"
      render={({ field, fieldState }) => (
        <FormItem>
          <CustomDateInput
            value={field.value ? parseLocalDate(field.value) : undefined}
            onChange={(date) =>
              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
            }
            dateLocale={dateLocale}
            minDate={minDate}
            maxDate={maxDate}
            label={t("fields.dateOfBirth")}
            placeholder={t("placeholders.dateOfBirth")}
            disabled={isPending}
            error={fieldState.invalid}
          />
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default DateOfBirthField;
