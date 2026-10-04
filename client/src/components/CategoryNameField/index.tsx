"use client";

// types
import type { AdminCategoryFormValues } from "@/types/AdminCategories";
// components
import CustomFormLabel from "@/components/CustomFormLabel";
import CustomInput from "@/components/CustomInput";
import FormFieldMessage from "@/components/FormFieldMessage";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { NAME_MAX_LENGTH } = CONSTANTS.CATEGORY_LIMITS;

/** One language of a category name; shared by the category sheet and the quick-create dialog. */
const CategoryNameField = ({
  name,
  label,
  placeholder,
  disabled = false
}: {
  name: keyof AdminCategoryFormValues;
  label: string;
  placeholder: string;
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<AdminCategoryFormValues>(name);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <CustomFormLabel required>{label}</CustomFormLabel>
          <FormControl>
            <CustomInput
              {...field}
              placeholder={placeholder}
              aria-invalid={fieldState.invalid}
              disabled={disabled}
              maxLength={NAME_MAX_LENGTH * 2}
              autoComplete="off"
            />
          </FormControl>
          <FormFieldMessage namespace="adminCategories.form.validation" />
        </FormItem>
      )}
    />
  );
};

export default CategoryNameField;
