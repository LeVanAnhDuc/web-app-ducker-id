"use client";

// libs
import { Check, Minus, X } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { EntitlementMatrixFormValues } from "@/types/AdminEntitlements";
// components
import { Checkbox } from "@/components/ui/checkbox";
import CustomTooltip from "@/components/CustomTooltip";

const EntitlementCell = ({
  isEditing,
  granted,
  eligible,
  fieldName,
  appName,
  userName
}: {
  isEditing: boolean;
  granted: boolean;
  eligible: boolean;
  fieldName: string;
  appName: string;
  userName: string;
}) => {
  const t = useTranslations("adminEntitlements");
  const { control } = useFormContext<EntitlementMatrixFormValues>();
  const { field } = useController({
    name: fieldName as FieldPath<EntitlementMatrixFormValues>,
    control
  });

  if (!isEditing) {
    if (!eligible)
      return (
        <CustomTooltip content={t("matrix.insufficientRoleTooltip")}>
          <span role="img" aria-label={t("cell.insufficientRole")}>
            <Minus
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
          </span>
        </CustomTooltip>
      );
    if (granted)
      return (
        <span role="img" aria-label={t("cell.granted")}>
          <Check className="text-success size-4" aria-hidden="true" />
        </span>
      );
    return (
      <span role="img" aria-label={t("cell.notGranted")}>
        <X className="text-muted-foreground size-4" aria-hidden="true" />
      </span>
    );
  }

  const checkbox = (
    <Checkbox
      checked={Boolean(field.value)}
      onCheckedChange={field.onChange}
      disabled={!eligible}
      aria-label={t("cell.grantAria", { app: appName, user: userName })}
    />
  );

  if (!eligible)
    return (
      <CustomTooltip content={t("matrix.insufficientRoleTooltip")}>
        {checkbox}
      </CustomTooltip>
    );

  return checkbox;
};

export default EntitlementCell;
