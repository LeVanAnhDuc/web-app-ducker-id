"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminAppFormValues, WebAppCategory } from "@/types/AdminApps";
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
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";
import { resolveCategoryLabel } from "@/utils";

const { CATEGORY_ID } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;

const CategorySelect = ({
  label,
  placeholder,
  categories,
  disabled = false
}: {
  label: string;
  placeholder: string;
  categories: WebAppCategory[];
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<AdminAppFormValues>(CATEGORY_ID);
  const t = useTranslations("common.categories");

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label} <span className="text-destructive">*</span>
          </FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              if (value) field.onChange(value);
            }}
            disabled={disabled}
          >
            <FormControl>
              <CustomSelectTrigger aria-invalid={fieldState.invalid}>
                <SelectValue placeholder={placeholder}>
                  {(() => {
                    const selected = categories.find(
                      (cat) => cat._id === field.value
                    );
                    return selected
                      ? resolveCategoryLabel(t, selected.slug, selected.name)
                      : null;
                  })()}
                </SelectValue>
              </CustomSelectTrigger>
            </FormControl>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {resolveCategoryLabel(t, cat.slug, cat.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AppFormMessage />
        </FormItem>
      )}
    />
  );
};

export default CategorySelect;
