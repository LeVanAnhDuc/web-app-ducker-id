"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// components
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import StringListField from "../StringListField";
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { REDIRECT_URIS } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;

const RedirectUrisField = ({
  label,
  placeholder,
  hint,
  disabled = false
}: {
  label: string;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
}) => {
  const tActions = useTranslations("adminApps.actions");
  const { field } = useFieldProps<AdminAppFormValues>(REDIRECT_URIS);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label} <span className="text-destructive">*</span>
          </FormLabel>
          <StringListField
            value={field.value ?? []}
            onChange={field.onChange}
            placeholder={placeholder}
            addLabel={tActions("addUri")}
            removeLabel={tActions("removeUri")}
            disabled={disabled}
          />
          {hint && <FormDescription>{hint}</FormDescription>}
          <AppFormMessage />
        </FormItem>
      )}
    />
  );
};

export default RedirectUrisField;
