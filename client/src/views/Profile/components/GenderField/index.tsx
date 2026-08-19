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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
import FormFieldMessage from "@/components/FormFieldMessage";
// others
import { GENDER_VALUES } from "@/constants/gender";

const GenderField = ({
  control,
  isPending
}: {
  control: Control<UpdatePersonalInfoFormValues>;
  isPending: boolean;
}) => {
  const t = useTranslations("account.personalInfo");
  const tGender = useTranslations("account.personalInfo.genderOptions");

  return (
    <FormField
      control={control}
      name="gender"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("fields.gender")}</FormLabel>
          <Select
            value={field.value || undefined}
            onValueChange={field.onChange}
            disabled={isPending}
          >
            <FormControl>
              <CustomSelectTrigger>
                <SelectValue placeholder={t("placeholders.gender")} />
              </CustomSelectTrigger>
            </FormControl>
            <SelectContent>
              {GENDER_VALUES.map((g) => (
                <SelectItem key={g} value={g}>
                  {tGender(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default GenderField;
