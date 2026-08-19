"use client";

// libs
import { Pencil, Save } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import CustomTooltip from "@/components/CustomTooltip";

const EntitlementMatrixToolbar = ({
  isEditing,
  isDirty,
  isSaving,
  onEdit,
  onCancel
}: {
  isEditing: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) => {
  const t = useTranslations("adminEntitlements.matrix");

  if (!isEditing)
    return (
      <CustomButton
        type="button"
        iconLeft={<Pencil className="size-4" aria-hidden="true" />}
        onClick={onEdit}
      >
        {t("edit")}
      </CustomButton>
    );

  const saveButton = (
    <CustomButton
      type="submit"
      iconLeft={<Save className="size-4" aria-hidden="true" />}
      loading={isSaving}
      disabled={!isDirty || isSaving}
    >
      {t("save")}
    </CustomButton>
  );

  return (
    <div className="flex items-center gap-2">
      <CustomButton type="button" variant="outline" onClick={onCancel}>
        {t("cancel")}
      </CustomButton>
      {isDirty ? (
        saveButton
      ) : (
        <CustomTooltip content={t("saveDisabledTooltip")}>
          {saveButton}
        </CustomTooltip>
      )}
    </div>
  );
};

export default EntitlementMatrixToolbar;
