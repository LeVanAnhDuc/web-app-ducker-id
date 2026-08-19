"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { SupportFormValues } from "@/types/Support";
// components
import FormFieldMessage from "@/components/FormFieldMessage";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import CustomInput from "@/components/CustomInput";
// hooks
import useFieldProps from "@/hooks/useFieldProps";
// others
import CONSTANTS from "@/constants";

const { SUBJECT } = CONSTANTS.FIELD_NAMES.SUPPORT_FIELD_NAMES;

const SubjectField = ({ disabled }: { disabled?: boolean }) => {
  const t = useTranslations("support.form.input");
  const { field } = useFieldProps<SupportFormValues>(SUBJECT);

  return (
    <FormItem>
      <FormLabel>
        {t("labelSubject")} <span className="text-destructive">*</span>
      </FormLabel>
      <FormControl>
        <CustomInput
          {...field}
          type="text"
          placeholder={t("placeholderSubject")}
          disabled={disabled}
        />
      </FormControl>
      <FormFieldMessage />
    </FormItem>
  );
};

export default SubjectField;
