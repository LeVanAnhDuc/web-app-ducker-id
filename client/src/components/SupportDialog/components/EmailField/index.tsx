"use client";

// libs
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { SupportFormValues } from "@/types/Support";
// components
import FormFieldMessage from "@/components/FormFieldMessage";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import CustomInput from "@/components/CustomInput";
// others
import CONSTANTS from "@/constants";

const { EMAIL } = CONSTANTS.FIELD_NAMES.SUPPORT_FIELD_NAMES;

const EmailField = ({
  readOnly,
  prefilled,
  disabled
}: {
  readOnly: boolean;
  prefilled: boolean;
  disabled?: boolean;
}) => {
  const t = useTranslations("support.form.input");
  const { control } = useFormContext<SupportFormValues>();

  const hintKey = readOnly
    ? "labelEmailReadOnlyHint"
    : prefilled
      ? "labelEmailAutoFillHint"
      : "labelEmailHint";

  return (
    <FormField
      control={control}
      name={EMAIL}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("labelEmail")}</FormLabel>
          <FormControl>
            <CustomInput
              {...field}
              type="email"
              autoComplete="email"
              placeholder="email@example.com"
              readOnly={readOnly}
              disabled={disabled}
              aria-readonly={readOnly}
            />
          </FormControl>
          <FormDescription>{t(hintKey)}</FormDescription>
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default EmailField;
