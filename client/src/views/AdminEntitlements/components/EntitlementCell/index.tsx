"use client";

// libs
import { useController, useFormContext } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { EntitlementMatrixFormValues } from "@/types/AdminEntitlements";
// components
import { Checkbox } from "@/components/ui/checkbox";
import EntitlementStatusIcon from "../EntitlementStatusIcon";
import OverrideMarker from "../OverrideMarker";

const EntitlementCell = ({
  isEditing,
  granted,
  roleDefault,
  fieldName,
  appName,
  userName
}: {
  isEditing: boolean;
  granted: boolean;
  roleDefault: boolean;
  fieldName: string;
  appName: string;
  userName: string;
}) => {
  const t = useTranslations("adminEntitlements.cell");
  const { control } = useFormContext<EntitlementMatrixFormValues>();
  const { field } = useController({
    name: fieldName as FieldPath<EntitlementMatrixFormValues>,
    control
  });
  const value = isEditing ? Boolean(field.value) : granted;

  return (
    <span className="inline-flex items-center gap-1.5">
      {isEditing ? (
        <Checkbox
          checked={value}
          onCheckedChange={field.onChange}
          aria-label={t("grantAria", { app: appName, user: userName })}
        />
      ) : (
        <EntitlementStatusIcon granted={granted} />
      )}
      {value !== roleDefault && <OverrideMarker granted={value} />}
    </span>
  );
};

export default EntitlementCell;
