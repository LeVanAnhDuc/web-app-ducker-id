"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { Control } from "react-hook-form";
import type { UpdatePersonalInfoFormValues } from "@/types/UpdatePersonalInfo";
// components
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import CustomInput from "@/components/CustomInput";
import FormFieldMessage from "@/components/FormFieldMessage";

const PhoneField = ({
  control,
  isPending
}: {
  control: Control<UpdatePersonalInfoFormValues>;
  isPending: boolean;
}) => {
  const t = useTranslations("account.personalInfo");

  return (
    <FormField
      control={control}
      name="phone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("fields.phone")}</FormLabel>
          <FormControl>
            <CustomInput
              {...field}
              value={field.value ?? ""}
              placeholder={t("placeholders.phone")}
              disabled={isPending}
            />
          </FormControl>
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default PhoneField;
