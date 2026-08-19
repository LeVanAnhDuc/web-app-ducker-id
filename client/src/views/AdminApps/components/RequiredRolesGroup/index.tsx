"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminAppFormValues } from "@/types/AdminApps";
import type { AuthenticationRole } from "@/types/User";
// components
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// dataSources
import { APP_ROLE_OPTIONS } from "@/dataSources/AdminApps";
// others
import CONSTANTS from "@/constants";

const { REQUIRED_ROLES } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;

const RequiredRolesGroup = ({
  label,
  hint,
  disabled = false
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
}) => {
  const t = useTranslations("adminApps.roles");
  const { field } = useFieldProps<AdminAppFormValues>(REQUIRED_ROLES);

  return (
    <FormField
      {...field}
      render={({ field }) => {
        const value: AuthenticationRole[] = field.value ?? [];
        const handleToggle = (role: AuthenticationRole) => {
          const next = value.includes(role)
            ? value.filter((r) => r !== role)
            : [...value, role];
          field.onChange(next);
        };
        return (
          <FormItem>
            <FormLabel className="text-foreground">
              {label} <span className="text-destructive">*</span>
            </FormLabel>
            <div className="flex flex-wrap gap-4">
              {APP_ROLE_OPTIONS.map((role) => {
                const id = `role-${role}`;
                return (
                  <div key={role} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={value.includes(role)}
                      onCheckedChange={() => handleToggle(role)}
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={id}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {t(role)}
                    </Label>
                  </div>
                );
              })}
            </div>
            {hint && <FormDescription>{hint}</FormDescription>}
            <AppFormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default RequiredRolesGroup;
